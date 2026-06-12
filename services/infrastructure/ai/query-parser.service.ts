import {
  QueryParserAgent,
  getDefaultPromptVersion,
} from "@/agents/discovery/query-parser.agent.js";
import { getEnv } from "@/lib/config/env.js";
import { createOpenAIClient } from "@/lib/config/openai.client.js";
import { aiLogger } from "@/lib/logging/logger.js";
import { err, ok, type Result } from "@/lib/utils/result.js";
import { AgentError, QueryParserError } from "@/types/agents/agent-error.types.js";
import type { ParsedQuery } from "@/types/agents/query-parser.types.js";

export interface QueryParserPort {
  parse(query: string): Promise<Result<ParsedQuery, QueryParserError>>;
}

export interface QueryParserServiceOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
}

const RETRYABLE_CODES: ReadonlySet<AgentError["code"]> = new Set([
  "OPENAI_ERROR",
  "EMPTY_RESPONSE",
  "VALIDATION_ERROR",
  "PARSE_ERROR",
]);

export class QueryParserService implements QueryParserPort {
  private readonly maxAttempts: number;
  private readonly initialDelayMs: number;

  constructor(
    private readonly agent: QueryParserAgent,
    options: QueryParserServiceOptions = {},
  ) {
    this.maxAttempts = options.maxAttempts ?? 2;
    this.initialDelayMs = options.initialDelayMs ?? 500;
  }

  async parse(query: string): Promise<Result<ParsedQuery, QueryParserError>> {
    const startedAt = Date.now();

    aiLogger.info("QueryParserService.parse started", {
      queryLength: query.length,
      promptVersion: getDefaultPromptVersion(),
    });

    let lastError: QueryParserError | undefined;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      const result = await this.agent.execute({ query });

      if (result.ok) {
        aiLogger.info("QueryParserService.parse completed", {
          durationMs: Date.now() - startedAt,
          attempt,
          industry: result.value.industry,
          location: result.value.location,
          employeeRange: result.value.employeeRange,
        });

        return ok(result.value);
      }

      lastError = QueryParserError.fromAgentError(result.error);

      if (!RETRYABLE_CODES.has(result.error.code) || attempt === this.maxAttempts) {
        break;
      }

      await sleep(this.initialDelayMs * attempt);
    }

    aiLogger.error("QueryParserService.parse failed", {
      code: lastError?.code,
      durationMs: Date.now() - startedAt,
      queryLength: query.length,
    });

    return err(
      lastError ?? new QueryParserError("VALIDATION_ERROR", "Query parsing failed"),
    );
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let cachedService: QueryParserService | undefined;

export function createQueryParserService(): QueryParserService {
  const env = getEnv();
  const openai = createOpenAIClient(env.OPENAI_API_KEY);
  const agent = new QueryParserAgent(openai, { model: env.OPENAI_MODEL });

  return new QueryParserService(agent);
}

export function getQueryParserService(): QueryParserService {
  if (!cachedService) {
    cachedService = createQueryParserService();
  }

  return cachedService;
}

export function resetQueryParserServiceCache(): void {
  cachedService = undefined;
}

export function mapQueryParserError(error: QueryParserError): {
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
      return { status: 500, message: "Unexpected query parser failure", code: error.code };
  }
}
