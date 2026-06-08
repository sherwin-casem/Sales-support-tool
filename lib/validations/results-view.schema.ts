import { z } from "zod";

export const RESULTS_SORT_OPTIONS = [
  "score_desc",
  "score_asc",
  "company_asc",
  "company_desc",
  "rank_asc",
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
  "SCORING",
  "SCORE_FAILED",
  "SCORED",
] as const;

export const ResultsViewSchema = z.object({
  minScore: z.coerce.number().min(0).max(100).optional(),
  stage: z.enum(SEARCH_RESULT_STAGES).optional(),
  companyQuery: z.string().trim().optional(),
  sort: z.enum(RESULTS_SORT_OPTIONS).default("score_desc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export type ResultsViewState = z.output<typeof ResultsViewSchema>;
export type ResultsSortOption = (typeof RESULTS_SORT_OPTIONS)[number];

export const DEFAULT_RESULTS_VIEW: ResultsViewState = {
  sort: "score_desc",
  page: 1,
  pageSize: 10,
};
