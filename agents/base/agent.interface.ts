import type { Result } from "@/lib/utils/result.js";
import type { AgentError } from "@/types/agents/agent-error.types.js";

export interface Agent<TInput, TOutput, TError = AgentError> {
  execute(input: TInput): Promise<Result<TOutput, TError>>;
}
