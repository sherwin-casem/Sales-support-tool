export const COMPANY_DISCOVERY_PROMPT_VERSION = "v1";

export interface CompanyDiscoveryInput {
  query: string;
  industry?: string;
  location?: string;
  limit?: number;
}

export interface DiscoveredCompany {
  companyName: string;
  website: string;
}

export interface RawDiscoveryCandidate {
  companyName: string;
  website: string;
  source: string;
  confidence: number;
}
