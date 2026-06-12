import type { Agent } from "@/agents/base/agent.interface.js";
import { PromptLoader } from "@/agents/shared/prompt-loader.js";
import type { OpenAIClientPort } from "@/lib/config/openai.client.js";
import { aiLogger } from "@/lib/logging/logger.js";
import { wrapUntrustedContent } from "@/lib/security/prompt-safety.js";
import {
  LeadEnrichmentInputSchema,
  LEAD_ENRICHMENT_JSON_SCHEMA,
  LeadEnrichmentResponseSchema,
} from "@/lib/validations/lead-enrichment.schema.js";
import { err, ok, type Result } from "@/lib/utils/result.js";
import { AgentError } from "@/types/agents/agent-error.types.js";
import type { ExtractedCompany } from "@/types/agents/company-extraction.types.js";
import {
  LEAD_ENRICHMENT_PROMPT_VERSION,
  type LeadEnrichmentInput,
} from "@/types/agents/lead-enrichment.types.js";

const SYSTEM_PROMPT_PATH = "enrichment/lead-enrichment.system.md";
const USER_PROMPT_PATH = "enrichment/lead-enrichment.user.md";
const SCHEMA_NAME = "lead_enrichment";

export interface LeadEnrichmentAgentOptions {
  model: string;
  promptLoader?: PromptLoader;
  searchContextSize?: "low" | "medium" | "high";
}

export class LeadEnrichmentAgent
  implements Agent<LeadEnrichmentInput, ExtractedCompany, AgentError>
{
  private readonly promptLoader: PromptLoader;

  constructor(
    private readonly openai: OpenAIClientPort,
    private readonly options: LeadEnrichmentAgentOptions,
  ) {
    this.promptLoader = options.promptLoader ?? new PromptLoader();
  }

  // Single attempt by design: retries live at the service layer only.
  async execute(
    input: LeadEnrichmentInput,
  ): Promise<Result<ExtractedCompany, AgentError>> {
    const parsedInput = LeadEnrichmentInputSchema.safeParse(input);

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

    const validated = this.validateOutput(completionResult.value);

    if (validated.ok) {
      aiLogger.info("LeadEnrichmentAgent.execute completed", {
        companyId: parsedInput.data.companyId,
        domain: parsedInput.data.domain,
        promptVersion: LEAD_ENRICHMENT_PROMPT_VERSION,
      });
    }

    return validated;
  }

  private async requestCompletion(
    input: LeadEnrichmentInputValidated,
  ): Promise<Result<string, AgentError>> {
    try {
      const [systemPrompt, userPrompt] = await Promise.all([
        this.promptLoader.load(SYSTEM_PROMPT_PATH),
        this.promptLoader.loadTemplate(USER_PROMPT_PATH, {
          companyName: wrapUntrustedContent("company_name", input.companyName),
          website: input.website,
          domain: input.domain,
          websiteProfile: wrapUntrustedContent(
            "website_profile",
            JSON.stringify(input.websiteProfile, null, 2),
          ),
        }),
      ]);

      const content = await this.openai.createWebDiscoveryCompletion({
        model: this.options.model,
        instructions: systemPrompt,
        input: userPrompt,
        schemaName: SCHEMA_NAME,
        schema: LEAD_ENRICHMENT_JSON_SCHEMA,
        searchContextSize: this.options.searchContextSize,
      });

      if (!content.trim()) {
        return err(new AgentError("EMPTY_RESPONSE", "OpenAI returned empty content"));
      }

      return ok(content);
    } catch (error) {
      return err(
        new AgentError(
          "OPENAI_ERROR",
          error instanceof Error ? error.message : "OpenAI enrichment request failed",
          error,
        ),
      );
    }
  }

  private validateOutput(content: string): Result<ExtractedCompany, AgentError> {
    let parsed: unknown;

    try {
      parsed = JSON.parse(content);
    } catch (error) {
      return err(
        new AgentError(
          "VALIDATION_ERROR",
          "OpenAI returned invalid JSON for lead enrichment",
          error,
        ),
      );
    }

    const validated = LeadEnrichmentResponseSchema.safeParse(parsed);

    if (!validated.success) {
      return err(
        new AgentError(
          "VALIDATION_ERROR",
          validated.error.issues.map((issue) => issue.message).join("; "),
          validated.error,
        ),
      );
    }

    return ok(validated.data.profile);
  }
}

type LeadEnrichmentInputValidated = {
  companyName: string;
  domain: string;
  website: string;
  websiteProfile: ExtractedCompany;
  companyId: string;
};

export function getDefaultLeadEnrichmentPromptVersion(): string {
  return LEAD_ENRICHMENT_PROMPT_VERSION;
}
