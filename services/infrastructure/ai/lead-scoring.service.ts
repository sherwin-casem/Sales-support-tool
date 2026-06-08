import {
  LeadScoringAgent,
  getDefaultLeadScoringPromptVersion,
} from "@/agents/scoring/lead-scoring.agent.js";
import { getEnv } from "@/lib/config/env.js";
import { createOpenAIClient } from "@/lib/config/openai.client.js";
import { resolveScoringWeights } from "@/lib/config/scoring.config.js";
import { aiLogger } from "@/lib/logging/logger.js";
import { err, ok, type Result } from "@/lib/utils/result.js";
import {
  AgentError,
  LeadScoringError,
} from "@/types/agents/agent-error.types.js";
import type {
  LeadScoreResult,
  LeadScoringInput,
  ScoringWeights,
} from "@/types/agents/lead-scoring.types.js";

export interface LeadScoringPort {
  score(
    input: LeadScoringInput,
  ): Promise<Result<LeadScoreResult, LeadScoringError>>;
}

export interface LeadScoringServiceOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  weights?: Partial<ScoringWeights>;
}

export class LeadScoringService implements LeadScoringPort {
  private readonly maxAttempts: number;
  private readonly initialDelayMs: number;
  private readonly weights: ScoringWeights;

  constructor(
    private readonly agent: LeadScoringAgent,
    private readonly model: string,
    options: LeadScoringServiceOptions = {},
  ) {
    this.maxAttempts = options.maxAttempts ?? 2;
    this.initialDelayMs = options.initialDelayMs ?? 500;
    this.weights = resolveScoringWeights(options.weights);
  }

  async score(
    input: LeadScoringInput,
  ): Promise<Result<LeadScoreResult, LeadScoringError>> {
    const startedAt = Date.now();

    aiLogger.info("LeadScoringService.score started", {
      companyId: input.companyId,
      searchResultId: input.searchResultId,
      searchJobId: input.searchJobId,
      promptVersion: getDefaultLeadScoringPromptVersion(),
      weights: this.weights,
    });

    let lastError: LeadScoringError | undefined;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      const result = await this.agent.execute(input);

      if (result.ok) {
        const durationMs = Date.now() - startedAt;

        aiLogger.info("LeadScoringService.score completed", {
          companyId: input.companyId,
          searchResultId: input.searchResultId,
          durationMs,
          attempt,
          score: result.value.score,
          confidence: result.value.confidence,
        });

        return ok({
          leadScore: result.value,
          meta: {
            promptVersion: getDefaultLeadScoringPromptVersion(),
            modelUsed: this.model,
            scoredAt: new Date().toISOString(),
            weights: this.weights,
          },
        });
      }

      lastError = LeadScoringError.fromAgentError(result.error);

      const retryable =
        result.error.code === "VALIDATION_ERROR" ||
        result.error.code === "OPENAI_ERROR" ||
        result.error.code === "EMPTY_RESPONSE" ||
        result.error.code === "PARSE_ERROR";

      if (!retryable || attempt === this.maxAttempts) {
        break;
      }

      await sleep(this.initialDelayMs * attempt);
    }

    aiLogger.error("LeadScoringService.score failed", {
      companyId: input.companyId,
      searchResultId: input.searchResultId,
      durationMs: Date.now() - startedAt,
      code: lastError?.code,
    });

    return err(
      lastError ?? new LeadScoringError("VALIDATION_ERROR", "Lead scoring failed"),
    );
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let cachedService: LeadScoringService | undefined;

export function createLeadScoringService(
  options: LeadScoringServiceOptions = {},
): LeadScoringService {
  const env = getEnv();
  const openai = createOpenAIClient(env.OPENAI_API_KEY);
  const agent = new LeadScoringAgent(openai, {
    model: env.OPENAI_MODEL,
    weights: options.weights,
  });

  return new LeadScoringService(agent, env.OPENAI_MODEL, options);
}

export function getLeadScoringService(): LeadScoringService {
  if (!cachedService) {
    cachedService = createLeadScoringService();
  }

  return cachedService;
}

export function resetLeadScoringServiceCache(): void {
  cachedService = undefined;
}

export function mapLeadScoringError(error: LeadScoringError): {
  status: number;
  message: string;
  code: AgentError["code"];
} {
  switch (error.code) {
    case "INVALID_INPUT":
      return { status: 400, message: error.message, code: error.code };
    case "VALIDATION_ERROR":
    case "PARSE_ERROR":
      return { status: 422, message: error.message, code: error.code };
    case "OPENAI_ERROR":
    case "EMPTY_RESPONSE":
      return { status: 503, message: error.message, code: error.code };
    default:
      return {
        status: 500,
        message: "Unexpected lead scoring failure",
        code: error.code,
      };
  }
}
