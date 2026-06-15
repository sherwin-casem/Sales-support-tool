import type { DbClient } from "@/lib/db/db-client.types.js";
import type {
  CreateSavedSearchInput,
  SavedSearchDetailRecord,
  SavedSearchRecord,
} from "@/types/repositories/saved-search.repository.types.js";

export interface SavedSearchRepository {
  findByIdForUser(
    userId: string,
    savedSearchId: string,
    tx?: DbClient,
  ): Promise<SavedSearchRecord | null>;
  findBySearchJobIdForUser(
    userId: string,
    searchJobId: string,
    tx?: DbClient,
  ): Promise<SavedSearchRecord | null>;
  listForUser(userId: string, tx?: DbClient): Promise<SavedSearchDetailRecord[]>;
  upsert(input: CreateSavedSearchInput, tx?: DbClient): Promise<SavedSearchRecord>;
  deleteByIdForUser(userId: string, savedSearchId: string, tx?: DbClient): Promise<boolean>;
}
