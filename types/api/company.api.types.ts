import type { SearchResultStage } from "@prisma/client";
import type { ExtractedCompany } from "@/types/agents/company-extraction.types.js";
import type { PaginationMeta } from "@/types/api/pagination.api.types.js";

export interface ListCompaniesQuery {
  page?: number;
  pageSize?: number;
  industry?: string;
  domain?: string;
  sort?: "name" | "domain" | "lastCrawledAt" | "updatedAt";
  order?: "asc" | "desc";
}

export interface CompanyProfileSummaryResponse {
  industry: string | null;
  estimatedCompanySize: string | null;
  completeness: number | null;
  extractedAt: string | null;
}

export interface CompanyListItemResponse {
  id: string;
  name: string | null;
  domain: string;
  websiteUrl: string | null;
  lastCrawledAt: string | null;
  firstSeenAt: string;
  updatedAt: string;
  latestProfile: CompanyProfileSummaryResponse | null;
}

export interface ListCompaniesResponse {
  data: CompanyListItemResponse[];
  pagination: PaginationMeta;
}

export interface CompanyProfileDetailResponse {
  id: string;
  version: number;
  data: ExtractedCompany;
  completeness: number | null;
  modelUsed: string | null;
  promptVersion: string | null;
  contentHash: string | null;
  extractedAt: string;
}

export interface ProfileVersionSummaryResponse {
  version: number;
  completeness: number | null;
  extractedAt: string;
  contentHash: string | null;
}

export interface CompanySearchAppearanceResponse {
  searchJobId: string;
  searchResultId: string;
  query: string;
  stage: SearchResultStage;
  rank: number | null;
  searchedAt: string;
}

export interface GetCompanyResponse {
  id: string;
  name: string | null;
  domain: string;
  normalizedDomain: string;
  websiteUrl: string | null;
  firstSeenAt: string;
  lastCrawledAt: string | null;
  createdAt: string;
  updatedAt: string;
  profile: CompanyProfileDetailResponse | null;
  profileHistory: ProfileVersionSummaryResponse[];
  recentSearches: CompanySearchAppearanceResponse[];
}
