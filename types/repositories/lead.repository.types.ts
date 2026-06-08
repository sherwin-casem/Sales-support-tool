import type { ScoreBreakdown } from "@/types/agents/lead-scoring.types.js";
import type { CompanyProfileRecord, CompanyRecord } from "@/types/repositories/company.repository.types.js";

export interface LeadScoreRecord {
  id: string;
  searchResultId: string;
  searchJobId: string;
  totalScore: number;
  confidence: number;
  breakdown: ScoreBreakdown;
  rationale: string;
  modelUsed: string | null;
  promptVersion: string | null;
  scoredAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SaveLeadScoreInput {
  searchResultId: string;
  searchJobId: string;
  totalScore: number;
  confidence: number;
  breakdown: ScoreBreakdown;
  rationale: string;
  modelUsed?: string;
  promptVersion?: string;
  scoredAt?: Date;
}

export interface RankedLeadRecord {
  searchResultId: string;
  searchJobId: string;
  rank: number | null;
  stage: string;
  company: CompanyRecord;
  profile: CompanyProfileRecord | null;
  leadScore: LeadScoreRecord | null;
}

export interface SaveLeadScoreResult {
  leadScore: LeadScoreRecord;
  created: boolean;
}
