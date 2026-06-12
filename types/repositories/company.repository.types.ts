import type { ExtractedCompany } from "@/types/agents/company-extraction.types.js";

export interface CompanyRecord {
  id: string;
  domain: string;
  normalizedDomain: string;
  name: string | null;
  websiteUrl: string | null;
  firstSeenAt: Date;
  lastCrawledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CompanyProfileRecord {
  id: string;
  companyId: string;
  version: number;
  structuredData: ExtractedCompany;
  completeness: number | null;
  modelUsed: string | null;
  promptVersion: string | null;
  contentHash: string | null;
  extractedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpsertCompanyInput {
  website: string;
  name?: string | null;
}

export interface SaveCompanyProfileInput {
  companyId: string;
  structuredData: ExtractedCompany;
  completeness?: number;
  modelUsed?: string;
  promptVersion?: string;
  contentHash?: string;
  extractedAt?: Date;
}

export interface UpsertCompaniesResult {
  companies: CompanyRecord[];
  createdCount: number;
  updatedCount: number;
}

export interface SaveCompanyProfileResult {
  profile: CompanyProfileRecord;
  created: boolean;
}

export interface ListCompaniesForUserOptions {
  userId: string;
  page: number;
  pageSize: number;
  industry?: string;
  domain?: string;
  sort: "name" | "domain" | "lastCrawledAt" | "updatedAt";
  order: "asc" | "desc";
}

export interface CompanyListItemRecord extends CompanyRecord {
  latestProfile: {
    industry: string | null;
    estimatedCompanySize: string | null;
    completeness: number | null;
    extractedAt: Date | null;
  } | null;
}

export interface ListCompaniesForUserResult {
  items: CompanyListItemRecord[];
  totalItems: number;
}

export interface CompanySearchAppearanceRecord {
  searchJobId: string;
  searchResultId: string;
  query: string;
  stage: import("@prisma/client").SearchResultStage;
  rank: number | null;
  searchedAt: Date;
}

export interface IntentSignalDetailRecord {
  id: string;
  type: string;
  title: string;
  summary: string;
  sourceUrl: string | null;
  confidence: number;
  detectedAt: Date;
}

export interface CompanyDetailRecord extends CompanyRecord {
  intentScore?: number | null;
  intentUpdatedAt?: Date | null;
  intentSignals?: IntentSignalDetailRecord[];
  profile: CompanyProfileRecord | null;
  profileHistory: Array<{
    version: number;
    completeness: number | null;
    extractedAt: Date;
    contentHash: string | null;
  }>;
  recentSearches: CompanySearchAppearanceRecord[];
}
