import { SearchJobStatus, SearchResultStage } from "@prisma/client";
import { getPipelineConfig } from "@/lib/config/pipeline.config.js";
import { hasParsedCriteria } from "@/lib/search/parsed-criteria.js";
import { getEnrichmentDeficit, isUnlimitedCompanyLimit } from "@/lib/search/company-limit.js";
import { computeExtractionCompleteness } from "@/lib/validations/company-extraction.schema.js";
import { logger } from "@/lib/logging/logger.js";
import { runWithConcurrency } from "@/lib/utils/concurrency.js";
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
import {
  CONTACT_CRAWL_PATHS,
  CRAWL_PATHS,
  EXTENDED_TEAM_CRAWL_PATHS,
  type CrawlPath,
} from "@/types/crawler/crawler.types.js";
import type { CrawlCompanyResult } from "@/types/crawler/crawler.types.js";
import { createDiscoveryStubProfile } from "@/services/domain/enrichment/discovery-stub-profile.service.js";
import {
  enrichProfileWithDecisionMakerContacts,
  sanitizeLeadContacts,
} from "@/services/domain/enrichment/decision-maker-contact.service.js";
import { hasOutreachContactGaps } from "@/services/domain/enrichment/outreach-gaps.service.js";
import { mergeExtractedProfiles } from "@/services/domain/enrichment/profile-merge.service.js";
import type { ContactlessLeadRemovalService } from "@/services/application/contactless-lead-removal.service.js";
import { hasAnyLeadContactDetails } from "@/lib/results/lead-contact-eligibility.js";
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
import { runIntentDetectionForCompany } from "@/services/application/intent-detection-runner.service.js";
import {
  isSearchJobCancelled,
  SearchJobControlSignal,
} from "@/services/application/search-job-control.js";
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
  contactlessLeadRemoval: ContactlessLeadRemovalService;
}

export interface SearchOrchestratorOptions {
  enrichmentConcurrency?: number;
  minProfileCompleteness?: number;
}

interface StageOutcome {
  crawled: number;
  extracted: number;
  enriched: number;
  removed: number;
  failed: number;
  failures: SearchStageFailure[];
}

interface CrawlExtractOutcome {
  profile?: ExtractedCompany;
  crawled: number;
  extracted: number;
  extractionMeta?: {
    modelUsed: string;
    promptVersion: string;
    extractedAt: string;
  };
}

interface SavedProfileMeta {
  modelUsed: string;
  promptVersion: string;
  extractedAt: Date;
}

export class SearchOrchestrator {
  private readonly enrichmentConcurrency: number;
  private readonly minProfileCompleteness: number;
  private readonly discoveryTargetMaxRounds: number;
  private readonly discoveryTargetMaxAttemptMultiplier: number;

  constructor(
    private readonly deps: SearchOrchestratorDependencies,
    options: SearchOrchestratorOptions = {},
  ) {
    const pipelineConfig = getPipelineConfig();

    this.enrichmentConcurrency =
      options.enrichmentConcurrency ?? pipelineConfig.SEARCH_ENRICHMENT_CONCURRENCY;
    this.minProfileCompleteness =
      options.minProfileCompleteness ?? pipelineConfig.SEARCH_MIN_PROFILE_COMPLETENESS;
    this.discoveryTargetMaxRounds = pipelineConfig.DISCOVERY_TARGET_MAX_ROUNDS;
    this.discoveryTargetMaxAttemptMultiplier =
      pipelineConfig.DISCOVERY_TARGET_MAX_ATTEMPT_MULTIPLIER;
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

      if (job.status === SearchJobStatus.CANCELLED) {
        return ok(this.buildInterruptedResult(searchJobId, job.criteria, summary, failures, startedAt));
      }

      await this.assertJobShouldContinue(searchJobId);

      let criteria: ParsedQuery;

      if (hasParsedCriteria(job.criteria)) {
        criteria = job.criteria;
      } else {
        await this.deps.searchRepository.updateJobStatus(searchJobId, SearchJobStatus.DISCOVERING, {
          startedAt: new Date(),
        });

        const criteriaResult = await this.parseQuery(input.query);

        if (!criteriaResult.ok) {
          await this.failJob(searchJobId, criteriaResult.error.message);
          return err(criteriaResult.error);
        }

        criteria = criteriaResult.value;
        await this.deps.searchRepository.updateJobCriteria(searchJobId, criteria);
      }

      const companyLimit = input.companyLimit ?? job.companyLimit;

      const pipelineResult = isUnlimitedCompanyLimit(companyLimit)
        ? await this.runUnlimitedSearch(searchJobId, input.query, criteria, summary, failures)
        : await this.runTargetedSearch(
            searchJobId,
            input.query,
            criteria,
            companyLimit as number,
            summary,
            failures,
          );

      if (!pipelineResult.ok) {
        await this.failJob(searchJobId, pipelineResult.error.message);
        return err(pipelineResult.error);
      }

      await this.assertJobShouldContinue(searchJobId);

      const stageCounts = await this.deps.searchRepository.countResultsByStage(searchJobId);
      const enrichedTotal = stageCounts.ENRICHED ?? 0;

      const finalStatus =
        enrichedTotal > 0
          ? SearchJobStatus.COMPLETED
          : SearchJobStatus.FAILED;

      const targetLimit = isUnlimitedCompanyLimit(companyLimit) ? null : companyLimit;

      await this.deps.searchRepository.updateJobStatus(searchJobId, finalStatus, {
        completedAt: new Date(),
        errorMessage: buildJobCompletionMessage(summary, targetLimit),
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
      if (error instanceof SearchJobControlSignal && searchJobId) {
        const durationMs = Date.now() - startedAt;
        const job = await this.deps.searchRepository.findJobById(searchJobId);
        const criteria = job && hasParsedCriteria(job.criteria) ? job.criteria : {
          industry: "unknown",
          location: "unknown",
          employeeRange: "unknown",
        };

        await this.deps.searchRepository.updateJobStatus(searchJobId, SearchJobStatus.CANCELLED, {
          completedAt: new Date(),
          errorMessage: "Search stopped by user",
        });

        logger.info("SearchOrchestrator.run cancelled", {
          searchJobId,
          durationMs,
          summary,
        });

        return ok({
          searchJobId,
          status: SearchJobStatus.CANCELLED,
          criteria,
          summary,
          failures,
          durationMs,
        });
      }

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

  private async assertJobShouldContinue(searchJobId: string): Promise<void> {
    const job = await this.deps.searchRepository.findJobById(searchJobId);

    if (!job || isSearchJobCancelled(job.status)) {
      throw new SearchJobControlSignal();
    }
  }

  private async processLeadWithControl(
    searchJobId: string,
    searchResult: SearchResultRecord,
  ): Promise<StageOutcome> {
    await this.assertJobShouldContinue(searchJobId);
    return this.processLeadHybrid(searchResult);
  }

  private buildInterruptedResult(
    searchJobId: string,
    criteria: ParsedQuery | Record<string, unknown>,
    summary: SearchOrchestrationSummary,
    failures: SearchStageFailure[],
    startedAt: number,
  ): SearchOrchestrationResult {
    return {
      searchJobId,
      status: SearchJobStatus.CANCELLED,
      criteria: hasParsedCriteria(criteria)
        ? criteria
        : {
            industry: "unknown",
            location: "unknown",
            employeeRange: "unknown",
          },
      summary,
      failures,
      durationMs: Date.now() - startedAt,
    };
  }

  private async parseQuery(
    query: string,
  ): Promise<Result<ParsedQuery, SearchOrchestratorError>> {
    const parsed = await this.deps.queryParser.parse(query);

    if (!parsed.ok) {
      return err(
        new SearchOrchestratorError(
          "QUERY_PARSE_FAILED",
          parsed.error.message,
          parsed.error,
        ),
      );
    }

    return ok(parsed.value);
  }

  private async runUnlimitedSearch(
    searchJobId: string,
    query: string,
    criteria: ParsedQuery,
    summary: SearchOrchestrationSummary,
    failures: SearchStageFailure[],
  ): Promise<Result<void, SearchOrchestratorError>> {
    const existingResults = await this.deps.searchRepository.findResultsByJobId(searchJobId);

    if (existingResults.length > 0) {
      summary.discovered = existingResults.length;

      const pendingResults = existingResults.filter(
        (result) => result.stage !== SearchResultStage.ENRICHED,
      );

      if (pendingResults.length === 0) {
        return ok(undefined);
      }

      await this.deps.searchRepository.updateJobStatus(searchJobId, SearchJobStatus.ENRICHING);

      logger.info("SearchOrchestrator resuming hybrid enrichment stage", {
        searchJobId,
        companyCount: pendingResults.length,
        enrichmentConcurrency: this.enrichmentConcurrency,
      });

      const enrichmentOutcomes = await runWithConcurrency(
        pendingResults,
        this.enrichmentConcurrency,
        (searchResult) => this.processLeadWithControl(searchJobId, searchResult),
      );

      mergeStageOutcomes(summary, failures, enrichmentOutcomes);
      await this.assertJobShouldContinue(searchJobId);

      return ok(undefined);
    }

    await this.assertJobShouldContinue(searchJobId);

    const discoveriesResult = await this.discoverCompanies(query, criteria, null);

    if (!discoveriesResult.ok) {
      return err(discoveriesResult.error);
    }

    if (discoveriesResult.value.length === 0) {
      const message = buildNoCompaniesDiscoveredMessage(query, criteria);
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
      (searchResult) => this.processLeadWithControl(searchJobId, searchResult),
    );

    mergeStageOutcomes(summary, failures, enrichmentOutcomes);
    await this.assertJobShouldContinue(searchJobId);

    return ok(undefined);
  }

  private async runTargetedSearch(
    searchJobId: string,
    query: string,
    criteria: ParsedQuery,
    targetLimit: number,
    summary: SearchOrchestrationSummary,
    failures: SearchStageFailure[],
  ): Promise<Result<void, SearchOrchestratorError>> {
    const maxAttempts = targetLimit * this.discoveryTargetMaxAttemptMultiplier;
    const existingResults = await this.deps.searchRepository.findResultsByJobId(searchJobId);
    const highestRank = existingResults.reduce(
      (max, result) => Math.max(max, result.rank ?? 0),
      0,
    );
    const attemptedWebsites: string[] = [];
    let totalAttempted = existingResults.length;
    let nextRank = highestRank > 0 ? highestRank + 1 : 1;

    for (const result of existingResults) {
      const company = await this.deps.companyRepository.findById(result.companyId);

      if (company?.websiteUrl) {
        attemptedWebsites.push(company.websiteUrl);
      }
    }

    for (let round = 0; round < this.discoveryTargetMaxRounds; round += 1) {
      await this.assertJobShouldContinue(searchJobId);

      const stageCounts = await this.deps.searchRepository.countResultsByStage(searchJobId);
      const enrichedCount = stageCounts.ENRICHED ?? 0;

      if (enrichedCount >= targetLimit) {
        break;
      }

      const deficit = getEnrichmentDeficit(targetLimit, enrichedCount);
      const remainingBudget = maxAttempts - totalAttempted;
      const batchSize = Math.min(deficit, remainingBudget);

      if (batchSize <= 0) {
        break;
      }

      await this.deps.searchRepository.updateJobStatus(searchJobId, SearchJobStatus.DISCOVERING);

      const discoveriesResult = await this.discoverCompanies(
        query,
        criteria,
        batchSize,
        attemptedWebsites,
      );

      if (!discoveriesResult.ok) {
        if (round === 0 && enrichedCount === 0) {
          return err(discoveriesResult.error);
        }

        break;
      }

      if (discoveriesResult.value.length === 0) {
        if (round === 0 && enrichedCount === 0) {
          const message = buildNoCompaniesDiscoveredMessage(query, criteria);
          return err(new SearchOrchestratorError("NO_COMPANIES_DISCOVERED", message));
        }

        break;
      }

      attemptedWebsites.push(...discoveriesResult.value.map((company) => company.website));
      totalAttempted += discoveriesResult.value.length;

      const discoveryPersist = await this.deps.searchRepository.addDiscoveredCompanies(
        searchJobId,
        discoveriesResult.value.map((company, index) => ({
          companyName: company.companyName,
          website: company.website,
          rank: nextRank + index,
          discoverySource: "discovery_agent",
        })),
      );

      nextRank += discoveriesResult.value.length;
      summary.discovered += discoveryPersist.searchResults.length;
      summary.skippedDuplicates += discoveryPersist.skippedDuplicates;

      if (discoveryPersist.searchResults.length === 0) {
        if (round === 0 && enrichedCount === 0) {
          const message = "All discovered companies were duplicates for this search job";
          return err(new SearchOrchestratorError("NO_COMPANIES_DISCOVERED", message));
        }

        break;
      }

      await this.deps.searchRepository.updateJobStatus(searchJobId, SearchJobStatus.ENRICHING);

      const currentStageCounts =
        await this.deps.searchRepository.countResultsByStage(searchJobId);
      const currentEnriched = currentStageCounts.ENRICHED ?? 0;
      const enrichDeficit = getEnrichmentDeficit(targetLimit, currentEnriched);
      const toEnrich = discoveryPersist.searchResults.slice(0, enrichDeficit);

      logger.info("SearchOrchestrator targeted enrichment batch started", {
        searchJobId,
        round: round + 1,
        batchCount: toEnrich.length,
        enrichedCount: currentEnriched,
        targetLimit,
      });

      const enrichmentOutcomes = await runWithConcurrency(
        toEnrich,
        this.enrichmentConcurrency,
        (searchResult) => this.processLeadWithControl(searchJobId, searchResult),
      );

      mergeStageOutcomes(summary, failures, enrichmentOutcomes);
    }

    await this.assertJobShouldContinue(searchJobId);

    return ok(undefined);
  }

  private async discoverCompanies(
    query: string,
    criteria: ParsedQuery,
    limit: number | null,
    excludedWebsites: string[] = [],
  ): Promise<Result<DiscoveredCompany[], SearchOrchestratorError>> {
    const discoveryInput: CompanyDiscoveryInput = {
      query,
      industry: criteria.industry !== "unknown" ? criteria.industry : undefined,
      location: criteria.location !== "unknown" ? criteria.location : undefined,
    };

    if (typeof limit === "number") {
      discoveryInput.limit = limit;
    }

    if (excludedWebsites.length > 0) {
      discoveryInput.excludedWebsites = [...excludedWebsites];
    }

    const discovered = await this.deps.companyDiscovery.discover(discoveryInput);

    if (!discovered.ok) {
      return err(
        new SearchOrchestratorError(
          "DISCOVERY_FAILED",
          discovered.error.message,
          discovered.error,
        ),
      );
    }

    return ok(discovered.value);
  }

  private async processLeadHybrid(searchResult: SearchResultRecord): Promise<StageOutcome> {
    await this.deps.searchRepository.updateResultStage({
      searchResultId: searchResult.id,
      stage: SearchResultStage.ENRICHING,
    });

    const company = await this.deps.companyRepository.findById(searchResult.companyId);

    if (!company?.websiteUrl) {
      return this.removeUnenrichedLead(
        searchResult.id,
        searchResult.companyId,
        "Company website is missing for enrichment",
      );
    }

    const stubProfile = createDiscoveryStubProfile(company.name ?? company.domain);

    const enrichmentResult = await this.deps.leadEnrichment.enrich({
      companyName: stubProfile.companyName,
      domain: company.normalizedDomain,
      website: company.websiteUrl!,
      websiteProfile: stubProfile,
      companyId: company.id,
    });

    if (!enrichmentResult.ok) {
      logger.info("SearchOrchestrator web enrichment failed, attempting crawl fallback", {
        searchResultId: searchResult.id,
        companyId: company.id,
        message: enrichmentResult.error.message,
      });

      const fallbackOutcome = await this.enrichProfileFromWebsiteCrawl(
        searchResult.id,
        company.id,
        company.websiteUrl!,
        company.normalizedDomain,
        stubProfile,
      );

      if (!fallbackOutcome.profile || !fallbackOutcome.extractionMeta) {
        const fallbackReason =
          fallbackOutcome.crawled === 0
            ? "website crawl failed"
            : fallbackOutcome.extracted === 0
              ? "profile extraction from crawled pages failed"
              : "crawl fallback produced no profile";

        return this.removeUnenrichedLead(
          searchResult.id,
          company.id,
          `Web enrichment failed (${enrichmentResult.error.message}); ${fallbackReason}`,
        );
      }

      return this.finalizeLeadProfile(
        searchResult,
        company.id,
        company.websiteUrl!,
        company.normalizedDomain,
        fallbackOutcome.profile,
        {
          modelUsed: fallbackOutcome.extractionMeta.modelUsed,
          promptVersion: fallbackOutcome.extractionMeta.promptVersion,
          extractedAt: new Date(fallbackOutcome.extractionMeta.extractedAt),
        },
        {
          crawled: fallbackOutcome.crawled,
          extracted: fallbackOutcome.extracted,
        },
      );
    }

    return this.finalizeLeadProfile(
      searchResult,
      company.id,
      company.websiteUrl!,
      company.normalizedDomain,
      enrichmentResult.value.profile,
      {
        modelUsed: enrichmentResult.value.meta.modelUsed,
        promptVersion: enrichmentResult.value.meta.promptVersion,
        extractedAt: new Date(enrichmentResult.value.meta.enrichedAt),
      },
      { crawled: 0, extracted: 0 },
    );
  }

  private async finalizeLeadProfile(
    searchResult: SearchResultRecord,
    companyId: string,
    website: string,
    normalizedDomain: string,
    profile: ExtractedCompany,
    meta: SavedProfileMeta,
    priorCounts: { crawled: number; extracted: number },
  ): Promise<StageOutcome> {
    let currentProfile = sanitizeLeadContacts(profile);
    let crawled = priorCounts.crawled;
    let extracted = priorCounts.extracted;

    const contactPasses: readonly (readonly CrawlPath[])[] = [
      CONTACT_CRAWL_PATHS,
      EXTENDED_TEAM_CRAWL_PATHS,
    ];

    for (const paths of contactPasses) {
      if (!hasOutreachContactGaps(currentProfile)) {
        break;
      }

      const contactOutcome = await this.crawlAndExtractProfile({
        searchResultId: searchResult.id,
        companyId,
        website,
        normalizedDomain,
        paths,
        mergeWith: currentProfile,
        logContext: "contact_supplement",
        nonFatalCrawlFailure: true,
      });

      if (contactOutcome.profile) {
        currentProfile = sanitizeLeadContacts(contactOutcome.profile);
      }

      crawled += contactOutcome.crawled;
      extracted += contactOutcome.extracted;
    }

    currentProfile = sanitizeLeadContacts(currentProfile);

    if (!hasAnyLeadContactDetails(currentProfile)) {
      return this.removeContactlessLead(
        searchResult,
        companyId,
        currentProfile,
        "No company or decision-maker contact information found",
      );
    }

    const completeness = computeExtractionCompleteness(currentProfile);

    if (completeness < this.minProfileCompleteness) {
      return this.removeUnenrichedLead(
        searchResult.id,
        companyId,
        `Profile completeness ${completeness.toFixed(3)} is below minimum ${this.minProfileCompleteness}`,
      );
    }

    await this.persistEnrichedLead(searchResult.id, companyId, currentProfile, meta);

    return {
      crawled,
      extracted,
      enriched: 1,
      removed: 0,
      failed: 0,
      failures: [],
    };
  }

  private async enrichProfileFromWebsiteCrawl(
    searchResultId: string,
    companyId: string,
    website: string,
    normalizedDomain: string,
    stubProfile: ExtractedCompany,
  ): Promise<CrawlExtractOutcome> {
    return this.crawlAndExtractProfile({
      searchResultId,
      companyId,
      website,
      normalizedDomain,
      paths: CRAWL_PATHS,
      mergeWith: stubProfile,
      logContext: "crawl_fallback",
    });
  }

  private async crawlAndExtractProfile(input: {
    searchResultId: string;
    companyId: string;
    website: string;
    normalizedDomain: string;
    paths: readonly CrawlPath[];
    mergeWith?: ExtractedCompany;
    logContext: "crawl_fallback" | "contact_supplement";
    nonFatalCrawlFailure?: boolean;
  }): Promise<CrawlExtractOutcome> {
    await this.deps.searchRepository.updateResultStage({
      searchResultId: input.searchResultId,
      stage: SearchResultStage.CRAWLING,
    });

    const crawlResult = await this.deps.websiteCrawler.crawl({
      companyId: input.companyId,
      website: input.website,
      normalizedDomain: input.normalizedDomain,
      paths: input.paths,
    });

    if (!crawlResult.ok) {
      logger.info("SearchOrchestrator crawl skipped after failure", {
        searchResultId: input.searchResultId,
        companyId: input.companyId,
        logContext: input.logContext,
        message: crawlResult.error.message,
      });

      return { crawled: 0, extracted: 0 };
    }

    await this.deps.companyRepository.markCrawled(input.companyId);

    const htmlPages = this.collectCrawlHtml(crawlResult.value);
    const llmContent = this.buildLlmContent(crawlResult.value);

    if (llmContent.length < 100) {
      const hintedProfile = this.applyHtmlContactHints(input.mergeWith, htmlPages);

      if (hintedProfile) {
        return { profile: hintedProfile, crawled: 1, extracted: 0 };
      }

      logger.info("SearchOrchestrator crawl produced insufficient content for extraction", {
        searchResultId: input.searchResultId,
        companyId: input.companyId,
        logContext: input.logContext,
        contentLength: llmContent.length,
      });

      return { crawled: 1, extracted: 0 };
    }

    await this.deps.searchRepository.updateResultStage({
      searchResultId: input.searchResultId,
      stage: SearchResultStage.EXTRACTING,
    });

    const extractionResult = await this.deps.companyExtraction.extract({
      content: llmContent,
      domain: input.normalizedDomain,
      companyId: input.companyId,
    });

    if (!extractionResult.ok) {
      const hintedProfile = this.applyHtmlContactHints(input.mergeWith, htmlPages);

      if (hintedProfile) {
        return { profile: hintedProfile, crawled: 1, extracted: 0 };
      }

      if (!input.nonFatalCrawlFailure) {
        logger.info("SearchOrchestrator crawl extraction failed", {
          searchResultId: input.searchResultId,
          companyId: input.companyId,
          logContext: input.logContext,
          message: extractionResult.error.message,
        });
      }

      return { crawled: 1, extracted: 0 };
    }

    let profile = input.mergeWith
      ? mergeExtractedProfiles(extractionResult.value.profile, input.mergeWith)
      : extractionResult.value.profile;

    profile = enrichProfileWithDecisionMakerContacts(profile, htmlPages);
    profile = sanitizeLeadContacts(profile);

    return {
      profile,
      crawled: 1,
      extracted: 1,
      extractionMeta: {
        modelUsed: extractionResult.value.meta.modelUsed,
        promptVersion: extractionResult.value.meta.promptVersion,
        extractedAt: extractionResult.value.meta.extractedAt,
      },
    };
  }

  private collectCrawlHtml(crawlResult: CrawlCompanyResult): string[] {
    return crawlResult.pages
      .filter((page) => page.html && !page.error)
      .map((page) => page.html);
  }

  private applyHtmlContactHints(
    profile: ExtractedCompany | undefined,
    htmlPages: string[],
  ): ExtractedCompany | undefined {
    if (!profile || htmlPages.length === 0) {
      return undefined;
    }

    return sanitizeLeadContacts(
      enrichProfileWithDecisionMakerContacts(profile, htmlPages),
    );
  }

  private async persistEnrichedLead(
    searchResultId: string,
    companyId: string,
    profile: ExtractedCompany,
    meta: SavedProfileMeta,
  ): Promise<void> {
    const contentHash = hashEnrichmentProfile(profile);

    await this.deps.companyRepository.saveProfile({
      companyId,
      structuredData: profile,
      completeness: computeExtractionCompleteness(profile),
      modelUsed: meta.modelUsed,
      promptVersion: meta.promptVersion,
      contentHash,
      extractedAt: meta.extractedAt,
    });

    await this.deps.searchRepository.updateResultStage({
      searchResultId,
      stage: SearchResultStage.ENRICHED,
      completedAt: new Date(),
    });

    const company = await this.deps.companyRepository.findById(companyId);

    if (company) {
      void runIntentDetectionForCompany({
        companyId,
        companyName: company.name ?? company.domain,
        domain: company.domain,
        website: company.websiteUrl ?? `https://${company.domain}`,
        profile,
      }).catch((error) => {
        logger.warn("SearchOrchestrator intent detection failed", {
          companyId,
          message: error instanceof Error ? error.message : "Intent detection failed",
        });
      });
    }
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

  private async removeContactlessLead(
    searchResult: SearchResultRecord,
    companyId: string,
    profile: ExtractedCompany,
    message: string,
  ): Promise<StageOutcome> {
    logger.info("SearchOrchestrator removing contactless lead", {
      searchResultId: searchResult.id,
      companyId,
      message,
    });

    await this.deps.contactlessLeadRemoval.removeContactlessLead(companyId, profile, message);

    return {
      crawled: 0,
      extracted: 0,
      enriched: 0,
      removed: 1,
      failed: 0,
      failures: [
        {
          companyId,
          stage: "REMOVED",
          message,
        },
      ],
    };
  }

  private async removeUnenrichedLead(
    searchResultId: string,
    companyId: string,
    message: string,
  ): Promise<StageOutcome> {
    logger.info("SearchOrchestrator removing unenriched lead from search results", {
      searchResultId,
      companyId,
      message,
    });

    await this.deps.searchRepository.deleteResult(searchResultId);

    return {
      crawled: 0,
      extracted: 0,
      enriched: 0,
      removed: 1,
      failed: 0,
      failures: [
        {
          companyId,
          stage: "REMOVED",
          message,
        },
      ],
    };
  }

  private async failJob(searchJobId: string, message: string): Promise<void> {
    await this.deps.searchRepository.updateJobStatus(searchJobId, SearchJobStatus.FAILED, {
      completedAt: new Date(),
      errorMessage: message,
    });
  }

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
    summary.removed += outcome.removed;
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
    removed: 0,
    skippedDuplicates: 0,
  };
}

function buildJobCompletionMessage(
  summary: SearchOrchestrationSummary,
  targetLimit: number | null,
): string | null {
  if (summary.enriched === 0) {
    return "No leads were fully processed";
  }

  const messages: string[] = [];

  if (targetLimit !== null && summary.enriched < targetLimit) {
    messages.push(
      `Only ${summary.enriched} of ${targetLimit} target leads were enriched; no more matching companies could be found.`,
    );
  }

  if (summary.removed > 0) {
    const label = summary.removed === 1 ? "company" : "companies";
    messages.push(
      `${summary.removed} ${label} could not be enriched and were excluded from results`,
    );
  }

  return messages.length > 0 ? messages.join(" ") : null;
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

export function createSearchOrchestrator(
  deps: SearchOrchestratorDependencies,
  options?: SearchOrchestratorOptions,
): SearchOrchestrator {
  return new SearchOrchestrator(deps, options);
}
