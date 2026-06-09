import { SearchJobStatus } from "@prisma/client";

export const ACTIVE_SEARCH_JOB_STATUSES = [
  SearchJobStatus.PENDING,
  SearchJobStatus.DISCOVERING,
  SearchJobStatus.CRAWLING,
  SearchJobStatus.EXTRACTING,
  SearchJobStatus.SCORING,
] as const;

export const STALE_SEARCH_JOB_ERROR_MESSAGE =
  "Search timed out or was interrupted. Start a new search.";
