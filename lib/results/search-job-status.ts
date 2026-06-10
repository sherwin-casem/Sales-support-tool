import { SearchJobStatus } from "@prisma/client";

export const ACTIVE_SEARCH_JOB_STATUSES: readonly SearchJobStatus[] = [
  SearchJobStatus.PENDING,
  SearchJobStatus.DISCOVERING,
  SearchJobStatus.CRAWLING,
  SearchJobStatus.EXTRACTING,
  SearchJobStatus.ENRICHING,
];

export function isSearchJobActive(status: SearchJobStatus): boolean {
  return ACTIVE_SEARCH_JOB_STATUSES.includes(status);
}

export function formatSearchJobStatus(status: SearchJobStatus): string {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
