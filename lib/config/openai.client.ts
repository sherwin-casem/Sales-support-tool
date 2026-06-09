import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export interface StructuredChatCompletionParams {
  model: string;
  messages: ChatCompletionMessageParam[];
  schemaName: string;
  schema: Record<string, unknown>;
  temperature?: number;
}

export interface WebDiscoveryCompletionParams {
  model: string;
  instructions: string;
  input: string;
  schemaName: string;
  schema: Record<string, unknown>;
  searchContextSize?: "low" | "medium" | "high";
}

export interface OpenAIClientPort {
  createStructuredCompletion(
    params: StructuredChatCompletionParams,
  ): Promise<string>;
  createWebDiscoveryCompletion(
    params: WebDiscoveryCompletionParams,
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

  async createWebDiscoveryCompletion(
    params: WebDiscoveryCompletionParams,
  ): Promise<string> {
    const response = await this.client.responses.create({
      model: params.model,
      instructions: params.instructions,
      input: params.input,
      tools: [
        {
          type: "web_search",
          search_context_size: params.searchContextSize ?? "medium",
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: params.schemaName,
          strict: true,
          schema: params.schema,
        },
      },
    });

    const content = response.output_text;

    if (!content?.trim()) {
      throw new Error("OpenAI returned an empty web discovery response");
    }

    return content;
  }
}

export function createOpenAIClient(apiKey: string): OpenAIClientPort {
  return new OpenAIClient(apiKey);
}
