import type { SavedSearchOutreachStatus } from "@/types/repositories/saved-search.repository.types.js";

export interface SavedSearchItemResponse {
  id: string;
  searchJobId: string;
  query: string;
  savedAt: string;
  leadCount: number;
  outreachStatus: SavedSearchOutreachStatus;
}

export interface ListSavedSearchesResponse {
  data: SavedSearchItemResponse[];
}

export interface SaveSavedSearchResponse {
  id: string;
  searchJobId: string;
  savedAt: string;
}

export interface DeleteSavedSearchResponse {
  deletedCount: number;
}
