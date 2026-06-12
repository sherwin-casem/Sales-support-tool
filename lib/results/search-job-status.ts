import type { SearchJobStatus } from "@prisma/client";

// String literals (with a type-only Prisma import) keep @prisma/client out of
// the client bundle; this module is shared by browser components.
export const ACTIVE_SEARCH_JOB_STATUSES: readonly SearchJobStatus[] = [
  "PENDING",
  "DISCOVERING",
  "CRAWLING",
  "EXTRACTING",
  "ENRICHING",
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
