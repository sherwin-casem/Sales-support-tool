import type { SearchJobStatus } from "@prisma/client";
import type { ParsedQuery } from "@/types/agents/query-parser.types.js";

export interface RunSearchInput {
  userId: string;
  query: string;
  companyLimit?: number | null;
  searchJobId?: string;
}

export interface SearchStageFailure {
  searchResultId?: string;
  companyId?: string;
  stage: string;
  message: string;
}

export interface SearchOrchestrationSummary {
  discovered: number;
  crawled: number;
  extracted: number;
  enriched: number;
  failed: number;
  removed: number;
  skippedDuplicates: number;
}

export interface SearchOrchestrationResult {
  searchJobId: string;
  status: SearchJobStatus;
  criteria: ParsedQuery;
  summary: SearchOrchestrationSummary;
  failures: SearchStageFailure[];
  durationMs: number;
}

export type SearchOrchestratorErrorCode =
  | "INVALID_INPUT"
  | "QUERY_PARSE_FAILED"
  | "DISCOVERY_FAILED"
  | "NO_COMPANIES_DISCOVERED"
  | "ORCHESTRATION_FAILED";

export class SearchOrchestratorError extends Error {
  readonly code: SearchOrchestratorErrorCode;
  readonly cause?: unknown;

  constructor(code: SearchOrchestratorErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = "SearchOrchestratorError";
    this.code = code;
    this.cause = cause;
  }
}
