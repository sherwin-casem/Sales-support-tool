import { SearchJobStatus, SearchResultStage } from "@prisma/client";
import { getCrawlerConfig } from "@/lib/config/crawler.config.js";
import { getPipelineConfig } from "@/lib/config/pipeline.config.js";
import { isUnlimitedCompanyLimit } from "@/lib/search/company-limit.js";
import { computeExtractionCompleteness } from "@/lib/validations/company-extraction.schema.js";
import { logger } from "@/lib/logging/logger.js";
import { runWithConcurrency } from "@/lib/utils/concurrency.js";
import { withRetry } from "@/lib/utils/retry.js";
import { err, ok, type Result } from "@/lib/utils/result.js";
import type { CompanyRepository } from "@/repositories/interfaces/company.repository.interface.js";
import type { SearchRepository } from "@/repositories/interfaces/search.repository.interface.js";
import type {
  CompanyDiscoveryInput,
  DiscoveredCompany,
} from "@/types/agents/company-discovery.types.js";
import type { ExtractedCompany } from "@/types/agents/company-extraction.types.js";
import type { ParsedQuery } from "@/types/agents/query-parser.types.js";
import type { LlmReadyContent } from "@/types/content/text-cleaning.types.js";
import { CONTACT_CRAWL_PATHS } from "@/types/crawler/crawler.types.js";
import type { CrawlCompanyResult } from "@/types/crawler/crawler.types.js";
import { createDiscoveryStubProfile } from "@/services/domain/enrichment/discovery-stub-profile.service.js";
import { hasOutreachContactGaps } from "@/services/domain/enrichment/outreach-gaps.service.js";
import { mergeExtractedProfiles } from "@/services/domain/enrichment/profile-merge.service.js";
import type { SearchResultRecord } from "@/types/repositories/search.repository.types.js";
import type { CompanyDiscoveryPort } from "@/services/infrastructure/discovery/company-discovery.service.js";
import type { CompanyExtractionPort } from "@/services/infrastructure/ai/company-extraction.service.js";
import type { LeadEnrichmentPort } from "@/services/infrastructure/ai/lead-enrichment.service.js";
import { hashEnrichmentProfile } from "@/services/infrastructure/ai/lead-enrichment.service.js";
import type { QueryParserPort } from "@/services/infrastructure/ai/query-parser.service.js";
import type { WebsiteCrawlerPort } from "@/services/infrastructure/crawler/website-crawler.service.js";
import {
  aggregateLlmReadyPages,
  type TextCleaningPort,
} from "@/services/infrastructure/content/text-cleaning.service.js";
import { promptSanitizerService } from "@/services/domain/content/prompt-sanitizer.service.js";
import {
  SearchOrchestratorError,
  type RunSearchInput,
  type SearchOrchestrationResult,
  type SearchOrchestrationSummary,
  type SearchStageFailure,
} from "@/types/orchestration/search-orchestrator.types.js";

export interface SearchOrchestratorDependencies {
  queryParser: QueryParserPort;
  companyDiscovery: CompanyDiscoveryPort;
  websiteCrawler: WebsiteCrawlerPort;
  textCleaning: TextCleaningPort;
  companyExtraction: CompanyExtractionPort;
  leadEnrichment: LeadEnrichmentPort;
  searchRepository: SearchRepository;
  companyRepository: CompanyRepository;
}

export interface SearchOrchestratorOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  crawlConcurrency?: number;
  extractionConcurrency?: number;
  enrichmentConcurrency?: number;
}

interface StageOutcome {
  crawled: number;
  extracted: number;
  enriched: number;
  failed: number;
  failures: SearchStageFailure[];
}

const DEFAULT_MAX_ATTEMPTS = 2;
const DEFAULT_INITIAL_DELAY_MS = 500;

export class SearchOrchestrator {
  private readonly maxAttempts: number;
  private readonly initialDelayMs: number;
  private readonly crawlConcurrency: number;
  private readonly extractionConcurrency: number;
  private readonly enrichmentConcurrency: number;

  constructor(
    private readonly deps: SearchOrchestratorDependencies,
    options: SearchOrchestratorOptions = {},
  ) {
    const pipelineConfig = getPipelineConfig();

    this.maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    this.initialDelayMs = options.initialDelayMs ?? DEFAULT_INITIAL_DELAY_MS;
    this.crawlConcurrency =
      options.crawlConcurrency ?? getCrawlerConfig().CRAWLER_SEARCH_CONCURRENCY;
    this.extractionConcurrency =
      options.extractionConcurrency ?? pipelineConfig.SEARCH_EXTRACTION_CONCURRENCY;
    this.enrichmentConcurrency =
      options.enrichmentConcurrency ?? pipelineConfig.SEARCH_ENRICHMENT_CONCURRENCY;
  }

  async run(
    input: RunSearchInput,
  ): Promise<Result<SearchOrchestrationResult, SearchOrchestratorError>> {
    const startedAt = Date.now();
    const failures: SearchStageFailure[] = [];
    const summary = createEmptySummary();

    if (!input.userId.trim() || !input.query.trim()) {
      return err(
        new SearchOrchestratorError("INVALID_INPUT", "userId and query are required"),
      );
    }

    logger.info("SearchOrchestrator.run started", {
      userId: input.userId,
      queryLength: input.query.length,
      companyLimit: isUnlimitedCompanyLimit(input.companyLimit) ? "none" : input.companyLimit,
    });

    let searchJobId = "";

    try {
      const job = input.searchJobId
        ? await this.deps.searchRepository.findJobById(input.searchJobId)
        : await this.deps.searchRepository.createJob({
            userId: input.userId,
            query: input.query,
            companyLimit: input.companyLimit,
          });

      if (!job) {
        return err(
          new SearchOrchestratorError(
            "INVALID_INPUT",
            `Search job not found: ${input.searchJobId}`,
          ),
        );
      }

      if (job.userId !== input.userId) {
        return err(
          new SearchOrchestratorError(
            "INVALID_INPUT",
            "Search job does not belong to the requesting user",
          ),
        );
      }

      searchJobId = job.id;

      await this.deps.searchRepository.updateJobStatus(searchJobId, SearchJobStatus.DISCOVERING, {
        startedAt: new Date(),
      });

      const criteriaResult = await this.parseQueryWithRetry(input.query);

      if (!criteriaResult.ok) {
        await this.failJob(searchJobId, criteriaResult.error.message);
        return err(criteriaResult.error);
      }

      const criteria = criteriaResult.value;

      await this.deps.searchRepository.updateJobCriteria(searchJobId, criteria);

      const discoveriesResult = await this.discoverCompaniesWithRetry(
        input.query,
        criteria,
        input.companyLimit ?? job.companyLimit,
      );

      if (!discoveriesResult.ok) {
        await this.failJob(searchJobId, discoveriesResult.error.message);
        return err(discoveriesResult.error);
      }

      if (discoveriesResult.value.length === 0) {
        const message = buildNoCompaniesDiscoveredMessage(input.query, criteria);
        await this.failJob(searchJobId, message);
        return err(new SearchOrchestratorError("NO_COMPANIES_DISCOVERED", message));
      }

      const discoveryPersist = await this.deps.searchRepository.addDiscoveredCompanies(
        searchJobId,
        discoveriesResult.value.map((company, index) => ({
          companyName: company.companyName,
          website: company.website,
          rank: index + 1,
          discoverySource: "discovery_agent",
        })),
      );

      summary.discovered = discoveryPersist.searchResults.length;
      summary.skippedDuplicates = discoveryPersist.skippedDuplicates;

      if (summary.discovered === 0) {
        const message = "All discovered companies were duplicates for this search job";
        await this.failJob(searchJobId, message);
        return err(new SearchOrchestratorError("NO_COMPANIES_DISCOVERED", message));
      }

      await this.deps.searchRepository.updateJobStatus(searchJobId, SearchJobStatus.ENRICHING);

      const searchResults = await this.deps.searchRepository.findResultsByJobId(searchJobId);

      logger.info("SearchOrchestrator hybrid enrichment stage started", {
        searchJobId,
        companyCount: searchResults.length,
        enrichmentConcurrency: this.enrichmentConcurrency,
      });

      const enrichmentOutcomes = await runWithConcurrency(
        searchResults,
        this.enrichmentConcurrency,
        (searchResult) => this.processLeadHybrid(searchResult),
      );

      mergeStageOutcomes(summary, failures, enrichmentOutcomes);

      const finalStatus =
        summary.enriched > 0
          ? SearchJobStatus.COMPLETED
          : SearchJobStatus.FAILED;

      await this.deps.searchRepository.updateJobStatus(searchJobId, finalStatus, {
        completedAt: new Date(),
        errorMessage:
          summary.enriched > 0 && summary.failed > 0
            ? `Completed with partial failures (${summary.failed} failed stages)`
            : summary.enriched === 0
              ? "No leads were fully processed"
              : null,
      });

      const durationMs = Date.now() - startedAt;

      logger.info("SearchOrchestrator.run completed", {
        searchJobId,
        status: finalStatus,
        durationMs,
        summary,
        failureCount: failures.length,
      });

      return ok({
        searchJobId,
        status: finalStatus,
        criteria,
        summary,
        failures,
        durationMs,
      });
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      const message = error instanceof Error ? error.message : "Search orchestration failed";

      if (searchJobId) {
        await this.failJob(searchJobId, message);
      }

      logger.error("SearchOrchestrator.run failed", {
        searchJobId,
        durationMs,
        message,
      });

      return err(
        new SearchOrchestratorError("ORCHESTRATION_FAILED", message, error),
      );
    }
  }

  private async parseQueryWithRetry(
    query: string,
  ): Promise<Result<ParsedQuery, SearchOrchestratorError>> {
    try {
      const result = await withRetry(
        async () => {
          const parsed = await this.deps.queryParser.parse(query);

          if (!parsed.ok) {
            throw parsed.error;
          }

          return parsed.value;
        },
        {
          maxAttempts: this.maxAttempts,
          initialDelayMs: this.initialDelayMs,
        },
      );

      return ok(result);
    } catch (error) {
      return err(
        new SearchOrchestratorError(
          "QUERY_PARSE_FAILED",
          error instanceof Error ? error.message : "Failed to parse search query",
          error,
        ),
      );
    }
  }

  private async discoverCompaniesWithRetry(
    query: string,
    criteria: ParsedQuery,
    limit: number | null,
  ): Promise<Result<DiscoveredCompany[], SearchOrchestratorError>> {
    try {
      const result = await withRetry(
        async () => {
          const discoveryInput: CompanyDiscoveryInput = {
            query,
            industry: criteria.industry !== "unknown" ? criteria.industry : undefined,
            location: criteria.location !== "unknown" ? criteria.location : undefined,
          };

          if (typeof limit === "number") {
            discoveryInput.limit = limit;
          }

          const discovered = await this.deps.companyDiscovery.discover(discoveryInput);

          if (!discovered.ok) {
            throw discovered.error;
          }

          return discovered.value;
        },
        {
          maxAttempts: this.maxAttempts,
          initialDelayMs: this.initialDelayMs,
        },
      );

      return ok(result);
    } catch (error) {
      return err(
        new SearchOrchestratorError(
          "DISCOVERY_FAILED",
          error instanceof Error ? error.message : "Company discovery failed",
          error,
        ),
      );
    }
  }

  private async processLeadHybrid(searchResult: SearchResultRecord): Promise<StageOutcome> {
    await this.deps.searchRepository.updateResultStage({
      searchResultId: searchResult.id,
      stage: SearchResultStage.ENRICHING,
    });

    const company = await this.deps.companyRepository.findById(searchResult.companyId);

    if (!company?.websiteUrl) {
      return this.markEnrichFailed(
        searchResult.id,
        searchResult.companyId,
        "Company website is missing for enrichment",
      );
    }

    const stubProfile = createDiscoveryStubProfile(company.name ?? company.domain);

    const enrichmentResult = await this.runWithResultRetry(
      () =>
        this.deps.leadEnrichment.enrich({
          companyName: stubProfile.companyName,
          domain: company.normalizedDomain,
          website: company.websiteUrl!,
          websiteProfile: stubProfile,
          companyId: company.id,
        }),
      (error) =>
        error.code === "OPENAI_ERROR" ||
        error.code === "VALIDATION_ERROR" ||
        error.code === "EMPTY_RESPONSE",
    );

    if (!enrichmentResult.ok) {
      return this.markEnrichFailed(
        searchResult.id,
        company.id,
        enrichmentResult.error.message,
      );
    }

    let profile = enrichmentResult.value.profile;
    let crawled = 0;
    let extracted = 0;

    if (hasOutreachContactGaps(profile)) {
      const contactOutcome = await this.supplementProfileFromContactPages(
        searchResult.id,
        company.id,
        company.websiteUrl!,
        company.normalizedDomain,
        profile,
      );

      if (contactOutcome.profile) {
        profile = contactOutcome.profile;
      }

      crawled = contactOutcome.crawled;
      extracted = contactOutcome.extracted;
    }

    const contentHash = hashEnrichmentProfile(profile);

    await this.deps.companyRepository.saveProfile({
      companyId: company.id,
      structuredData: profile,
      completeness: computeExtractionCompleteness(profile),
      modelUsed: enrichmentResult.value.meta.modelUsed,
      promptVersion: enrichmentResult.value.meta.promptVersion,
      contentHash,
      extractedAt: new Date(enrichmentResult.value.meta.enrichedAt),
    });

    await this.deps.searchRepository.updateResultStage({
      searchResultId: searchResult.id,
      stage: SearchResultStage.ENRICHED,
      completedAt: new Date(),
    });

    return { crawled, extracted, enriched: 1, failed: 0, failures: [] };
  }

  private async supplementProfileFromContactPages(
    searchResultId: string,
    companyId: string,
    website: string,
    normalizedDomain: string,
    webProfile: ExtractedCompany,
  ): Promise<{ profile?: ExtractedCompany; crawled: number; extracted: number }> {
    await this.deps.searchRepository.updateResultStage({
      searchResultId,
      stage: SearchResultStage.CRAWLING,
    });

    const crawlResult = await this.runWithResultRetry(
      () =>
        this.deps.websiteCrawler.crawl({
          companyId,
          website,
          normalizedDomain,
          paths: CONTACT_CRAWL_PATHS,
        }),
      (error) => error.code === "CRAWL_FAILED" || error.code === "BROWSER_ERROR",
    );

    if (!crawlResult.ok) {
      logger.info("SearchOrchestrator contact crawl skipped after failure", {
        searchResultId,
        companyId,
        message: crawlResult.error.message,
      });

      return { crawled: 0, extracted: 0 };
    }

    await this.deps.companyRepository.markCrawled(companyId);

    const llmContent = this.buildLlmContent(crawlResult.value);

    if (llmContent.length < 100) {
      return { crawled: 1, extracted: 0 };
    }

    await this.deps.searchRepository.updateResultStage({
      searchResultId,
      stage: SearchResultStage.EXTRACTING,
    });

    const extractionResult = await this.runWithResultRetry(
      () =>
        this.deps.companyExtraction.extract({
          content: llmContent,
          domain: normalizedDomain,
          companyId,
        }),
      (error) =>
        error.code === "OPENAI_ERROR" ||
        error.code === "VALIDATION_ERROR" ||
        error.code === "EMPTY_RESPONSE",
    );

    if (!extractionResult.ok) {
      return { crawled: 1, extracted: 0 };
    }

    return {
      profile: mergeExtractedProfiles(extractionResult.value.profile, webProfile),
      crawled: 1,
      extracted: 1,
    };
  }

  private buildLlmContent(crawlResult: CrawlCompanyResult): string {
    const cleanedPages: LlmReadyContent[] = [];

    for (const page of crawlResult.pages) {
      if (!page.html || page.error) {
        continue;
      }

      const cleaned = this.deps.textCleaning.clean({
        html: page.html,
        url: page.url,
        pagePath: page.path,
        title: page.title,
      });

      if (cleaned.ok) {
        cleanedPages.push(cleaned.value);
      }
    }

    return promptSanitizerService.sanitizeCrawlContent(
      aggregateLlmReadyPages(cleanedPages),
    );
  }

  private async runWithResultRetry<T, E extends { code: string; message: string }>(
    operation: () => Promise<Result<T, E>>,
    isRetryable: (error: E) => boolean,
  ): Promise<Result<T, E>> {
    let lastResult: Result<T, E> | undefined;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      const result = await operation();
      lastResult = result;

      if (result.ok) {
        return result;
      }

      if (!isRetryable(result.error) || attempt === this.maxAttempts) {
        return result;
      }

      await sleep(this.initialDelayMs * attempt);
    }

    return lastResult!;
  }

  private async markEnrichFailed(
    searchResultId: string,
    companyId: string,
    message: string,
  ): Promise<StageOutcome> {
    await this.deps.searchRepository.updateResultStage({
      searchResultId,
      stage: SearchResultStage.ENRICH_FAILED,
      stageError: message,
    });

    return createStageFailure(SearchResultStage.ENRICH_FAILED, {
      searchResultId,
      companyId,
      message,
    }, { enriched: 0 });
  }

  private async failJob(searchJobId: string, message: string): Promise<void> {
    await this.deps.searchRepository.updateJobStatus(searchJobId, SearchJobStatus.FAILED, {
      completedAt: new Date(),
      errorMessage: message,
    });
  }

}

function createStageFailure(
  stage: SearchStageFailure["stage"],
  failure: Pick<SearchStageFailure, "searchResultId" | "companyId" | "message">,
  counts: Partial<Pick<StageOutcome, "crawled" | "extracted" | "enriched">> = {},
): StageOutcome {
  return {
    crawled: counts.crawled ?? 0,
    extracted: counts.extracted ?? 0,
    enriched: counts.enriched ?? 0,
    failed: 1,
    failures: [{ ...failure, stage }],
  };
}

function mergeStageOutcomes(
  summary: SearchOrchestrationSummary,
  failures: SearchStageFailure[],
  outcomes: StageOutcome[],
): void {
  for (const outcome of outcomes) {
    summary.crawled += outcome.crawled;
    summary.extracted += outcome.extracted;
    summary.enriched += outcome.enriched;
    summary.failed += outcome.failed;
    failures.push(...outcome.failures);
  }
}

function createEmptySummary(): SearchOrchestrationSummary {
  return {
    discovered: 0,
    crawled: 0,
    extracted: 0,
    enriched: 0,
    failed: 0,
    skippedDuplicates: 0,
  };
}

function buildNoCompaniesDiscoveredMessage(query: string, criteria: ParsedQuery): string {
  const hints =
    criteria.industry !== "unknown" || criteria.location !== "unknown"
      ? ` (parsed hints: industry=${criteria.industry}, location=${criteria.location})`
      : "";

  return (
    `No companies discovered for query "${query}"${hints}. ` +
    "Try a more specific description or a different location and retry."
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createSearchOrchestrator(
  deps: SearchOrchestratorDependencies,
  options?: SearchOrchestratorOptions,
): SearchOrchestrator {
  return new SearchOrchestrator(deps, options);
}
