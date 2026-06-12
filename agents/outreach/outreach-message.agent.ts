import type { Agent } from "@/agents/base/agent.interface.js";
import { PromptLoader } from "@/agents/shared/prompt-loader.js";
import type { OpenAIClientPort } from "@/lib/config/openai.client.js";
import { aiLogger } from "@/lib/logging/logger.js";
import { wrapUntrustedContent } from "@/lib/security/prompt-safety.js";
import {
  OUTREACH_MESSAGE_JSON_SCHEMA,
  OutreachMessageOutputSchema,
} from "@/lib/validations/outreach-message.schema.js";
import { err, ok, type Result } from "@/lib/utils/result.js";
import { AgentError } from "@/types/agents/agent-error.types.js";
import {
  OUTREACH_MESSAGE_PROMPT_VERSION,
  type OutreachMessageInput,
} from "@/types/agents/outreach-message.types.js";

const SYSTEM_PROMPT_PATH = "outreach/outreach-message.system.md";
const USER_PROMPT_PATH = "outreach/outreach-message.user.md";
const SCHEMA_NAME = "outreach_message";

export interface OutreachMessageOutput {
  subject: string;
  bodyText: string;
  bodyHtml?: string | null;
}

export interface OutreachMessageAgentOptions {
  model: string;
  promptLoader?: PromptLoader;
}

export class OutreachMessageAgent
  implements Agent<OutreachMessageInput, OutreachMessageOutput, AgentError>
{
  private readonly promptLoader: PromptLoader;

  constructor(
    private readonly openai: OpenAIClientPort,
    private readonly options: OutreachMessageAgentOptions,
  ) {
    this.promptLoader = options.promptLoader ?? new PromptLoader();
  }

  async execute(
    input: OutreachMessageInput,
  ): Promise<Result<OutreachMessageOutput, AgentError>> {
    try {
      const [systemPrompt, userPrompt] = await Promise.all([
        this.promptLoader.load(SYSTEM_PROMPT_PATH),
        this.promptLoader.loadTemplate(USER_PROMPT_PATH, {
          salespersonName: input.salespersonName,
          tone: input.tone,
          channel: input.channel,
          servicesCatalog: wrapUntrustedContent("services_catalog", input.servicesCatalog),
          searchCriteria: wrapUntrustedContent("search_criteria", input.searchCriteria),
          companyProfile: wrapUntrustedContent("company_profile", input.companyProfile),
          intentSignals: wrapUntrustedContent("intent_signals", input.intentSignals),
        }),
      ]);

      const content = await this.openai.createStructuredCompletion({
        model: this.options.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        schemaName: SCHEMA_NAME,
        schema: OUTREACH_MESSAGE_JSON_SCHEMA,
      });

      const parsed = JSON.parse(content) as unknown;
      const validated = OutreachMessageOutputSchema.safeParse(parsed);

      if (!validated.success) {
        return err(
          new AgentError(
            "VALIDATION_ERROR",
            validated.error.issues.map((issue) => issue.message).join("; "),
            validated.error,
          ),
        );
      }

      aiLogger.info("OutreachMessageAgent.execute completed", {
        promptVersion: OUTREACH_MESSAGE_PROMPT_VERSION,
      });

      return ok(validated.data);
    } catch (error) {
      return err(
        new AgentError(
          "OPENAI_ERROR",
          error instanceof Error ? error.message : "Outreach message request failed",
          error,
        ),
      );
    }
  }
}

export function getDefaultOutreachMessagePromptVersion(): string {
  return OUTREACH_MESSAGE_PROMPT_VERSION;
}
