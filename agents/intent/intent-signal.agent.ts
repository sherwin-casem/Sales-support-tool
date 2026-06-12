import type { Agent } from "@/agents/base/agent.interface.js";
import { PromptLoader } from "@/agents/shared/prompt-loader.js";
import type { OpenAIClientPort } from "@/lib/config/openai.client.js";
import { aiLogger } from "@/lib/logging/logger.js";
import { wrapUntrustedContent } from "@/lib/security/prompt-safety.js";
import {
  INTENT_DETECTION_JSON_SCHEMA,
  IntentDetectionResponseSchema,
} from "@/lib/validations/intent-signal.schema.js";
import { err, ok, type Result } from "@/lib/utils/result.js";
import { AgentError } from "@/types/agents/agent-error.types.js";
import {
  INTENT_SIGNAL_PROMPT_VERSION,
  type DetectedIntentSignal,
  type IntentDetectionInput,
} from "@/types/agents/intent-signal.types.js";

const SYSTEM_PROMPT_PATH = "intent/intent-signal.system.md";
const USER_PROMPT_PATH = "intent/intent-signal.user.md";
const SCHEMA_NAME = "intent_signals";

export interface IntentSignalAgentOptions {
  model: string;
  promptLoader?: PromptLoader;
  searchContextSize?: "low" | "medium" | "high";
}

export class IntentSignalAgent
  implements Agent<IntentDetectionInput, DetectedIntentSignal[], AgentError>
{
  private readonly promptLoader: PromptLoader;

  constructor(
    private readonly openai: OpenAIClientPort,
    private readonly options: IntentSignalAgentOptions,
  ) {
    this.promptLoader = options.promptLoader ?? new PromptLoader();
  }

  async execute(
    input: IntentDetectionInput,
  ): Promise<Result<DetectedIntentSignal[], AgentError>> {
    try {
      const [systemPrompt, userPrompt] = await Promise.all([
        this.promptLoader.load(SYSTEM_PROMPT_PATH),
        this.promptLoader.loadTemplate(USER_PROMPT_PATH, {
          companyName: wrapUntrustedContent("company_name", input.companyName),
          domain: input.domain,
          website: input.website,
          industry: input.industry ?? "Unknown",
          profileSummary: wrapUntrustedContent("profile_summary", input.profileSummary),
        }),
      ]);

      const content = await this.openai.createWebDiscoveryCompletion({
        model: this.options.model,
        instructions: systemPrompt,
        input: userPrompt,
        schemaName: SCHEMA_NAME,
        schema: INTENT_DETECTION_JSON_SCHEMA,
        searchContextSize: this.options.searchContextSize,
      });

      if (!content.trim()) {
        return ok([]);
      }

      const parsed = JSON.parse(content) as unknown;
      const validated = IntentDetectionResponseSchema.safeParse(parsed);

      if (!validated.success) {
        return err(
          new AgentError(
            "VALIDATION_ERROR",
            validated.error.issues.map((issue) => issue.message).join("; "),
            validated.error,
          ),
        );
      }

      aiLogger.info("IntentSignalAgent.execute completed", {
        companyId: input.companyId,
        signalCount: validated.data.signals.length,
        promptVersion: INTENT_SIGNAL_PROMPT_VERSION,
      });

      return ok(validated.data.signals);
    } catch (error) {
      return err(
        new AgentError(
          "OPENAI_ERROR",
          error instanceof Error ? error.message : "Intent detection request failed",
          error,
        ),
      );
    }
  }
}

export function getDefaultIntentSignalPromptVersion(): string {
  return INTENT_SIGNAL_PROMPT_VERSION;
}
