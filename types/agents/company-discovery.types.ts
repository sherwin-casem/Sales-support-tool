export const COMPANY_DISCOVERY_PROMPT_VERSION = "v1";

export interface CompanyDiscoveryInput {
  query: string;
  industry?: string;
  location?: string;
  /** When omitted, discovery runs without a cap and aims for all matches. */
  limit?: number;
  /** Domains or URLs already found — used to request additional matches in later rounds. */
  excludedWebsites?: string[];
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
