export const COMPANY_EXTRACTION_PROMPT_VERSION = "v1";

export interface CompanyExtractionInput {
  content: string;
  domain: string;
  companyId: string;
  sourceUrls?: string[];
  promptVersion?: string;
}

export interface ExtractedCompany {
  companyName: string;
  description: string;
  industry: string;
  products: string[];
  services: string[];
  targetCustomers: string[];
  estimatedCompanySize: string;
  city: string;
  country: string;
  decisionMaker: string;
  decisionMakerEmail: string | null;
  decisionMakerPhone: string | null;
  decisionMakerLinkedInUrl: string | null;
  linkedInUrl: string | null;
  xUrl: string | null;
  email: string | null;
  phone: string | null;
  revenue: string;
}

export interface ExtractionMeta {
  promptVersion: string;
  modelUsed: string;
  contentHash: string;
  extractedAt: string;
  completeness: number;
}

export interface ExtractedCompanyResult {
  profile: ExtractedCompany;
  meta: ExtractionMeta;
}

export const MAX_EXTRACTION_CONTENT_CHARS = 24_000;
export const MIN_EXTRACTION_CONTENT_CHARS = 100;
