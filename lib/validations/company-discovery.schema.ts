import { z } from "zod";

export const CompanyDiscoveryInputSchema = z.object({
  industry: z
    .string()
    .trim()
    .min(1, "industry must not be empty")
    .max(200, "industry must be at most 200 characters")
    .transform((value) => value.toLowerCase()),
  location: z
    .string()
    .trim()
    .min(1, "location must not be empty")
    .max(200, "location must be at most 200 characters"),
  limit: z.number().int().min(1).max(100).optional().default(25),
});

export const DiscoveredCompanySchema = z.object({
  companyName: z.string().min(1).max(500),
  website: z.string().url().max(2048),
});

export const DiscoveredCompanyListSchema = z.array(DiscoveredCompanySchema);

export type CompanyDiscoveryInputValidated = z.infer<
  typeof CompanyDiscoveryInputSchema
>;
