import type { ExtractedCompany } from "@/types/agents/company-extraction.types.js";

export const LEAD_ENRICHMENT_PROMPT_VERSION = "v1";

export interface LeadEnrichmentInput {
  companyName: string;
  domain: string;
  website: string;
  websiteProfile: ExtractedCompany;
  companyId: string;
}

export interface LeadEnrichmentMeta {
  promptVersion: string;
  modelUsed: string;
  enrichedAt: string;
}

export interface LeadEnrichmentResult {
  profile: ExtractedCompany;
  meta: LeadEnrichmentMeta;
}
