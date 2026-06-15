import { SearchJobStatus } from "@prisma/client";

export class SearchJobControlSignal extends Error {
  readonly targetStatus: typeof SearchJobStatus.CANCELLED;

  constructor() {
    super("Search job cancelled");
    this.name = "SearchJobControlSignal";
    this.targetStatus = SearchJobStatus.CANCELLED;
  }
}

export function isSearchJobCancelled(status: SearchJobStatus): boolean {
  return status === SearchJobStatus.CANCELLED;
}
