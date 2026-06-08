import type { Agent } from "@/agents/base/agent.interface.js";
import { aiLogger } from "@/lib/logging/logger.js";
import { CompanyDiscoveryInputSchema } from "@/lib/validations/company-discovery.schema.js";
import { err, ok, type Result } from "@/lib/utils/result.js";
import { companyDeduplicatorService } from "@/services/domain/company/company-deduplicator.service.js";
import { isGenericIndustry } from "@/services/domain/discovery/industry-terms.service.js";
import { locationResolverService } from "@/services/domain/discovery/location-resolver.service.js";
import {
  DiscoverySourceError,
  type DiscoverySource,
} from "@/services/infrastructure/discovery/sources/discovery-source.interface.js";
import { DiscoveryError } from "@/types/agents/discovery-error.types.js";
import type {
  CompanyDiscoveryInput,
  DiscoveredCompany,
  DiscoveryCriteria,
  RawDiscoveryCandidate,
} from "@/types/agents/company-discovery.types.js";

export interface CompanyDiscoveryAgentOptions {
  sources: DiscoverySource[];
  locationResolver?: typeof locationResolverService;
  deduplicator?: typeof companyDeduplicatorService;
}

export class CompanyDiscoveryAgent
  implements Agent<CompanyDiscoveryInput, DiscoveredCompany[], DiscoveryError>
{
  private readonly locationResolver: typeof locationResolverService;
  private readonly deduplicator: typeof companyDeduplicatorService;

  constructor(private readonly options: CompanyDiscoveryAgentOptions) {
    this.locationResolver =
      options.locationResolver ?? locationResolverService;
    this.deduplicator = options.deduplicator ?? companyDeduplicatorService;
  }

  async execute(
    input: CompanyDiscoveryInput,
  ): Promise<Result<DiscoveredCompany[], DiscoveryError>> {
    const parsedInput = CompanyDiscoveryInputSchema.safeParse(input);

    if (!parsedInput.success) {
      return err(
        new DiscoveryError(
          "INVALID_INPUT",
          parsedInput.error.issues.map((issue) => issue.message).join("; "),
          parsedInput.error,
        ),
      );
    }

    const locationContext = this.locationResolver.resolve(parsedInput.data.location);
    const criteria: DiscoveryCriteria = {
      industry: parsedInput.data.industry,
      location: parsedInput.data.location,
      locationContext,
      limit: parsedInput.data.limit,
    };

    const tier1Sources = this.options.sources.filter((source) => source.tier === 1);
    const tier2Sources = this.options.sources.filter((source) => source.tier === 2);

    const tier1Results = await this.runSources(tier1Sources, criteria);
    let candidates = tier1Results.candidates;
    let sourceErrors = tier1Results.errors;
    let sourceStats = [...tier1Results.stats];
    let sourcesAttempted = tier1Sources.length;

    if (candidates.length < criteria.limit && tier2Sources.length > 0) {
      const tier2Results = await this.runSources(tier2Sources, criteria);
      candidates = candidates.concat(tier2Results.candidates);
      sourceErrors = sourceErrors.concat(tier2Results.errors);
      sourceStats = sourceStats.concat(tier2Results.stats);
      sourcesAttempted += tier2Sources.length;
    }

    let deduplicated = this.deduplicator.deduplicate(candidates);
    let companies = deduplicated.slice(0, criteria.limit).map(toDiscoveredCompany);

    if (companies.length === 0 && !isGenericIndustry(criteria.industry)) {
      const relaxedCriteria: DiscoveryCriteria = {
        ...criteria,
        industry: "unknown",
      };

      aiLogger.info("CompanyDiscoveryAgent retrying with generic industry", {
        location: criteria.location,
        originalIndustry: criteria.industry,
      });

      const relaxedTier1 = await this.runSources(tier1Sources, relaxedCriteria);
      candidates = relaxedTier1.candidates;
      sourceErrors = sourceErrors.concat(relaxedTier1.errors);
      sourceStats = sourceStats.concat(relaxedTier1.stats);
      sourcesAttempted += tier1Sources.length;

      if (candidates.length < criteria.limit && tier2Sources.length > 0) {
        const relaxedTier2 = await this.runSources(tier2Sources, relaxedCriteria);
        candidates = candidates.concat(relaxedTier2.candidates);
        sourceErrors = sourceErrors.concat(relaxedTier2.errors);
        sourceStats = sourceStats.concat(relaxedTier2.stats);
        sourcesAttempted += tier2Sources.length;
      }

      deduplicated = this.deduplicator.deduplicate(candidates);
      companies = deduplicated.slice(0, criteria.limit).map(toDiscoveredCompany);
    }

    if (
      companies.length === 0 &&
      sourcesAttempted > 0 &&
      sourceErrors.length === sourcesAttempted
    ) {
      return err(
        new DiscoveryError(
          "ALL_SOURCES_FAILED",
          "All discovery sources failed to return results",
          sourceErrors,
        ),
      );
    }

    const sourceSummary = summarizeDiscoverySources(sourceStats);

    if (companies.length === 0) {
      aiLogger.warn("CompanyDiscoveryAgent found no companies", {
        industry: criteria.industry,
        location: criteria.location,
        sourceCount: this.options.sources.length,
        candidateCount: candidates.length,
        failedSources: sourceErrors.length,
        ...sourceSummary,
      });
    } else {
      aiLogger.info("CompanyDiscoveryAgent.execute completed", {
        industry: criteria.industry,
        location: criteria.location,
        sourceCount: this.options.sources.length,
        candidateCount: candidates.length,
        resultCount: companies.length,
        failedSources: sourceErrors.length,
        ...sourceSummary,
      });
    }

    return ok(companies);
  }

  private async runSources(
    sources: DiscoverySource[],
    criteria: DiscoveryCriteria,
  ): Promise<{
    candidates: RawDiscoveryCandidate[];
    failedSources: number;
    errors: DiscoverySourceError[];
    stats: DiscoverySourceRunStat[];
  }> {
    if (sources.length === 0) {
      return { candidates: [], failedSources: 0, errors: [], stats: [] };
    }

    const results = await Promise.all(
      sources.map(async (source) => {
        try {
          const candidates = await source.discover(criteria);
          aiLogger.info("Discovery source completed", {
            source: source.name,
            count: candidates.length,
          });
          return {
            source: source.name,
            candidates,
            error: null,
            stat: {
              source: source.name,
              count: candidates.length,
              failed: false,
            } satisfies DiscoverySourceRunStat,
          };
        } catch (error) {
          const sourceError =
            error instanceof DiscoverySourceError
              ? error
              : new DiscoverySourceError(
                  source.name,
                  error instanceof Error ? error.message : "Discovery source failed",
                  error,
                );

          aiLogger.warn("Discovery source failed", {
            source: source.name,
            message: sourceError.message,
          });

          return {
            source: source.name,
            candidates: [],
            error: sourceError,
            stat: {
              source: source.name,
              count: 0,
              failed: true,
            } satisfies DiscoverySourceRunStat,
          };
        }
      }),
    );

    return {
      candidates: results.flatMap((result) => result.candidates),
      failedSources: results.filter((result) => result.error !== null).length,
      errors: results
        .map((result) => result.error)
        .filter((error): error is DiscoverySourceError => error !== null),
      stats: results.map((result) => result.stat),
    };
  }
}

interface DiscoverySourceRunStat {
  source: string;
  count: number;
  failed: boolean;
}

function summarizeDiscoverySources(stats: DiscoverySourceRunStat[]): Record<string, number> {
  const summary: Record<string, number> = {};

  for (const stat of stats) {
    summary[stat.source] = (summary[stat.source] ?? 0) + stat.count;
  }

  summary.failedSources = stats.filter((stat) => stat.failed).length;
  summary.duckduckgoCount = summary.duckduckgo_html ?? 0;
  summary.wikidataCount = summary.wikidata ?? 0;

  return summary;
}

function toDiscoveredCompany(candidate: RawDiscoveryCandidate): DiscoveredCompany {
  return {
    companyName: candidate.companyName,
    website: candidate.website,
  };
}
