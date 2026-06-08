import {
  CompanyExtractionAgent,
  getDefaultExtractionPromptVersion,
  hashExtractionContent,
} from "@/agents/extraction/company-extraction.agent.js";
import { getEnv } from "@/lib/config/env.js";
import { createOpenAIClient } from "@/lib/config/openai.client.js";
import { aiLogger } from "@/lib/logging/logger.js";
import { computeExtractionCompleteness } from "@/lib/validations/company-extraction.schema.js";
import { err, ok, type Result } from "@/lib/utils/result.js";
import {
  AgentError,
  CompanyExtractionError,
} from "@/types/agents/agent-error.types.js";
import type {
  CompanyExtractionInput,
  ExtractedCompanyResult,
} from "@/types/agents/company-extraction.types.js";

export interface CompanyExtractionPort {
  extract(
    input: CompanyExtractionInput,
  ): Promise<Result<ExtractedCompanyResult, CompanyExtractionError>>;
}

export interface CompanyExtractionServiceOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
}

export class CompanyExtractionService implements CompanyExtractionPort {
  private readonly maxAttempts: number;
  private readonly initialDelayMs: number;

  constructor(
    private readonly agent: CompanyExtractionAgent,
    private readonly model: string,
    options: CompanyExtractionServiceOptions = {},
  ) {
    this.maxAttempts = options.maxAttempts ?? 2;
    this.initialDelayMs = options.initialDelayMs ?? 500;
  }

  async extract(
    input: CompanyExtractionInput,
  ): Promise<Result<ExtractedCompanyResult, CompanyExtractionError>> {
    const startedAt = Date.now();
    const contentHash = hashExtractionContent(input.content);

    aiLogger.info("CompanyExtractionService.extract started", {
      companyId: input.companyId,
      domain: input.domain,
      contentLength: input.content.length,
      promptVersion: getDefaultExtractionPromptVersion(),
      contentHash,
    });

    let lastError: CompanyExtractionError | undefined;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      const result = await this.agent.execute(input);

      if (result.ok) {
        const extracted = result.value;
        const completeness = computeExtractionCompleteness(extracted);
        const durationMs = Date.now() - startedAt;

        aiLogger.info("CompanyExtractionService.extract completed", {
          companyId: input.companyId,
          domain: input.domain,
          durationMs,
          attempt,
          companyName: extracted.companyName,
          industry: extracted.industry,
          completeness,
          productsCount: extracted.products.length,
          servicesCount: extracted.services.length,
        });

        return ok({
          profile: extracted,
          meta: {
            promptVersion: getDefaultExtractionPromptVersion(),
            modelUsed: this.model,
            contentHash,
            extractedAt: new Date().toISOString(),
            completeness,
          },
        });
      }

      lastError = CompanyExtractionError.fromAgentError(result.error);

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

    aiLogger.error("CompanyExtractionService.extract failed", {
      companyId: input.companyId,
      domain: input.domain,
      durationMs: Date.now() - startedAt,
      code: lastError?.code,
    });

    return err(
      lastError ??
        new CompanyExtractionError("VALIDATION_ERROR", "Company extraction failed"),
    );
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let cachedService: CompanyExtractionService | undefined;

export function createCompanyExtractionService(): CompanyExtractionService {
  const env = getEnv();
  const openai = createOpenAIClient(env.OPENAI_API_KEY);
  const agent = new CompanyExtractionAgent(openai, { model: env.OPENAI_MODEL });

  return new CompanyExtractionService(agent, env.OPENAI_MODEL);
}

export function getCompanyExtractionService(): CompanyExtractionService {
  if (!cachedService) {
    cachedService = createCompanyExtractionService();
  }

  return cachedService;
}

export function resetCompanyExtractionServiceCache(): void {
  cachedService = undefined;
}

export function mapCompanyExtractionError(error: CompanyExtractionError): {
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
        message: "Unexpected company extraction failure",
        code: error.code,
      };
  }
}
