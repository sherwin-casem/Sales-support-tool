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
  minScore: z.coerce.number().min(0).max(100).optional(),
  stage: z
    .enum([
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
