import type {
  Company,
  CompanyProfile,
  SearchJob,
  SearchResult,
} from "@prisma/client";
import type { ExtractedCompany } from "@/types/agents/company-extraction.types.js";
import type { ParsedQuery } from "@/types/agents/query-parser.types.js";
import type {
  CompanyProfileRecord,
  CompanyRecord,
} from "@/types/repositories/company.repository.types.js";
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
