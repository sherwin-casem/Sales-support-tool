import type { Agent } from "@/agents/base/agent.interface.js";
import { PromptLoader } from "@/agents/shared/prompt-loader.js";
import type { OpenAIClientPort } from "@/lib/config/openai.client.js";
import { wrapUntrustedContent } from "@/lib/security/prompt-safety.js";
import {
  PARSED_QUERY_JSON_SCHEMA,
  ParsedQuerySchema,
  QueryParserInputSchema,
} from "@/lib/validations/query-parser.schema.js";
import { err, ok, type Result } from "@/lib/utils/result.js";
import { AgentError } from "@/types/agents/agent-error.types.js";
import {
  QUERY_PARSER_PROMPT_VERSION,
  type ParsedQuery,
  type QueryParserInput,
} from "@/types/agents/query-parser.types.js";

const SYSTEM_PROMPT_PATH = "discovery/query-parser.system.md";
const USER_PROMPT_PATH = "discovery/query-parser.user.md";
const SCHEMA_NAME = "parsed_query";
const MAX_ATTEMPTS = 2;

export interface QueryParserAgentOptions {
  model: string;
  promptLoader?: PromptLoader;
  maxAttempts?: number;
}

export class QueryParserAgent
  implements Agent<QueryParserInput, ParsedQuery>
{
  private readonly promptLoader: PromptLoader;
  private readonly maxAttempts: number;

  constructor(
    private readonly openai: OpenAIClientPort,
    private readonly options: QueryParserAgentOptions,
  ) {
    this.promptLoader = options.promptLoader ?? new PromptLoader();
    this.maxAttempts = options.maxAttempts ?? MAX_ATTEMPTS;
  }

  async execute(
    input: QueryParserInput,
  ): Promise<Result<ParsedQuery, AgentError>> {
    const parsedInput = QueryParserInputSchema.safeParse(input);

    if (!parsedInput.success) {
      return err(
        new AgentError(
          "INVALID_INPUT",
          parsedInput.error.issues.map((issue) => issue.message).join("; "),
          parsedInput.error,
        ),
      );
    }

    let lastValidationError: AgentError | undefined;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      const completionResult = await this.requestCompletion(parsedInput.data.query);

      if (!completionResult.ok) {
        if (attempt === this.maxAttempts) {
          return completionResult;
        }

        continue;
      }

      const validated = this.validateOutput(completionResult.value);

      if (validated.ok) {
        return validated;
      }

      lastValidationError = validated.error;

      if (attempt === this.maxAttempts) {
        return err(validated.error);
      }
    }

    return err(
      lastValidationError ??
        new AgentError("VALIDATION_ERROR", "Failed to parse query"),
    );
  }

  private async requestCompletion(
    query: string,
  ): Promise<Result<string, AgentError>> {
    try {
      const [systemPrompt, userPrompt] = await Promise.all([
        this.promptLoader.load(SYSTEM_PROMPT_PATH),
        this.promptLoader.loadTemplate(USER_PROMPT_PATH, {
          query: wrapUntrustedContent("query", query),
        }),
      ]);

      const content = await this.openai.createStructuredCompletion({
        model: this.options.model,
        temperature: 0,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        schemaName: SCHEMA_NAME,
        schema: PARSED_QUERY_JSON_SCHEMA,
      });

      if (!content.trim()) {
        return err(new AgentError("EMPTY_RESPONSE", "OpenAI returned empty content"));
      }

      return ok(content);
    } catch (error) {
      return err(
        new AgentError(
          "OPENAI_ERROR",
          error instanceof Error ? error.message : "OpenAI request failed",
          error,
        ),
      );
    }
  }

  private validateOutput(raw: string): Result<ParsedQuery, AgentError> {
    let json: unknown;

    try {
      json = JSON.parse(raw);
    } catch (error) {
      return err(
        new AgentError(
          "PARSE_ERROR",
          "OpenAI response was not valid JSON",
          error,
        ),
      );
    }

    const validated = ParsedQuerySchema.safeParse(json);

    if (!validated.success) {
      return err(
        new AgentError(
          "VALIDATION_ERROR",
          validated.error.issues.map((issue) => issue.message).join("; "),
          validated.error,
        ),
      );
    }

    return ok(validated.data);
  }
}

export function getDefaultPromptVersion(): string {
  return QUERY_PARSER_PROMPT_VERSION;
}
