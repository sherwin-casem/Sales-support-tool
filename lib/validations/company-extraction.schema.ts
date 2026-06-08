import { z } from "zod";
import { EMPLOYEE_RANGE_PATTERN } from "@/lib/validations/query-parser.schema.js";

function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = value.trim();
    const key = normalized.toLowerCase();

    if (!normalized || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(normalized);
  }

  return result;
}

const stringArray = (field: string) =>
  z
    .array(z.string().min(1).max(200))
    .max(20)
    .transform(dedupeStrings)
    .default([]);

export const ExtractedCompanySchema = z.object({
  companyName: z.string().trim().min(1, "companyName is required").max(500),
  description: z.string().trim().min(1, "description is required").max(2000),
  industry: z
    .string()
    .trim()
    .min(1, "industry is required")
    .max(200)
    .transform((value) => value.toLowerCase()),
  products: stringArray("products"),
  services: stringArray("services"),
  targetCustomers: stringArray("targetCustomers"),
  estimatedCompanySize: z
    .string()
    .trim()
    .min(1, "estimatedCompanySize is required")
    .max(50)
    .transform((value) => value.toLowerCase())
    .refine(
      (value) => EMPLOYEE_RANGE_PATTERN.test(value),
      "estimatedCompanySize must match 50-200, 100+, or unknown",
    ),
});

export type ExtractedCompanyOutput = z.infer<typeof ExtractedCompanySchema>;

export const CompanyExtractionInputSchema = z.object({
  content: z
    .string()
    .trim()
    .min(100, "content must be at least 100 characters")
    .max(24_000, "content must be at most 24000 characters"),
  domain: z
    .string()
    .trim()
    .min(1)
    .max(253)
    .transform((value) => value.toLowerCase().replace(/^www\./, "")),
  companyId: z.string().uuid("companyId must be a valid UUID"),
  sourceUrls: z.array(z.string().url()).max(10).optional(),
  promptVersion: z.string().min(1).max(20).optional(),
});

export const EXTRACTED_COMPANY_JSON_SCHEMA = {
  type: "object",
  properties: {
    companyName: {
      type: "string",
      description: "Official company name as shown on the website",
    },
    description: {
      type: "string",
      description: "1-3 sentence summary of what the company does",
    },
    industry: {
      type: "string",
      description: "Primary industry or sector in lowercase",
    },
    products: {
      type: "array",
      items: { type: "string" },
      description: "Named products offered; empty array if none found",
    },
    services: {
      type: "array",
      items: { type: "string" },
      description: "Named services offered; empty array if none found",
    },
    targetCustomers: {
      type: "array",
      items: { type: "string" },
      description: "Customer segments or ICP hints; empty array if unknown",
    },
    estimatedCompanySize: {
      type: "string",
      description: "Employee range N-M, N+, or unknown",
    },
  },
  required: [
    "companyName",
    "description",
    "industry",
    "products",
    "services",
    "targetCustomers",
    "estimatedCompanySize",
  ],
  additionalProperties: false,
} as const;

export function computeExtractionCompleteness(profile: ExtractedCompanyOutput): number {
  let score = 0;
  const weights = {
    companyName: 0.15,
    description: 0.15,
    industry: 0.15,
    products: 0.15,
    services: 0.15,
    targetCustomers: 0.15,
    estimatedCompanySize: 0.1,
  };

  if (profile.companyName) score += weights.companyName;
  if (profile.description.length >= 20) score += weights.description;
  if (profile.industry && profile.industry !== "unknown") score += weights.industry;
  if (profile.products.length > 0) score += weights.products;
  if (profile.services.length > 0) score += weights.services;
  if (profile.targetCustomers.length > 0) score += weights.targetCustomers;
  if (profile.estimatedCompanySize !== "unknown") score += weights.estimatedCompanySize;

  return Math.round(score * 1000) / 1000;
}
