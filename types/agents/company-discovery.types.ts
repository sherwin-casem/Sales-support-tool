export interface CompanyDiscoveryInput {
  industry: string;
  location: string;
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

export interface LocationContext {
  location: string;
  city?: string;
  regionHint?: string;
  countryCode?: string;
  countryQid?: string;
  primaryTld?: string;
}

export interface DiscoveryCriteria {
  industry: string;
  location: string;
  locationContext: LocationContext;
  limit: number;
}
