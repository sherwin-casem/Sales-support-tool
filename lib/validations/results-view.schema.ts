import { z } from "zod";

export const RESULTS_SORT_OPTIONS = [
  "company_asc",
  "company_desc",
  "rank_asc",
  "intent_desc",
] as const;

export const RESULTS_PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

export const SEARCH_RESULT_STAGES = [
  "DISCOVERED",
  "CRAWLING",
  "CRAWL_FAILED",
  "CRAWLED",
  "EXTRACTING",
  "EXTRACT_FAILED",
  "EXTRACTED",
  "ENRICHING",
  "ENRICH_FAILED",
  "ENRICHED",
] as const;

export const ResultsViewSchema = z.object({
  stage: z.enum(SEARCH_RESULT_STAGES).optional(),
  companyQuery: z.string().trim().optional(),
  sort: z.enum(RESULTS_SORT_OPTIONS).default("company_asc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export type ResultsViewState = z.output<typeof ResultsViewSchema>;
export type ResultsSortOption = (typeof RESULTS_SORT_OPTIONS)[number];

export const DEFAULT_RESULTS_VIEW: ResultsViewState = {
  sort: "company_asc",
  page: 1,
  pageSize: 10,
};
