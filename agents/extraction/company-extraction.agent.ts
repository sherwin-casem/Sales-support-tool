import { createHash } from "node:crypto";
import type { Agent } from "@/agents/base/agent.interface.js";
import { PromptLoader } from "@/agents/shared/prompt-loader.js";
import type { OpenAIClientPort } from "@/lib/config/openai.client.js";
import { wrapUntrustedContent } from "@/lib/security/prompt-safety.js";
import {
  EXTRACTED_COMPANY_JSON_SCHEMA,
  ExtractedCompanySchema,
  CompanyExtractionInputSchema,
} from "@/lib/validations/company-extraction.schema.js";
import { err, ok, type Result } from "@/lib/utils/result.js";
import { AgentError } from "@/types/agents/agent-error.types.js";
import {
  COMPANY_EXTRACTION_PROMPT_VERSION,
  type CompanyExtractionInput,
  type ExtractedCompany,
} from "@/types/agents/company-extraction.types.js";

const SYSTEM_PROMPT_PATH = "extraction/company-profile.system.md";
const USER_PROMPT_PATH = "extraction/company-profile.user.md";
const SCHEMA_NAME = "extracted_company";

export interface CompanyExtractionAgentOptions {
  model: string;
  promptLoader?: PromptLoader;
}

export class CompanyExtractionAgent
  implements Agent<CompanyExtractionInput, ExtractedCompany>
{
  private readonly promptLoader: PromptLoader;

  constructor(
    private readonly openai: OpenAIClientPort,
    private readonly options: CompanyExtractionAgentOptions,
  ) {
    this.promptLoader = options.promptLoader ?? new PromptLoader();
  }

  // Single attempt by design: retries live at the service layer only.
  async execute(
    input: CompanyExtractionInput,
  ): Promise<Result<ExtractedCompany, AgentError>> {
    const parsedInput = CompanyExtractionInputSchema.safeParse(input);

    if (!parsedInput.success) {
      return err(
        new AgentError(
          "INVALID_INPUT",
          parsedInput.error.issues.map((issue) => issue.message).join("; "),
          parsedInput.error,
        ),
      );
    }

    const completionResult = await this.requestCompletion(parsedInput.data);

    if (!completionResult.ok) {
      return completionResult;
    }

    return this.validateOutput(completionResult.value);
  }

  private async requestCompletion(
    input: CompanyExtractionInput,
  ): Promise<Result<string, AgentError>> {
    try {
      const [systemPrompt, userPrompt] = await Promise.all([
        this.promptLoader.load(SYSTEM_PROMPT_PATH),
        this.promptLoader.loadTemplate(USER_PROMPT_PATH, {
          domain: input.domain,
          content: wrapUntrustedContent("website_content", input.content),
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
        schema: EXTRACTED_COMPANY_JSON_SCHEMA,
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

  private validateOutput(raw: string): Result<ExtractedCompany, AgentError> {
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

    const validated = ExtractedCompanySchema.safeParse(json);

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

export function getDefaultExtractionPromptVersion(): string {
  return COMPANY_EXTRACTION_PROMPT_VERSION;
}

export function hashExtractionContent(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}
