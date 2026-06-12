import { apiLogger } from "@/lib/logging/logger.js";
import { ApiError } from "@/lib/api/api-error.js";
import {
  mapCreateSearchResponse,
  mapGetSearchResponse,
} from "@/lib/api/api-mappers.js";
import { getSecurityConfig } from "@/lib/config/security.config.js";
import type { CreateSearchRequestInput, GetSearchQueryInput } from "@/lib/validations/api/search.schema.js";
import type { StaleSearchJobCleanupService } from "@/services/application/stale-search-job-cleanup.service.js";
import type { SearchOrchestrator } from "@/services/application/search-orchestrator.service.js";
import type { SearchRepository } from "@/repositories/interfaces/search.repository.interface.js";
import type { LeadRepository } from "@/repositories/interfaces/lead.repository.interface.js";
import type { CreateSearchResponse, GetSearchResponse } from "@/types/api/search.api.types.js";

export type BackgroundTaskScheduler = (task: () => void | Promise<void>) => void;

export interface SearchApiServiceDependencies {
  searchRepository: SearchRepository;
  leadRepository: LeadRepository;
  searchOrchestrator: SearchOrchestrator;
  staleSearchJobCleanup: StaleSearchJobCleanupService;
  scheduleBackgroundTask?: BackgroundTaskScheduler;
}

export class SearchApiService {
  constructor(private readonly deps: SearchApiServiceDependencies) {}

  async createSearch(
    userId: string,
    input: CreateSearchRequestInput,
  ): Promise<CreateSearchResponse> {
    await this.deps.staleSearchJobCleanup.cleanup({ userId });

    const security = getSecurityConfig();
    const activeJobs = await this.deps.searchRepository.countActiveJobsForUser(userId);

    if (activeJobs >= security.API_MAX_CONCURRENT_SEARCHES) {
      throw ApiError.rateLimited(
        `Maximum ${security.API_MAX_CONCURRENT_SEARCHES} concurrent searches allowed`,
      );
    }

    const job = await this.deps.searchRepository.createJob({
      userId,
      query: input.query,
      companyLimit: input.companyLimit,
    });

    apiLogger.info("Search job accepted", {
      searchJobId: job.id,
      userId,
      companyLimit: job.companyLimit,
    });

    this.scheduleBackgroundTask(() => {
      void this.runSearchInBackground(userId, job.id, input);
    });

    return mapCreateSearchResponse(job);
  }

  async getSearch(
    userId: string,
    searchJobId: string,
    query: GetSearchQueryInput,
  ): Promise<GetSearchResponse> {
    const job = await this.deps.searchRepository.findJobByIdForUser(searchJobId, userId);

    if (!job) {
      throw ApiError.notFound(`Search job not found: ${searchJobId}`);
    }

    const [rankedResults, stageCounts] = await Promise.all([
      this.deps.leadRepository.findResultsWithDetailsForJob(searchJobId, {
        stage: query.stage,
      }),
      this.deps.searchRepository.countResultsByStage(searchJobId),
    ]);

    return mapGetSearchResponse(job, rankedResults, stageCounts, {
      includeFailures: query.includeFailures,
    });
  }

  private scheduleBackgroundTask(task: () => void | Promise<void>): void {
    const scheduler =
      this.deps.scheduleBackgroundTask ??
      ((backgroundTask: () => void | Promise<void>) => {
        void backgroundTask();
      });

    scheduler(task);
  }

  private async runSearchInBackground(
    userId: string,
    searchJobId: string,
    input: CreateSearchRequestInput,
  ): Promise<void> {
    try {
      const result = await this.deps.searchOrchestrator.run({
        userId,
        query: input.query,
        companyLimit: input.companyLimit,
        searchJobId,
      });

      if (!result.ok) {
        apiLogger.error("Background search orchestration failed", {
          searchJobId,
          userId,
          code: result.error.code,
          message: result.error.message,
        });
      }
    } catch (error) {
      apiLogger.error("Background search orchestration crashed", {
        searchJobId,
        userId,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}

export function createSearchApiService(
  deps: SearchApiServiceDependencies,
): SearchApiService {
  return new SearchApiService(deps);
}
