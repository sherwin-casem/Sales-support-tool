import { SearchJobStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  ACTIVE_SEARCH_JOB_STATUSES,
  isSearchJobActive,
} from "@/lib/results/search-job-status.js";

describe("search-job-status", () => {
  it("treats enriching jobs as active", () => {
    expect(ACTIVE_SEARCH_JOB_STATUSES).toContain(SearchJobStatus.ENRICHING);
    expect(isSearchJobActive(SearchJobStatus.ENRICHING)).toBe(true);
  });

  it("does not treat completed or failed jobs as active", () => {
    expect(isSearchJobActive(SearchJobStatus.COMPLETED)).toBe(false);
    expect(isSearchJobActive(SearchJobStatus.FAILED)).toBe(false);
  });
});
