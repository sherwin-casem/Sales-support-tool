import {
  IntentSignalAgent,
  getDefaultIntentSignalPromptVersion,
} from "@/agents/intent/intent-signal.agent.js";
import { getEnv } from "@/lib/config/env.js";
import { createOpenAIClient } from "@/lib/config/openai.client.js";
import { aiLogger } from "@/lib/logging/logger.js";
import { err, ok, type Result } from "@/lib/utils/result.js";
import { AgentError } from "@/types/agents/agent-error.types.js";
import type {
  DetectedIntentSignal,
  IntentDetectionInput,
} from "@/types/agents/intent-signal.types.js";

export interface IntentDetectionPort {
  detect(input: IntentDetectionInput): Promise<Result<DetectedIntentSignal[], AgentError>>;
}

export class IntentDetectionService implements IntentDetectionPort {
  private readonly maxAttempts: number;

  constructor(
    private readonly agent: IntentSignalAgent,
    private readonly model: string,
    options: { maxAttempts?: number } = {},
  ) {
    this.maxAttempts = options.maxAttempts ?? 2;
  }

  async detect(
    input: IntentDetectionInput,
  ): Promise<Result<DetectedIntentSignal[], AgentError>> {
    let lastError: AgentError | undefined;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      const result = await this.agent.execute(input);

      if (result.ok) {
        aiLogger.info("IntentDetectionService.detect completed", {
          companyId: input.companyId,
          attempt,
          signalCount: result.value.length,
        });
        return result;
      }

      lastError = result.error;
    }

    return err(lastError ?? new AgentError("OPENAI_ERROR", "Intent detection failed"));
  }
}

let cachedService: IntentDetectionService | undefined;

export function getIntentDetectionService(): IntentDetectionService {
  if (!cachedService) {
    const env = getEnv();
    const agent = new IntentSignalAgent(createOpenAIClient(env.OPENAI_API_KEY), {
      model: env.OPENAI_MODEL,
    });
    cachedService = new IntentDetectionService(agent, env.OPENAI_MODEL);
  }

  return cachedService;
}

export function getDefaultIntentDetectionPromptVersion(): string {
  return getDefaultIntentSignalPromptVersion();
}
