import { SearchJobStatus, SearchResultStage } from "@prisma/client";
import { logger } from "@/lib/logging/logger.js";
import { withRetry } from "@/lib/utils/retry.js";
import { err, ok, type Result } from "@/lib/utils/result.js";
import type { CompanyRepository } from "@/repositories/interfaces/company.repository.interface.js";
import type { LeadRepository } from "@/repositories/interfaces/lead.repository.interface.js";
import type { SearchRepository } from "@/repositories/interfaces/search.repository.interface.js";
import type { DiscoveredCompany } from "@/types/agents/company-discovery.types.js";
import type { ExtractedCompany } from "@/types/agents/company-extraction.types.js";
import type { ParsedQuery } from "@/types/agents/query-parser.types.js";
import type { LlmReadyContent } from "@/types/content/text-cleaning.types.js";
import type { CrawlCompanyResult } from "@/types/crawler/crawler.types.js";
import type { SearchResultRecord } from "@/types/repositories/search.repository.types.js";
import type { CompanyDiscoveryPort } from "@/services/infrastructure/discovery/company-discovery.service.js";
import type { CompanyExtractionPort } from "@/services/infrastructure/ai/company-extraction.service.js";
import type { LeadScoringPort } from "@/services/infrastructure/ai/lead-scoring.service.js";
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
  leadScoring: LeadScoringPort;
  searchRepository: SearchRepository;
  companyRepository: CompanyRepository;
  leadRepository: LeadRepository;
}

export interface SearchOrchestratorOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
}

const DEFAULT_MAX_ATTEMPTS = 2;
const DEFAULT_INITIAL_DELAY_MS = 500;

export class SearchOrchestrator {
  private readonly maxAttempts: number;
  private readonly initialDelayMs: number;

  constructor(
    private readonly deps: SearchOrchestratorDependencies,
    options: SearchOrchestratorOptions = {},
  ) {
    this.maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    this.initialDelayMs = options.initialDelayMs ?? DEFAULT_INITIAL_DELAY_MS;
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
      companyLimit: input.companyLimit ?? 25,
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
        criteria,
        input.companyLimit ?? job.companyLimit,
      );

      if (!discoveriesResult.ok) {
        await this.failJob(searchJobId, discoveriesResult.error.message);
        return err(discoveriesResult.error);
      }

      if (discoveriesResult.value.length === 0) {
        const message = buildNoCompaniesDiscoveredMessage(criteria);
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

      await this.deps.searchRepository.updateJobStatus(searchJobId, SearchJobStatus.CRAWLING);

      const searchResults = await this.deps.searchRepository.findResultsByJobId(searchJobId);

      for (const searchResult of searchResults) {
        await this.processCrawl(searchResult, summary, failures);
      }

      await this.deps.searchRepository.updateJobStatus(searchJobId, SearchJobStatus.EXTRACTING);

      const crawledResults = await this.deps.searchRepository.findResultsByJobId(searchJobId, {
        stage: SearchResultStage.CRAWLED,
      });

      for (const searchResult of crawledResults) {
        await this.processExtraction(searchResult, summary, failures);
      }

      await this.deps.searchRepository.updateJobStatus(searchJobId, SearchJobStatus.SCORING);

      const extractedResults = await this.deps.searchRepository.findResultsByJobId(searchJobId, {
        stage: SearchResultStage.EXTRACTED,
      });

      for (const searchResult of extractedResults) {
        await this.processScoring(searchJobId, criteria, searchResult, summary, failures);
      }

      const finalStatus =
        summary.scored > 0
          ? SearchJobStatus.COMPLETED
          : SearchJobStatus.FAILED;

      await this.deps.searchRepository.updateJobStatus(searchJobId, finalStatus, {
        completedAt: new Date(),
        errorMessage:
          summary.scored > 0 && summary.failed > 0
            ? `Completed with partial failures (${summary.failed} failed stages)`
            : summary.scored === 0
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
    criteria: ParsedQuery,
    limit: number,
  ): Promise<Result<DiscoveredCompany[], SearchOrchestratorError>> {
    try {
      const result = await withRetry(
        async () => {
          const discovered = await this.deps.companyDiscovery.discover({
            industry: criteria.industry,
            location: criteria.location,
            limit,
          });

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

  private async processCrawl(
    searchResult: SearchResultRecord,
    summary: SearchOrchestrationSummary,
    failures: SearchStageFailure[],
  ): Promise<void> {
    await this.deps.searchRepository.updateResultStage({
      searchResultId: searchResult.id,
      stage: SearchResultStage.CRAWLING,
    });

    const company = await this.deps.companyRepository.findById(searchResult.companyId);

    if (!company?.websiteUrl) {
      summary.failed += 1;
      failures.push({
        searchResultId: searchResult.id,
        companyId: searchResult.companyId,
        stage: SearchResultStage.CRAWL_FAILED,
        message: "Company website is missing",
      });

      await this.deps.searchRepository.updateResultStage({
        searchResultId: searchResult.id,
        stage: SearchResultStage.CRAWL_FAILED,
        stageError: "Company website is missing",
      });

      return;
    }

    const crawlResult = await this.runWithResultRetry(
      () =>
        this.deps.websiteCrawler.crawl({
          companyId: company.id,
          website: company.websiteUrl!,
          normalizedDomain: company.normalizedDomain,
        }),
      (error) => error.code === "CRAWL_FAILED" || error.code === "BROWSER_ERROR",
    );

    if (!crawlResult.ok) {
      summary.failed += 1;
      failures.push({
        searchResultId: searchResult.id,
        companyId: company.id,
        stage: SearchResultStage.CRAWL_FAILED,
        message: crawlResult.error.message,
      });

      await this.deps.searchRepository.updateResultStage({
        searchResultId: searchResult.id,
        stage: SearchResultStage.CRAWL_FAILED,
        stageError: crawlResult.error.message,
      });

      return;
    }

    await this.deps.companyRepository.markCrawled(company.id);
    this.storeCrawlPayload(searchResult.id, crawlResult.value);

    await this.deps.searchRepository.updateResultStage({
      searchResultId: searchResult.id,
      stage: SearchResultStage.CRAWLED,
    });

    summary.crawled += 1;
  }

  private async processExtraction(
    searchResult: SearchResultRecord,
    summary: SearchOrchestrationSummary,
    failures: SearchStageFailure[],
  ): Promise<void> {
    await this.deps.searchRepository.updateResultStage({
      searchResultId: searchResult.id,
      stage: SearchResultStage.EXTRACTING,
    });

    const company = await this.deps.companyRepository.findById(searchResult.companyId);

    if (!company) {
      await this.markExtractFailed(searchResult.id, searchResult.companyId, "Company not found", summary, failures);
      return;
    }

    const crawlPayload = this.getCrawlPayload(searchResult.id);

    if (!crawlPayload) {
      await this.markExtractFailed(
        searchResult.id,
        company.id,
        "Crawl payload not found for search result",
        summary,
        failures,
      );
      return;
    }

    const llmContent = this.buildLlmContent(crawlPayload);

    if (llmContent.length < 100) {
      await this.markExtractFailed(
        searchResult.id,
        company.id,
        "Insufficient cleaned content for extraction",
        summary,
        failures,
      );
      return;
    }

    const extractionResult = await this.runWithResultRetry(
      () =>
        this.deps.companyExtraction.extract({
          content: llmContent,
          domain: company.normalizedDomain,
          companyId: company.id,
        }),
      (error) =>
        error.code === "OPENAI_ERROR" ||
        error.code === "VALIDATION_ERROR" ||
        error.code === "EMPTY_RESPONSE",
    );

    if (!extractionResult.ok) {
      await this.markExtractFailed(
        searchResult.id,
        company.id,
        extractionResult.error.message,
        summary,
        failures,
      );
      return;
    }

    await this.deps.companyRepository.saveProfile({
      companyId: company.id,
      structuredData: extractionResult.value.profile,
      completeness: extractionResult.value.meta.completeness,
      modelUsed: extractionResult.value.meta.modelUsed,
      promptVersion: extractionResult.value.meta.promptVersion,
      contentHash: extractionResult.value.meta.contentHash,
      extractedAt: new Date(extractionResult.value.meta.extractedAt),
    });

    this.storeExtractedProfile(searchResult.id, extractionResult.value.profile);

    await this.deps.searchRepository.updateResultStage({
      searchResultId: searchResult.id,
      stage: SearchResultStage.EXTRACTED,
    });

    summary.extracted += 1;
  }

  private async processScoring(
    searchJobId: string,
    criteria: ParsedQuery,
    searchResult: SearchResultRecord,
    summary: SearchOrchestrationSummary,
    failures: SearchStageFailure[],
  ): Promise<void> {
    await this.deps.searchRepository.updateResultStage({
      searchResultId: searchResult.id,
      stage: SearchResultStage.SCORING,
    });

    const profile = this.getExtractedProfile(searchResult.id);

    if (!profile) {
      await this.markScoreFailed(
        searchResult.id,
        searchResult.companyId,
        "Extracted profile not found for scoring",
        summary,
        failures,
      );
      return;
    }

    const scoringResult = await this.runWithResultRetry(
      () =>
        this.deps.leadScoring.score({
          profile,
          criteria,
          companyId: searchResult.companyId,
          searchResultId: searchResult.id,
          searchJobId,
        }),
      (error) =>
        error.code === "OPENAI_ERROR" ||
        error.code === "VALIDATION_ERROR" ||
        error.code === "EMPTY_RESPONSE",
    );

    if (!scoringResult.ok) {
      await this.markScoreFailed(
        searchResult.id,
        searchResult.companyId,
        scoringResult.error.message,
        summary,
        failures,
      );
      return;
    }

    await this.deps.leadRepository.saveScore({
      searchResultId: searchResult.id,
      searchJobId,
      totalScore: scoringResult.value.leadScore.score,
      confidence: scoringResult.value.leadScore.confidence,
      breakdown: scoringResult.value.leadScore.breakdown,
      rationale: scoringResult.value.leadScore.explanation,
      modelUsed: scoringResult.value.meta.modelUsed,
      promptVersion: scoringResult.value.meta.promptVersion,
      scoredAt: new Date(scoringResult.value.meta.scoredAt),
    });

    summary.scored += 1;
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

  private async markExtractFailed(
    searchResultId: string,
    companyId: string,
    message: string,
    summary: SearchOrchestrationSummary,
    failures: SearchStageFailure[],
  ): Promise<void> {
    summary.failed += 1;
    failures.push({
      searchResultId,
      companyId,
      stage: SearchResultStage.EXTRACT_FAILED,
      message,
    });

    await this.deps.searchRepository.updateResultStage({
      searchResultId,
      stage: SearchResultStage.EXTRACT_FAILED,
      stageError: message,
    });
  }

  private async markScoreFailed(
    searchResultId: string,
    companyId: string,
    message: string,
    summary: SearchOrchestrationSummary,
    failures: SearchStageFailure[],
  ): Promise<void> {
    summary.failed += 1;
    failures.push({
      searchResultId,
      companyId,
      stage: SearchResultStage.SCORE_FAILED,
      message,
    });

    await this.deps.searchRepository.updateResultStage({
      searchResultId,
      stage: SearchResultStage.SCORE_FAILED,
      stageError: message,
    });
  }

  private async failJob(searchJobId: string, message: string): Promise<void> {
    await this.deps.searchRepository.updateJobStatus(searchJobId, SearchJobStatus.FAILED, {
      completedAt: new Date(),
      errorMessage: message,
    });
  }

  private readonly crawlPayloadByResultId = new Map<string, CrawlCompanyResult>();
  private readonly extractedProfileByResultId = new Map<string, ExtractedCompany>();

  private storeCrawlPayload(searchResultId: string, payload: CrawlCompanyResult): void {
    this.crawlPayloadByResultId.set(searchResultId, payload);
  }

  private getCrawlPayload(searchResultId: string): CrawlCompanyResult | undefined {
    return this.crawlPayloadByResultId.get(searchResultId);
  }

  private storeExtractedProfile(searchResultId: string, profile: ExtractedCompany): void {
    this.extractedProfileByResultId.set(searchResultId, profile);
  }

  private getExtractedProfile(searchResultId: string): ExtractedCompany | undefined {
    return this.extractedProfileByResultId.get(searchResultId);
  }
}

function createEmptySummary(): SearchOrchestrationSummary {
  return {
    discovered: 0,
    crawled: 0,
    extracted: 0,
    scored: 0,
    failed: 0,
    skippedDuplicates: 0,
  };
}

function buildNoCompaniesDiscoveredMessage(criteria: ParsedQuery): string {
  const criteriaSummary = `industry=${criteria.industry}, location=${criteria.location}`;

  return (
    `No companies discovered for search criteria (${criteriaSummary}). ` +
    "Discovery sources returned no companies. DuckDuckGo may be blocked from this server IP; " +
    "try a supported location (Finland, Germany, United States, United Kingdom, Sweden) or configure DISCOVERY_HTTP_PROXY."
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
