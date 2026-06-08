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
  LeadScoreSummaryResponse,
  SearchResultItemResponse,
  SearchStageFailureResponse,
  SearchSummaryResponse,
} from "@/types/api/search.api.types.js";
import type { RankedLeadRecord } from "@/types/repositories/lead.repository.types.js";
import type { SearchJobRecord, SearchResultRecord } from "@/types/repositories/search.repository.types.js";
import type {
  CompanyDetailRecord,
  CompanyListItemRecord,
} from "@/types/repositories/company.repository.types.js";
import { toIsoString } from "@/lib/api/request-utils.js";

const FAILED_STAGES: SearchResultStage[] = [
  "CRAWL_FAILED",
  "EXTRACT_FAILED",
  "SCORE_FAILED",
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

export function buildSearchSummary(
  results: SearchResultRecord[],
  skippedDuplicates = 0,
): SearchSummaryResponse {
  return {
    discovered: results.length,
    crawled: countByStages(results, ["CRAWLED", "EXTRACTING", "EXTRACT_FAILED", "EXTRACTED", "SCORING", "SCORE_FAILED", "SCORED"]),
    extracted: countByStages(results, ["EXTRACTED", "SCORING", "SCORE_FAILED", "SCORED"]),
    scored: countByStage(results, "SCORED"),
    failed: results.filter((result) => FAILED_STAGES.includes(result.stage)).length,
    skippedDuplicates,
  };
}

export function mapSearchFailures(
  results: SearchResultRecord[],
): SearchStageFailureResponse[] {
  return results
    .filter(
      (result) =>
        FAILED_STAGES.includes(result.stage) || Boolean(result.stageError),
    )
    .map((result) => ({
      searchResultId: result.id,
      companyId: result.companyId,
      stage: result.stage,
      message: result.stageError ?? `Stage failed: ${result.stage}`,
    }));
}

export function mapGetSearchResponse(
  job: SearchJobRecord,
  rankedResults: RankedLeadRecord[],
  rawResults: SearchResultRecord[],
  options: { includeFailures: boolean },
): GetSearchResponse {
  const resultById = new Map(rawResults.map((result) => [result.id, result]));

  return {
    id: job.id,
    query: job.query,
    status: job.status,
    companyLimit: job.companyLimit,
    criteria: isParsedQuery(job.criteria) ? job.criteria : null,
    summary: buildSearchSummary(rawResults),
    errorMessage: job.errorMessage,
    startedAt: toIsoString(job.startedAt),
    completedAt: toIsoString(job.completedAt),
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    results: rankedResults.map((result) =>
      mapSearchResultItem(result, resultById.get(result.searchResultId)),
    ),
    failures: options.includeFailures ? mapSearchFailures(rawResults) : [],
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
  const latestAppearance = detail.latestLeadScore
    ? detail.recentSearches.find(
        (appearance) => appearance.searchResultId === detail.latestLeadScore?.searchResultId,
      )
    : undefined;

  return {
    id: detail.id,
    name: detail.name,
    domain: detail.domain,
    normalizedDomain: detail.normalizedDomain,
    websiteUrl: detail.websiteUrl,
    firstSeenAt: detail.firstSeenAt.toISOString(),
    lastCrawledAt: toIsoString(detail.lastCrawledAt),
    createdAt: detail.createdAt.toISOString(),
    updatedAt: detail.updatedAt.toISOString(),
    profile: detail.profile ? mapCompanyProfileDetail(detail.profile) : null,
    profileHistory: detail.profileHistory.map(mapProfileVersionSummary),
    recentSearches: detail.recentSearches.map(mapCompanySearchAppearance),
    latestLeadScore: detail.latestLeadScore
      ? {
          searchJobId: detail.latestLeadScore.searchJobId,
          searchResultId: detail.latestLeadScore.searchResultId,
          query: latestAppearance?.query ?? "Unknown search",
          score: detail.latestLeadScore.totalScore,
          confidence: detail.latestLeadScore.confidence,
          explanation: detail.latestLeadScore.rationale,
          breakdown: detail.latestLeadScore.breakdown,
          scoredAt: detail.latestLeadScore.scoredAt.toISOString(),
        }
      : null,
  };
}

function mapSearchResultItem(
  result: RankedLeadRecord,
  rawResult?: SearchResultRecord,
): SearchResultItemResponse {
  return {
    searchResultId: result.searchResultId,
    rank: result.rank,
    stage: result.stage as SearchResultStage,
    stageError: rawResult?.stageError ?? null,
    discoveredAt: rawResult?.discoveredAt.toISOString() ?? new Date(0).toISOString(),
    completedAt: toIsoString(rawResult?.completedAt),
    company: mapCompanySummary(result.company),
    profile: result.profile?.structuredData ?? null,
    profileCompleteness: result.profile?.completeness ?? null,
    leadScore: result.leadScore ? mapLeadScoreSummary(result.leadScore) : null,
  };
}

function mapCompanySummary(company: RankedLeadRecord["company"]): CompanySummaryResponse {
  return {
    id: company.id,
    name: company.name,
    domain: company.domain,
    websiteUrl: company.websiteUrl,
  };
}

function mapLeadScoreSummary(
  leadScore: NonNullable<RankedLeadRecord["leadScore"]>,
): LeadScoreSummaryResponse {
  return {
    score: leadScore.totalScore,
    confidence: leadScore.confidence,
    explanation: leadScore.rationale,
    breakdown: leadScore.breakdown,
    scoredAt: leadScore.scoredAt.toISOString(),
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
    data: profile.structuredData,
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
    leadScore: appearance.leadScore,
    searchedAt: appearance.searchedAt.toISOString(),
  };
}

function countByStage(results: SearchResultRecord[], stage: SearchResultStage): number {
  return results.filter((result) => result.stage === stage).length;
}

function countByStages(
  results: SearchResultRecord[],
  stages: SearchResultStage[],
): number {
  return results.filter((result) => stages.includes(result.stage)).length;
}

function isParsedQuery(value: ParsedQuery | Record<string, unknown>): value is ParsedQuery {
  return typeof value === "object" && value !== null && "industry" in value;
}
