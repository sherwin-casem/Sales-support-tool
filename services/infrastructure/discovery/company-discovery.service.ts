import { CompanyDiscoveryAgent } from "@/agents/discovery/company-discovery.agent.js";
import { getEnv } from "@/lib/config/env.js";
import { getPipelineConfig } from "@/lib/config/pipeline.config.js";
import { createOpenAIClient } from "@/lib/config/openai.client.js";
import { aiLogger } from "@/lib/logging/logger.js";
import { isUnlimitedCompanyLimit } from "@/lib/search/company-limit.js";
import { withRetry } from "@/lib/utils/retry.js";
import { err, ok, type Result } from "@/lib/utils/result.js";
import { domainNormalizerService } from "@/services/domain/company/domain-normalizer.service.js";
import {
  CompanyDiscoveryError,
  DiscoveryError,
} from "@/types/agents/discovery-error.types.js";
import type {
  CompanyDiscoveryInput,
  DiscoveredCompany,
} from "@/types/agents/company-discovery.types.js";

export interface CompanyDiscoveryPort {
  discover(
    input: CompanyDiscoveryInput,
  ): Promise<Result<DiscoveredCompany[], CompanyDiscoveryError>>;
}

export interface CompanyDiscoveryServiceOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  unlimitedMaxRounds?: number;
}

export class CompanyDiscoveryService implements CompanyDiscoveryPort {
  private readonly maxAttempts: number;
  private readonly initialDelayMs: number;
  private readonly unlimitedMaxRounds: number;

  constructor(
    private readonly agent: CompanyDiscoveryAgent,
    options: CompanyDiscoveryServiceOptions = {},
  ) {
    const pipelineConfig = getPipelineConfig();

    this.maxAttempts = options.maxAttempts ?? 2;
    this.initialDelayMs = options.initialDelayMs ?? 500;
    this.unlimitedMaxRounds =
      options.unlimitedMaxRounds ?? pipelineConfig.DISCOVERY_UNLIMITED_MAX_ROUNDS;
  }

  async discover(
    input: CompanyDiscoveryInput,
  ): Promise<Result<DiscoveredCompany[], CompanyDiscoveryError>> {
    const startedAt = Date.now();

    aiLogger.info("CompanyDiscoveryService.discover started", {
      queryLength: input.query.length,
      industryHint: input.industry ?? "not specified",
      locationHint: input.location ?? "not specified",
      limit: isUnlimitedCompanyLimit(input.limit) ? "none" : input.limit,
    });

    try {
      const result = isUnlimitedCompanyLimit(input.limit)
        ? await this.discoverWithoutLimit(input)
        : await this.discoverWithLimit(input);

      const durationMs = Date.now() - startedAt;

      if (!result.ok) {
        aiLogger.error("CompanyDiscoveryService.discover failed", {
          code: result.error.code,
          durationMs,
          queryLength: input.query.length,
        });

        return result;
      }

      aiLogger.info("CompanyDiscoveryService.discover completed", {
        durationMs,
        queryLength: input.query.length,
        resultCount: result.value.length,
      });

      return ok(result.value);
    } catch (error) {
      const durationMs = Date.now() - startedAt;

      if (error instanceof DiscoveryError) {
        aiLogger.error("CompanyDiscoveryService.discover exhausted retries", {
          code: error.code,
          durationMs,
          queryLength: input.query.length,
        });

        return err(CompanyDiscoveryError.fromDiscoveryError(error));
      }

      aiLogger.error("CompanyDiscoveryService.discover unexpected failure", {
        durationMs,
        queryLength: input.query.length,
        message: error instanceof Error ? error.message : "Unknown error",
      });

      return err(
        new CompanyDiscoveryError(
          "DISCOVERY_FAILED",
          error instanceof Error ? error.message : "Company discovery failed",
          error,
        ),
      );
    }
  }

  private async discoverWithLimit(
    input: CompanyDiscoveryInput,
  ): Promise<Result<DiscoveredCompany[], CompanyDiscoveryError>> {
    const result = await this.executeAgentWithRetry(input);

    if (!result.ok) {
      return err(CompanyDiscoveryError.fromDiscoveryError(result.error));
    }

    return ok(result.value);
  }

  private async discoverWithoutLimit(
    input: CompanyDiscoveryInput,
  ): Promise<Result<DiscoveredCompany[], CompanyDiscoveryError>> {
    const aggregated: DiscoveredCompany[] = [];
    const seenDomains = new Set<string>();

    for (let round = 1; round <= this.unlimitedMaxRounds; round += 1) {
      const result = await this.executeAgentWithRetry({
        ...input,
        excludedWebsites: aggregated.map((company) => company.website),
      });

      if (!result.ok) {
        if (round === 1) {
          return err(CompanyDiscoveryError.fromDiscoveryError(result.error));
        }

        break;
      }

      const { merged, added } = mergeDiscoveredCompanies(aggregated, result.value, seenDomains);
      aggregated.length = 0;
      aggregated.push(...merged);

      aiLogger.info("CompanyDiscoveryService unlimited discovery round completed", {
        round,
        added,
        total: aggregated.length,
      });

      if (added === 0) {
        break;
      }
    }

    return ok(aggregated);
  }

  private async executeAgentWithRetry(
    input: CompanyDiscoveryInput,
  ): Promise<Result<DiscoveredCompany[], DiscoveryError>> {
    return withRetry(
      async () => {
        const attemptResult = await this.agent.execute(input);

        if (!attemptResult.ok && attemptResult.error.code === "DISCOVERY_FAILED") {
          throw attemptResult.error;
        }

        return attemptResult;
      },
      {
        maxAttempts: this.maxAttempts,
        initialDelayMs: this.initialDelayMs,
        shouldRetry: (error) => error instanceof DiscoveryError,
      },
    );
  }
}

function mergeDiscoveredCompanies(
  existing: DiscoveredCompany[],
  incoming: DiscoveredCompany[],
  seenDomains: Set<string>,
): { merged: DiscoveredCompany[]; added: number } {
  const merged = [...existing];
  let added = 0;

  for (const company of incoming) {
    const normalized = domainNormalizerService.normalizeWebsite(company.website);
    const domain = normalized?.domain;

    if (!domain || seenDomains.has(domain)) {
      continue;
    }

    seenDomains.add(domain);
    merged.push({
      companyName: company.companyName,
      website: normalized.website,
    });
    added += 1;
  }

  return { merged, added };
}

let cachedService: CompanyDiscoveryService | undefined;

export function createCompanyDiscoveryService(): CompanyDiscoveryService {
  const env = getEnv();
  const openai = createOpenAIClient(env.OPENAI_API_KEY);
  const agent = new CompanyDiscoveryAgent(openai, { model: env.OPENAI_MODEL });

  return new CompanyDiscoveryService(agent);
}

export function getCompanyDiscoveryService(): CompanyDiscoveryService {
  if (!cachedService) {
    cachedService = createCompanyDiscoveryService();
  }

  return cachedService;
}

export function resetCompanyDiscoveryServiceCache(): void {
  cachedService = undefined;
}

export function mapCompanyDiscoveryError(error: CompanyDiscoveryError): {
  status: number;
  message: string;
  code: CompanyDiscoveryError["code"];
} {
  switch (error.code) {
    case "INVALID_INPUT":
      return { status: 400, message: error.message, code: error.code };
    case "DISCOVERY_FAILED":
      return { status: 503, message: error.message, code: error.code };
    default:
      return {
        status: 500,
        message: "Unexpected company discovery failure",
        code: error.code,
      };
  }
}
