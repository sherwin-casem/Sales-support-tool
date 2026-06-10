import { z } from "zod";
import { ParsedQuerySchema } from "@/lib/validations/query-parser.schema.js";

export const CreateSearchRequestSchema = z.object({
  query: z.string().trim().min(1, "query must not be empty").max(500),
  companyLimit: z.number().int().min(1).max(100).optional(),
});

export const SearchIdParamsSchema = z.object({
  id: z.string().uuid("id must be a valid UUID"),
});

export const GetSearchQuerySchema = z.object({
  stage: z
    .enum([
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
    ])
    .optional(),
  includeFailures: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value !== "false"),
});

export const ParsedCriteriaResponseSchema = ParsedQuerySchema;

export type CreateSearchRequestInput = z.infer<typeof CreateSearchRequestSchema>;
export type GetSearchQueryInput = z.output<typeof GetSearchQuerySchema>;
