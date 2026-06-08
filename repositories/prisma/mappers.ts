import type {
  Company,
  CompanyProfile,
  LeadScore,
  SearchJob,
  SearchResult,
} from "@prisma/client";
import type { ExtractedCompany } from "@/types/agents/company-extraction.types.js";
import type { ScoreBreakdown } from "@/types/agents/lead-scoring.types.js";
import type { ParsedQuery } from "@/types/agents/query-parser.types.js";
import type {
  CompanyProfileRecord,
  CompanyRecord,
} from "@/types/repositories/company.repository.types.js";
import type { LeadScoreRecord } from "@/types/repositories/lead.repository.types.js";
import type {
  SearchJobRecord,
  SearchResultRecord,
} from "@/types/repositories/search.repository.types.js";

function decimalToNumber(value: { toNumber(): number } | null | undefined): number | null {
  return value?.toNumber() ?? null;
}

export function mapCompany(record: Company): CompanyRecord {
  return {
    id: record.id,
    domain: record.domain,
    normalizedDomain: record.normalizedDomain,
    name: record.name,
    websiteUrl: record.websiteUrl,
    firstSeenAt: record.firstSeenAt,
    lastCrawledAt: record.lastCrawledAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function mapCompanyProfile(record: CompanyProfile): CompanyProfileRecord {
  return {
    id: record.id,
    companyId: record.companyId,
    version: record.version,
    structuredData: record.structuredData as unknown as ExtractedCompany,
    completeness: decimalToNumber(record.completeness),
    modelUsed: record.modelUsed,
    promptVersion: record.promptVersion,
    contentHash: record.contentHash,
    extractedAt: record.extractedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function mapLeadScore(record: LeadScore): LeadScoreRecord {
  return {
    id: record.id,
    searchResultId: record.searchResultId,
    searchJobId: record.searchJobId,
    totalScore: decimalToNumber(record.totalScore) ?? 0,
    confidence: decimalToNumber(record.confidence) ?? 0,
    breakdown: record.breakdown as unknown as ScoreBreakdown,
    rationale: record.rationale,
    modelUsed: record.modelUsed,
    promptVersion: record.promptVersion,
    scoredAt: record.scoredAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function mapSearchJob(record: SearchJob): SearchJobRecord {
  return {
    id: record.id,
    userId: record.userId,
    query: record.query,
    criteria: record.criteria as unknown as ParsedQuery | Record<string, unknown>,
    status: record.status,
    companyLimit: record.companyLimit,
    errorMessage: record.errorMessage,
    startedAt: record.startedAt,
    completedAt: record.completedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function mapSearchResult(record: SearchResult): SearchResultRecord {
  return {
    id: record.id,
    searchJobId: record.searchJobId,
    companyId: record.companyId,
    stage: record.stage,
    rank: record.rank,
    discoverySource: record.discoverySource,
    discoveryUrl: record.discoveryUrl,
    stageError: record.stageError,
    discoveredAt: record.discoveredAt,
    completedAt: record.completedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function toDecimal(value: number): string {
  return value.toFixed(3);
}

export function toScoreDecimal(value: number): string {
  return value.toFixed(2);
}
