import { createHash } from "node:crypto";
import {
  LeadEnrichmentAgent,
  getDefaultLeadEnrichmentPromptVersion,
} from "@/agents/enrichment/lead-enrichment.agent.js";
import { getEnv } from "@/lib/config/env.js";
import { createOpenAIClient } from "@/lib/config/openai.client.js";
import { aiLogger } from "@/lib/logging/logger.js";
import { computeExtractionCompleteness } from "@/lib/validations/company-extraction.schema.js";
import { err, ok, type Result } from "@/lib/utils/result.js";
import { mergeExtractedProfiles } from "@/services/domain/enrichment/profile-merge.service.js";
import {
  AgentError,
  LeadEnrichmentError,
} from "@/types/agents/agent-error.types.js";
import type {
  LeadEnrichmentInput,
  LeadEnrichmentResult,
} from "@/types/agents/lead-enrichment.types.js";

export interface LeadEnrichmentPort {
  enrich(
    input: LeadEnrichmentInput,
  ): Promise<Result<LeadEnrichmentResult, LeadEnrichmentError>>;
}

export interface LeadEnrichmentServiceOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
}

export class LeadEnrichmentService implements LeadEnrichmentPort {
  private readonly maxAttempts: number;
  private readonly initialDelayMs: number;

  constructor(
    private readonly agent: LeadEnrichmentAgent,
    private readonly model: string,
    options: LeadEnrichmentServiceOptions = {},
  ) {
    this.maxAttempts = options.maxAttempts ?? 2;
    this.initialDelayMs = options.initialDelayMs ?? 500;
  }

  async enrich(
    input: LeadEnrichmentInput,
  ): Promise<Result<LeadEnrichmentResult, LeadEnrichmentError>> {
    const startedAt = Date.now();

    aiLogger.info("LeadEnrichmentService.enrich started", {
      companyId: input.companyId,
      domain: input.domain,
      promptVersion: getDefaultLeadEnrichmentPromptVersion(),
    });

    let lastError: LeadEnrichmentError | undefined;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      const result = await this.agent.execute(input);

      if (result.ok) {
        const mergedProfile = mergeExtractedProfiles(input.websiteProfile, result.value);
        const completeness = computeExtractionCompleteness(mergedProfile);
        const durationMs = Date.now() - startedAt;

        aiLogger.info("LeadEnrichmentService.enrich completed", {
          companyId: input.companyId,
          domain: input.domain,
          durationMs,
          attempt,
          completeness,
        });

        return ok({
          profile: mergedProfile,
          meta: {
            promptVersion: getDefaultLeadEnrichmentPromptVersion(),
            modelUsed: this.model,
            enrichedAt: new Date().toISOString(),
          },
        });
      }

      lastError = LeadEnrichmentError.fromAgentError(result.error);

      if (
        result.error.code !== "OPENAI_ERROR" &&
        result.error.code !== "EMPTY_RESPONSE" &&
        result.error.code !== "VALIDATION_ERROR"
      ) {
        break;
      }

      if (attempt < this.maxAttempts) {
        await sleep(this.initialDelayMs * attempt);
      }
    }

    aiLogger.error("LeadEnrichmentService.enrich failed", {
      companyId: input.companyId,
      domain: input.domain,
      durationMs: Date.now() - startedAt,
      code: lastError?.code,
    });

    return err(
      lastError ?? new LeadEnrichmentError("VALIDATION_ERROR", "Lead enrichment failed"),
    );
  }
}

export function hashEnrichmentProfile(profile: LeadEnrichmentResult["profile"]): string {
  return createHash("sha256").update(JSON.stringify(profile)).digest("hex").slice(0, 16);
}

let cachedService: LeadEnrichmentService | undefined;

export function createLeadEnrichmentService(
  options: LeadEnrichmentServiceOptions = {},
): LeadEnrichmentService {
  const env = getEnv();
  const openai = createOpenAIClient(env.OPENAI_API_KEY);
  const agent = new LeadEnrichmentAgent(openai, { model: env.OPENAI_MODEL });

  return new LeadEnrichmentService(agent, env.OPENAI_MODEL, options);
}

export function getLeadEnrichmentService(): LeadEnrichmentService {
  if (!cachedService) {
    cachedService = createLeadEnrichmentService();
  }

  return cachedService;
}

export function resetLeadEnrichmentServiceCache(): void {
  cachedService = undefined;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function mapLeadEnrichmentError(error: LeadEnrichmentError): {
  status: number;
  message: string;
  code: LeadEnrichmentError["code"];
} {
  switch (error.code) {
    case "INVALID_INPUT":
      return { status: 400, message: error.message, code: error.code };
    case "OPENAI_ERROR":
    case "EMPTY_RESPONSE":
    case "VALIDATION_ERROR":
      return { status: 503, message: error.message, code: error.code };
    default:
      return {
        status: 500,
        message: "Unexpected lead enrichment failure",
        code: error.code,
      };
  }
}
