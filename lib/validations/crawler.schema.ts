import { z } from "zod";
import { ALL_CRAWL_PATHS } from "@/types/crawler/crawler.types.js";

export const CrawlPathSchema = z.enum(ALL_CRAWL_PATHS);

export const CrawlCompanyInputSchema = z.object({
  companyId: z.string().uuid("companyId must be a valid UUID"),
  website: z.string().url("website must be a valid URL").max(2048),
  normalizedDomain: z
    .string()
    .min(1)
    .max(253)
    .transform((value) => value.toLowerCase().replace(/^www\./, "")),
  paths: z.array(CrawlPathSchema).min(1).optional(),
});

export const CrawledPageSchema = z.object({
  path: CrawlPathSchema,
  url: z.string().url(),
  httpStatus: z.number().int().nullable(),
  title: z.string().nullable(),
  contentText: z.string().max(50_000),
  html: z.string().max(500_000),
  crawledAt: z.string().datetime(),
  error: z.string().optional(),
});

export const CrawlCompanyResultSchema = z.object({
  companyId: z.string().uuid(),
  domain: z.string().min(1),
  baseUrl: z.string().url(),
  pages: z.array(CrawledPageSchema),
  status: z.enum(["success", "partial", "failed"]),
  pagesSucceeded: z.number().int().min(0),
  pagesAttempted: z.number().int().min(0),
  durationMs: z.number().int().min(0),
});

export type CrawlCompanyInputValidated = z.infer<typeof CrawlCompanyInputSchema>;

export function parseCrawlCompanyResult(
  value: unknown,
): z.SafeParseReturnType<unknown, z.infer<typeof CrawlCompanyResultSchema>> {
  return CrawlCompanyResultSchema.safeParse(value);
}
