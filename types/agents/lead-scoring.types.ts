import type { ExtractedCompany } from "@/types/agents/company-extraction.types.js";
import type { ParsedQuery } from "@/types/agents/query-parser.types.js";

export const LEAD_SCORING_PROMPT_VERSION = "v1";

export interface LeadScoringInput {
  profile: ExtractedCompany;
  criteria: ParsedQuery;
  companyId: string;
  searchResultId: string;
  searchJobId: string;
  profileCompleteness?: number;
  promptVersion?: string;
}

export interface FactorScore {
  score: number;
  weight: number;
  weightedScore: number;
  confidence: number;
  rationale: string;
  signals: string[];
}

export interface ScoreBreakdown {
  industryFit: FactorScore;
  sizeFit: FactorScore;
  businessMaturity: FactorScore;
  growthIndicators: FactorScore;
}

export interface LeadScoreOutput {
  score: number;
  confidence: number;
  explanation: string;
  breakdown: ScoreBreakdown;
}

export interface ScoringWeights {
  industryFit: number;
  sizeFit: number;
  businessMaturity: number;
  growthIndicators: number;
}

export interface LeadScoreMeta {
  promptVersion: string;
  modelUsed: string;
  scoredAt: string;
  weights: ScoringWeights;
}

export interface LeadScoreResult {
  leadScore: LeadScoreOutput;
  meta: LeadScoreMeta;
}

export interface RawFactorScore {
  score: number;
  confidence: number;
  rationale: string;
  signals: string[];
}
