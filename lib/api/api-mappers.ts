import type { SearchResultStage } from "@prisma/client";
import type { ParsedQuery } from "@/types/agents/query-parser.types.js";
import type { ExtractedCompany } from "@/types/agents/company-extraction.types.js";
import type {
  CompanyListItemResponse,
  CompanyProfileDetailResponse,
  CompanyProfileSummaryResponse,
  CompanySearchAppearanceResponse,
  GetCompanyResponse,
  ProfileVersionSummaryResponse,
} from "@/types/api/company.api.types.js";
import type {
  CompanySummaryResponse,
  CreateSearchResponse,
  GetSearchResponse,
  SearchResultItemResponse,
  SearchStageFailureResponse,
  SearchSummaryResponse,
} from "@/types/api/search.api.types.js";
import type { RankedLeadRecord } from "@/types/repositories/lead.repository.types.js";
import type { SearchJobRecord } from "@/types/repositories/search.repository.types.js";
import type {
  CompanyDetailRecord,
  CompanyListItemRecord,
} from "@/types/repositories/company.repository.types.js";
import { toIsoString } from "@/lib/api/request-utils.js";
import { sanitizeProfileForResponse } from "@/lib/api/sanitize-profile.js";

const FAILED_STAGES: SearchResultStage[] = [
  "CRAWL_FAILED",
  "EXTRACT_FAILED",
  "ENRICH_FAILED",
];

export function mapCreateSearchResponse(job: SearchJobRecord): CreateSearchResponse {
  return {
    id: job.id,
    status: job.status,
    query: job.query,
    companyLimit: job.companyLimit,
    createdAt: job.createdAt.toISOString(),
    links: {
      self: `/api/v1/search/${job.id}`,
    },
  };
}

export type SearchStageCounts = Partial<Record<SearchResultStage, number>>;

export function buildSearchSummaryFromCounts(
  counts: SearchStageCounts,
  skippedDuplicates = 0,
): SearchSummaryResponse {
  const sumStages = (stages: SearchResultStage[]): number =>
    stages.reduce((total, stage) => total + (counts[stage] ?? 0), 0);

  return {
    discovered: sumStages(Object.keys(counts) as SearchResultStage[]),
    crawled: sumStages(["CRAWLED", "EXTRACTING", "EXTRACT_FAILED", "EXTRACTED", "ENRICHING", "ENRICH_FAILED", "ENRICHED"]),
    extracted: sumStages(["EXTRACTED", "ENRICHING", "ENRICH_FAILED", "ENRICHED"]),
    enriched: counts.ENRICHED ?? 0,
    failed: sumStages(FAILED_STAGES),
    skippedDuplicates,
  };
}

export function mapSearchFailures(
  results: Array<Pick<RankedLeadRecord, "searchResultId" | "companyId" | "stage" | "stageError">>,
): SearchStageFailureResponse[] {
  return results
    .filter(
      (result) =>
        FAILED_STAGES.includes(result.stage as SearchResultStage) ||
        Boolean(result.stageError),
    )
    .map((result) => ({
      searchResultId: result.searchResultId,
      companyId: result.companyId,
      stage: result.stage as SearchResultStage,
      message: result.stageError ?? `Stage failed: ${result.stage}`,
    }));
}

export function mapGetSearchResponse(
  job: SearchJobRecord,
  rankedResults: RankedLeadRecord[],
  stageCounts: SearchStageCounts,
  options: { includeFailures: boolean },
): GetSearchResponse {
  return {
    id: job.id,
    query: job.query,
    status: job.status,
    companyLimit: job.companyLimit,
    criteria: isParsedQuery(job.criteria) ? job.criteria : null,
    summary: buildSearchSummaryFromCounts(stageCounts),
    errorMessage: job.errorMessage,
    startedAt: toIsoString(job.startedAt),
    completedAt: toIsoString(job.completedAt),
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    results: rankedResults.map(mapSearchResultItem),
    failures: options.includeFailures ? mapSearchFailures(rankedResults) : [],
  };
}

export function mapCompanyListItem(item: CompanyListItemRecord): CompanyListItemResponse {
  return {
    id: item.id,
    name: item.name,
    domain: item.domain,
    websiteUrl: item.websiteUrl,
    lastCrawledAt: toIsoString(item.lastCrawledAt),
    firstSeenAt: item.firstSeenAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    latestProfile: item.latestProfile
      ? mapCompanyProfileSummary(item.latestProfile)
      : null,
  };
}

export function mapGetCompanyResponse(detail: CompanyDetailRecord): GetCompanyResponse {
  return {
    id: detail.id,
    name: detail.name,
    domain: detail.domain,
    normalizedDomain: detail.normalizedDomain,
    websiteUrl: detail.websiteUrl,
    intentScore: detail.intentScore ?? null,
    intentUpdatedAt: toIsoString(detail.intentUpdatedAt ?? null),
    intentSignals: (detail.intentSignals ?? []).map((signal) => ({
      id: signal.id,
      type: signal.type,
      title: signal.title,
      summary: signal.summary,
      sourceUrl: signal.sourceUrl,
      confidence: signal.confidence,
      detectedAt: signal.detectedAt.toISOString(),
    })),
    firstSeenAt: detail.firstSeenAt.toISOString(),
    lastCrawledAt: toIsoString(detail.lastCrawledAt),
    createdAt: detail.createdAt.toISOString(),
    updatedAt: detail.updatedAt.toISOString(),
    profile: detail.profile ? mapCompanyProfileDetail(detail.profile) : null,
    profileHistory: detail.profileHistory.map(mapProfileVersionSummary),
    recentSearches: detail.recentSearches.map(mapCompanySearchAppearance),
  };
}

function mapSearchResultItem(result: RankedLeadRecord): SearchResultItemResponse {
  return {
    searchResultId: result.searchResultId,
    rank: result.rank,
    stage: result.stage as SearchResultStage,
    stageError: result.stageError,
    discoveredAt: result.discoveredAt.toISOString(),
    completedAt: toIsoString(result.completedAt),
    company: mapCompanySummary(result.company),
    profile: sanitizeProfileForResponse(result.profile?.structuredData ?? null),
    profileCompleteness: result.profile?.completeness ?? null,
    intentSignals: result.intentSignals,
  };
}

function mapCompanySummary(company: RankedLeadRecord["company"]): CompanySummaryResponse {
  return {
    id: company.id,
    name: company.name,
    domain: company.domain,
    websiteUrl: company.websiteUrl,
    intentScore: company.intentScore ?? null,
  };
}

function mapCompanyProfileSummary(
  profile: NonNullable<CompanyListItemRecord["latestProfile"]>,
): CompanyProfileSummaryResponse {
  return {
    industry: profile.industry,
    estimatedCompanySize: profile.estimatedCompanySize,
    completeness: profile.completeness,
    extractedAt: toIsoString(profile.extractedAt),
  };
}

function mapCompanyProfileDetail(
  profile: NonNullable<CompanyDetailRecord["profile"]>,
): CompanyProfileDetailResponse {
  return {
    id: profile.id,
    version: profile.version,
    data: sanitizeProfileForResponse(profile.structuredData) ?? profile.structuredData,
    completeness: profile.completeness,
    modelUsed: profile.modelUsed,
    promptVersion: profile.promptVersion,
    contentHash: profile.contentHash,
    extractedAt: profile.extractedAt.toISOString(),
  };
}

function mapProfileVersionSummary(
  profile: CompanyDetailRecord["profileHistory"][number],
): ProfileVersionSummaryResponse {
  return {
    version: profile.version,
    completeness: profile.completeness,
    extractedAt: profile.extractedAt.toISOString(),
    contentHash: profile.contentHash,
  };
}

function mapCompanySearchAppearance(
  appearance: CompanyDetailRecord["recentSearches"][number],
): CompanySearchAppearanceResponse {
  return {
    searchJobId: appearance.searchJobId,
    searchResultId: appearance.searchResultId,
    query: appearance.query,
    stage: appearance.stage,
    rank: appearance.rank,
    searchedAt: appearance.searchedAt.toISOString(),
  };
}

function isParsedQuery(value: ParsedQuery | Record<string, unknown>): value is ParsedQuery {
  return typeof value === "object" && value !== null && "industry" in value;
}
