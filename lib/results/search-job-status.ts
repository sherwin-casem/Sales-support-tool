import type { SearchJobStatus } from "@prisma/client";
import { ACTIVE_SEARCH_JOB_STATUSES } from "@/lib/search/search-job-lifecycle.js";

export { ACTIVE_SEARCH_JOB_STATUSES };

export function isSearchJobActive(status: SearchJobStatus): boolean {
  return (ACTIVE_SEARCH_JOB_STATUSES as readonly SearchJobStatus[]).includes(status);
}

export function formatSearchJobStatus(status: SearchJobStatus): string {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
