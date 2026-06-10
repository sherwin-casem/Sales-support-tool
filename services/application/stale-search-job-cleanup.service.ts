import { getSearchJobConfig } from "@/lib/config/search-job.config.js";
import { apiLogger } from "@/lib/logging/logger.js";
import { getSearchRepository } from "@/repositories/prisma/search.repository.js";
import type { SearchRepository } from "@/repositories/interfaces/search.repository.interface.js";

export const STALE_SEARCH_JOB_ERROR_MESSAGE =
  "Search timed out or was interrupted. Start a new search.";

export interface StaleSearchJobCleanupResult {
  failedJobIds: string[];
}

export class StaleSearchJobCleanupService {
  constructor(private readonly searchRepository: SearchRepository) {}

  async cleanup(options?: { userId?: string }): Promise<StaleSearchJobCleanupResult> {
    const config = getSearchJobConfig();
    const now = Date.now();
    const failedJobs = await this.searchRepository.failStaleJobs({
      userId: options?.userId,
      pendingStaleBefore: new Date(now - config.SEARCH_JOB_PENDING_STALE_MS),
      activeStaleBefore: new Date(now - config.SEARCH_JOB_ACTIVE_STALE_MS),
      errorMessage: STALE_SEARCH_JOB_ERROR_MESSAGE,
    });

    if (failedJobs.length > 0) {
      apiLogger.info("Stale search jobs cleaned up", {
        count: failedJobs.length,
        userId: options?.userId,
        jobIds: failedJobs.map((job) => job.id),
      });
    }

    return {
      failedJobIds: failedJobs.map((job) => job.id),
    };
  }
}

let cachedService: StaleSearchJobCleanupService | undefined;

export function createStaleSearchJobCleanupService(
  searchRepository: SearchRepository,
): StaleSearchJobCleanupService {
  return new StaleSearchJobCleanupService(searchRepository);
}

export function getStaleSearchJobCleanupService(): StaleSearchJobCleanupService {
  if (!cachedService) {
    cachedService = createStaleSearchJobCleanupService(getSearchRepository());
  }

  return cachedService;
}

export function resetStaleSearchJobCleanupServiceCache(): void {
  cachedService = undefined;
}
