import type { SearchJobStatus, SearchResultStage } from "@prisma/client";
import type { ParsedQuery } from "@/types/agents/query-parser.types.js";
import type { ExtractedCompany } from "@/types/agents/company-extraction.types.js";
import type { ScoreBreakdown } from "@/types/agents/lead-scoring.types.js";

export interface CreateSearchRequest {
  query: string;
  companyLimit?: number;
}

export interface CreateSearchResponse {
  id: string;
  status: SearchJobStatus;
  query: string;
  companyLimit: number;
  createdAt: string;
  links: {
    self: string;
  };
}

export interface SearchSummaryResponse {
  discovered: number;
  crawled: number;
  extracted: number;
  enriched: number;
  failed: number;
  skippedDuplicates: number;
}

export interface CompanySummaryResponse {
  id: string;
  name: string | null;
  domain: string;
  websiteUrl: string | null;
}

export interface LeadScoreSummaryResponse {
  score: number;
  confidence: number;
  explanation: string;
  breakdown: ScoreBreakdown;
  scoredAt: string;
}

export interface SearchResultItemResponse {
  searchResultId: string;
  rank: number | null;
  stage: SearchResultStage;
  stageError: string | null;
  discoveredAt: string;
  completedAt: string | null;
  company: CompanySummaryResponse;
  profile: ExtractedCompany | null;
  profileCompleteness: number | null;
  leadScore: LeadScoreSummaryResponse | null;
}

export interface SearchStageFailureResponse {
  searchResultId: string | null;
  companyId: string | null;
  stage: SearchResultStage;
  message: string;
}

export interface GetSearchResponse {
  id: string;
  query: string;
  status: SearchJobStatus;
  companyLimit: number;
  criteria: ParsedQuery | null;
  summary: SearchSummaryResponse;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  results: SearchResultItemResponse[];
  failures: SearchStageFailureResponse[];
}
