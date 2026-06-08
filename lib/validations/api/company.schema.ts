import { z } from "zod";

export const CompanyIdParamsSchema = z.object({
  id: z.string().uuid("id must be a valid UUID"),
});

export const ListCompaniesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  industry: z.string().trim().min(1).max(200).optional(),
  domain: z.string().trim().min(1).max(253).optional(),
  sort: z.enum(["name", "domain", "lastCrawledAt", "updatedAt"]).default("updatedAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type ListCompaniesQueryInput = z.output<typeof ListCompaniesQuerySchema>;
