export type SavedSearchOutreachStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

export interface SavedSearchRecord {
  id: string;
  userId: string;
  searchJobId: string;
  savedAt: Date;
}

export interface SavedSearchDetailRecord {
  id: string;
  userId: string;
  searchJobId: string;
  savedAt: Date;
  query: string;
  searchJobStatus: string;
  leadCount: number;
  outreachStatus: SavedSearchOutreachStatus;
}

export interface CreateSavedSearchInput {
  userId: string;
  searchJobId: string;
}

export interface RecipientOutreachSnapshot {
  status: string;
  campaignStatus: string;
}
