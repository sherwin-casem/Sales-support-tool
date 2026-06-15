import { ApiError } from "@/lib/api/api-error.js";
import { mapSavedSearchItem } from "@/lib/api/api-mappers.js";
import type { SaveSavedSearchInput } from "@/lib/validations/api/saved-search.schema.js";
import type { SavedSearchRepository } from "@/repositories/interfaces/saved-search.repository.interface.js";
import type { SearchRepository } from "@/repositories/interfaces/search.repository.interface.js";
import type {
  DeleteSavedSearchResponse,
  ListSavedSearchesResponse,
  SaveSavedSearchResponse,
} from "@/types/api/saved-search.api.types.js";
import type { AuthenticatedUser } from "@/types/auth/session.types.js";

export interface SavedSearchApiServiceDependencies {
  savedSearchRepository: SavedSearchRepository;
  searchRepository: SearchRepository;
}

export class SavedSearchApiService {
  constructor(private readonly deps: SavedSearchApiServiceDependencies) {}

  async listSavedSearches(user: AuthenticatedUser): Promise<ListSavedSearchesResponse> {
    const records = await this.deps.savedSearchRepository.listForUser(user.id);

    return {
      data: records.map(mapSavedSearchItem),
    };
  }

  async saveSavedSearch(
    user: AuthenticatedUser,
    input: SaveSavedSearchInput,
  ): Promise<SaveSavedSearchResponse> {
    const job = await this.deps.searchRepository.findJobByIdForUser(input.searchJobId, user.id);

    if (!job) {
      throw ApiError.notFound(`Search job not found: ${input.searchJobId}`);
    }

    if (job.status !== "COMPLETED") {
      throw ApiError.validationError("Only completed searches can be saved.");
    }

    const saved = await this.deps.savedSearchRepository.upsert({
      userId: user.id,
      searchJobId: input.searchJobId,
    });

    return {
      id: saved.id,
      searchJobId: saved.searchJobId,
      savedAt: saved.savedAt.toISOString(),
    };
  }

  async deleteSavedSearch(
    user: AuthenticatedUser,
    savedSearchId: string,
  ): Promise<DeleteSavedSearchResponse> {
    const deleted = await this.deps.savedSearchRepository.deleteByIdForUser(
      user.id,
      savedSearchId,
    );

    if (!deleted) {
      throw ApiError.notFound(`Saved search not found: ${savedSearchId}`);
    }

    return { deletedCount: 1 };
  }
}

export function createSavedSearchApiService(
  deps: SavedSearchApiServiceDependencies,
): SavedSearchApiService {
  return new SavedSearchApiService(deps);
}
