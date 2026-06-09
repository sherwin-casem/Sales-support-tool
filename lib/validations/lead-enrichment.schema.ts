import { z } from "zod";
import {
  EXTRACTED_COMPANY_JSON_SCHEMA,
  ExtractedCompanySchema,
} from "@/lib/validations/company-extraction.schema.js";

export const LeadEnrichmentInputSchema = z.object({
  companyName: z.string().trim().min(1).max(500),
  domain: z
    .string()
    .trim()
    .min(1)
    .max(253)
    .transform((value) => value.toLowerCase().replace(/^www\./, "")),
  website: z.string().trim().url().max(2048),
  websiteProfile: ExtractedCompanySchema,
  companyId: z.string().uuid("companyId must be a valid UUID"),
});

export const LeadEnrichmentResponseSchema = z.object({
  profile: ExtractedCompanySchema,
});

export const LEAD_ENRICHMENT_JSON_SCHEMA = {
  type: "object",
  properties: {
    profile: EXTRACTED_COMPANY_JSON_SCHEMA,
  },
  required: ["profile"],
  additionalProperties: false,
} as const;

export type LeadEnrichmentInputValidated = z.infer<typeof LeadEnrichmentInputSchema>;
