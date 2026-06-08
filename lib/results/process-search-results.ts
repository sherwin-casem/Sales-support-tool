import type { SearchResultItemResponse } from "@/types/api/search.api.types";
import type { PaginationMeta } from "@/types/api/pagination.api.types";
import type { ResultsSortOption, ResultsViewState } from "@/lib/validations/results-view.schema";
import { buildPaginationMeta } from "@/lib/api/request-utils";

export function filterResultsByCompanyQuery(
  results: SearchResultItemResponse[],
  companyQuery?: string,
): SearchResultItemResponse[] {
  const normalized = companyQuery?.trim().toLowerCase();

  if (!normalized) {
    return results;
  }

  return results.filter((result) => {
    const name = result.company.name?.toLowerCase() ?? "";
    const domain = result.company.domain.toLowerCase();

    return name.includes(normalized) || domain.includes(normalized);
  });
}

export function sortSearchResults(
  results: SearchResultItemResponse[],
  sort: ResultsSortOption,
): SearchResultItemResponse[] {
  const sorted = [...results];

  sorted.sort((left, right) => {
    switch (sort) {
      case "score_asc":
        return compareScores(left, right, "asc");
      case "score_desc":
        return compareScores(left, right, "desc");
      case "company_asc":
        return compareCompanyNames(left, right, "asc");
      case "company_desc":
        return compareCompanyNames(left, right, "desc");
      case "rank_asc":
        return compareRanks(left, right);
      default:
        return 0;
    }
  });

  return sorted;
}

export function paginateResults<T>(
  items: T[],
  page: number,
  pageSize: number,
): { items: T[]; pagination: PaginationMeta } {
  const totalItems = items.length;
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / pageSize);
  const safePage = totalPages === 0 ? 1 : Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    pagination: buildPaginationMeta(safePage, pageSize, totalItems),
  };
}

export function processSearchResults(
  results: SearchResultItemResponse[],
  view: ResultsViewState,
): { items: SearchResultItemResponse[]; pagination: PaginationMeta } {
  const filtered = filterResultsByCompanyQuery(results, view.companyQuery);
  const sorted = sortSearchResults(filtered, view.sort);

  return paginateResults(sorted, view.page, view.pageSize);
}

function compareScores(
  left: SearchResultItemResponse,
  right: SearchResultItemResponse,
  direction: "asc" | "desc",
): number {
  const leftScore = left.leadScore?.score ?? -1;
  const rightScore = right.leadScore?.score ?? -1;
  const delta = leftScore - rightScore;

  return direction === "asc" ? delta : -delta;
}

function compareCompanyNames(
  left: SearchResultItemResponse,
  right: SearchResultItemResponse,
  direction: "asc" | "desc",
): number {
  const leftName = (left.company.name ?? left.company.domain).toLowerCase();
  const rightName = (right.company.name ?? right.company.domain).toLowerCase();
  const delta = leftName.localeCompare(rightName);

  return direction === "asc" ? delta : -delta;
}

function compareRanks(
  left: SearchResultItemResponse,
  right: SearchResultItemResponse,
): number {
  const leftRank = left.rank ?? Number.MAX_SAFE_INTEGER;
  const rightRank = right.rank ?? Number.MAX_SAFE_INTEGER;

  return leftRank - rightRank;
}
