import { describe, expect, it } from "vitest";
import type { SearchResultItemResponse } from "@/types/api/search.api.types";
import {
  filterResultsByCompanyQuery,
  paginateResults,
  processSearchResults,
  sortSearchResults,
} from "@/lib/display/process-search-results";

function createResult(
  searchResultId: string,
  company: SearchResultItemResponse["company"],
  rank: number | null = null,
): SearchResultItemResponse {
  return {
    searchResultId,
    rank,
    stage: "ENRICHED",
    stageError: null,
    discoveredAt: "2026-06-07T12:00:00.000Z",
    completedAt: null,
    company,
    profile: null,
    profileCompleteness: null,
  };
}

describe("process-search-results", () => {
  const results = [
    createResult(
      "1",
      {
        id: "c1",
        name: "Beta Logistics",
        domain: "beta.fi",
        websiteUrl: null,
      },
      2,
    ),
    createResult(
      "2",
      {
        id: "c2",
        name: "Acme Oy",
        domain: "acme.fi",
        websiteUrl: null,
      },
      1,
    ),
  ];

  it("filters results by company name or domain", () => {
    const filtered = filterResultsByCompanyQuery(results, "acme");

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.company.domain).toBe("acme.fi");
  });

  it("sorts results by company name ascending", () => {
    const sorted = sortSearchResults(results, "company_asc");

    expect(sorted.map((result) => result.searchResultId)).toEqual(["2", "1"]);
  });

  it("paginates results", () => {
    const page = paginateResults(results, 1, 1);

    expect(page.items).toHaveLength(1);
    expect(page.pagination.totalItems).toBe(2);
    expect(page.pagination.totalPages).toBe(2);
  });

  it("applies filter, sort, and pagination together", () => {
    const processed = processSearchResults(results, {
      sort: "company_asc",
      page: 1,
      pageSize: 10,
    });

    expect(processed.items.map((result) => result.company.name)).toEqual([
      "Acme Oy",
      "Beta Logistics",
    ]);
  });
});
