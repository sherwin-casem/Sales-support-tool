import { z } from "zod";
import {
  validateEmail,
  validatePhone,
} from "@/lib/validations/lead-contact.validation.js";
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

const unknownString = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .transform((value) => value.toLowerCase())
  .default("unknown");

const nullableUrl = z
  .union([z.string().trim().url(), z.null()])
  .optional()
  .default(null);

const nullableEmail = z
  .union([z.string(), z.null()])
  .optional()
  .default(null)
  .transform(validateEmail);

const nullablePhone = z
  .union([z.string(), z.null()])
  .optional()
  .default(null)
  .transform(validatePhone);

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
  city: unknownString,
  country: unknownString,
  decisionMaker: z
    .string()
    .trim()
    .min(1, "decisionMaker is required")
    .max(500)
    .default("unknown"),
  decisionMakerEmail: nullableEmail,
  decisionMakerPhone: nullablePhone,
  decisionMakerLinkedInUrl: nullableUrl,
  linkedInUrl: nullableUrl,
  xUrl: nullableUrl,
  email: nullableEmail,
  phone: nullablePhone,
  revenue: z
    .string()
    .trim()
    .min(1, "revenue is required")
    .max(200)
    .default("unknown"),
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
    city: {
      type: "string",
      description: "Headquarters or primary city in lowercase; unknown if not found",
    },
    country: {
      type: "string",
      description: "Country in lowercase English; unknown if not found",
    },
    decisionMaker: {
      type: "string",
      description: "Named executive or decision maker with title if found; unknown if not found",
    },
    decisionMakerEmail: {
      type: ["string", "null"],
      description: "Decision maker direct email if found; null otherwise",
    },
    decisionMakerPhone: {
      type: ["string", "null"],
      description: "Decision maker direct phone number if found; null otherwise",
    },
    decisionMakerLinkedInUrl: {
      type: ["string", "null"],
      description: "Decision maker personal LinkedIn profile URL if found; null otherwise",
    },
    linkedInUrl: {
      type: ["string", "null"],
      description: "LinkedIn company or profile URL if found on the website; null otherwise",
    },
    xUrl: {
      type: ["string", "null"],
      description: "X (Twitter) profile URL if found on the website; null otherwise",
    },
    email: {
      type: ["string", "null"],
      description: "Public contact email if found on the website; null otherwise",
    },
    phone: {
      type: ["string", "null"],
      description: "Public company phone number if found on the website; null otherwise",
    },
    revenue: {
      type: "string",
      description: "Revenue range or figure with currency if stated; unknown if not found",
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
    "city",
    "country",
    "decisionMaker",
    "decisionMakerEmail",
    "decisionMakerPhone",
    "decisionMakerLinkedInUrl",
    "linkedInUrl",
    "xUrl",
    "email",
    "phone",
    "revenue",
  ],
  additionalProperties: false,
} as const;

export function computeExtractionCompleteness(profile: ExtractedCompanyOutput): number {
  let score = 0;
  const weights = {
    companyName: 0.09,
    description: 0.09,
    industry: 0.09,
    products: 0.07,
    services: 0.07,
    targetCustomers: 0.07,
    estimatedCompanySize: 0.08,
    city: 0.06,
    country: 0.06,
    decisionMaker: 0.08,
    decisionMakerEmail: 0.03,
    decisionMakerPhone: 0.03,
    decisionMakerLinkedInUrl: 0.03,
    linkedInUrl: 0.05,
    xUrl: 0.03,
    email: 0.05,
    phone: 0.03,
    revenue: 0.08,
  };

  if (profile.companyName) score += weights.companyName;
  if (profile.description.length >= 20) score += weights.description;
  if (profile.industry && profile.industry !== "unknown") score += weights.industry;
  if (profile.products.length > 0) score += weights.products;
  if (profile.services.length > 0) score += weights.services;
  if (profile.targetCustomers.length > 0) score += weights.targetCustomers;
  if (profile.estimatedCompanySize !== "unknown") score += weights.estimatedCompanySize;
  if (profile.city !== "unknown") score += weights.city;
  if (profile.country !== "unknown") score += weights.country;
  if (profile.decisionMaker !== "unknown") score += weights.decisionMaker;
  if (profile.decisionMakerEmail) score += weights.decisionMakerEmail;
  if (profile.decisionMakerPhone) score += weights.decisionMakerPhone;
  if (profile.decisionMakerLinkedInUrl) score += weights.decisionMakerLinkedInUrl;
  if (profile.linkedInUrl) score += weights.linkedInUrl;
  if (profile.xUrl) score += weights.xUrl;
  if (profile.email) score += weights.email;
  if (profile.phone) score += weights.phone;
  if (profile.revenue !== "unknown") score += weights.revenue;

  return Math.round(score * 1000) / 1000;
}
