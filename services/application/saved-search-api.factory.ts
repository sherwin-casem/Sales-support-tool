import { getSavedSearchRepository } from "@/repositories/prisma/saved-search.repository.js";
import { getSearchRepository } from "@/repositories/prisma/search.repository.js";
import {
  createSavedSearchApiService,
  type SavedSearchApiService,
} from "@/services/application/saved-search-api.service.js";

let cachedService: SavedSearchApiService | undefined;

export function getSavedSearchApiService(): SavedSearchApiService {
  if (!cachedService) {
    cachedService = createSavedSearchApiService({
      savedSearchRepository: getSavedSearchRepository(),
      searchRepository: getSearchRepository(),
    });
  }

  return cachedService;
}

export function resetSavedSearchApiServiceCache(): void {
  cachedService = undefined;
}
