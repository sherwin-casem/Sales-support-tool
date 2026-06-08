import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export interface StructuredChatCompletionParams {
  model: string;
  messages: ChatCompletionMessageParam[];
  schemaName: string;
  schema: Record<string, unknown>;
  temperature?: number;
}

export interface OpenAIClientPort {
  createStructuredCompletion(
    params: StructuredChatCompletionParams,
  ): Promise<string>;
}

export class OpenAIClient implements OpenAIClientPort {
  private readonly client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async createStructuredCompletion(
    params: StructuredChatCompletionParams,
  ): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: params.model,
      temperature: params.temperature ?? 0,
      messages: params.messages,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: params.schemaName,
          strict: true,
          schema: params.schema,
        },
      },
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error("OpenAI returned an empty completion");
    }

    return content;
  }
}

export function createOpenAIClient(apiKey: string): OpenAIClientPort {
  return new OpenAIClient(apiKey);
}
