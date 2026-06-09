import { CompanyDiscoveryAgent } from "@/agents/discovery/company-discovery.agent.js";
import { getEnv } from "@/lib/config/env.js";
import { createOpenAIClient } from "@/lib/config/openai.client.js";
import { aiLogger } from "@/lib/logging/logger.js";
import { withRetry } from "@/lib/utils/retry.js";
import { err, ok, type Result } from "@/lib/utils/result.js";
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
}

export class CompanyDiscoveryService implements CompanyDiscoveryPort {
  private readonly maxAttempts: number;
  private readonly initialDelayMs: number;

  constructor(
    private readonly agent: CompanyDiscoveryAgent,
    options: CompanyDiscoveryServiceOptions = {},
  ) {
    this.maxAttempts = options.maxAttempts ?? 2;
    this.initialDelayMs = options.initialDelayMs ?? 500;
  }

  async discover(
    input: CompanyDiscoveryInput,
  ): Promise<Result<DiscoveredCompany[], CompanyDiscoveryError>> {
    const startedAt = Date.now();

    aiLogger.info("CompanyDiscoveryService.discover started", {
      queryLength: input.query.length,
      industryHint: input.industry ?? "not specified",
      locationHint: input.location ?? "not specified",
      limit: input.limit ?? 25,
    });

    try {
      const result = await withRetry(
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

      const durationMs = Date.now() - startedAt;

      if (!result.ok) {
        aiLogger.error("CompanyDiscoveryService.discover failed", {
          code: result.error.code,
          durationMs,
          queryLength: input.query.length,
        });

        return err(CompanyDiscoveryError.fromDiscoveryError(result.error));
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
