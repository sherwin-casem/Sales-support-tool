import type { ParsedQuery } from "@/types/agents/query-parser.types.js";
import type { SearchJobStatus, SearchResultStage } from "@prisma/client";
import type { CompanyRecord } from "@/types/repositories/company.repository.types.js";

export interface SearchJobRecord {
  id: string;
  userId: string;
  query: string;
  criteria: ParsedQuery | Record<string, unknown>;
  status: SearchJobStatus;
  companyLimit: number | null;
  errorMessage: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SearchResultRecord {
  id: string;
  searchJobId: string;
  companyId: string;
  stage: SearchResultStage;
  rank: number | null;
  discoverySource: string | null;
  discoveryUrl: string | null;
  stageError: string | null;
  discoveredAt: Date;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSearchJobInput {
  userId: string;
  query: string;
  criteria?: ParsedQuery | Record<string, unknown>;
  companyLimit?: number | null;
}

export interface DiscoveredCompanyInput {
  companyName: string;
  website: string;
  discoverySource?: string;
  discoveryUrl?: string;
  rank?: number;
}

export interface AddDiscoveredCompaniesResult {
  companies: CompanyRecord[];
  searchResults: SearchResultRecord[];
  skippedDuplicates: number;
}

export interface UpdateSearchResultStageInput {
  searchResultId: string;
  stage: SearchResultStage;
  stageError?: string | null;
  completedAt?: Date | null;
}

export interface FailStaleSearchJobsInput {
  pendingStaleBefore: Date;
  activeStaleBefore: Date;
  errorMessage: string;
  userId?: string;
}
