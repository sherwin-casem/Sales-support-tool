import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryParserAgent } from "@/agents/discovery/query-parser.agent.js";
import { PromptLoader } from "@/agents/shared/prompt-loader.js";
import type { OpenAIClientPort } from "@/lib/config/openai.client.js";

describe("QueryParserAgent", () => {
  let agent: QueryParserAgent;
  let createStructuredCompletion: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "query-parser-agent-"));
    const promptsRoot = path.join(tempDir, "prompts");
    await mkdir(path.join(promptsRoot, "discovery"), { recursive: true });
    await writeFile(
      path.join(promptsRoot, "discovery", "query-parser.system.md"),
      "system prompt",
      "utf8",
    );
    await writeFile(
      path.join(promptsRoot, "discovery", "query-parser.user.md"),
      "Query: {{query}}",
      "utf8",
    );

    createStructuredCompletion = vi.fn();
    const openai: OpenAIClientPort = {
      createStructuredCompletion,
      createWebDiscoveryCompletion: vi.fn(),
    };

    agent = new QueryParserAgent(openai, {
      model: "gpt-4o-mini",
      promptLoader: new PromptLoader(promptsRoot),
    });
  });

  it("returns parsed query for valid OpenAI response", async () => {
    createStructuredCompletion.mockResolvedValue(
      JSON.stringify({
        industry: "logistics",
        location: "Finland",
        employeeRange: "50-200",
      }),
    );

    const result = await agent.execute({
      query: "Find logistics companies in Finland with 50-200 employees.",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({
        industry: "logistics",
        location: "Finland",
        employeeRange: "50-200",
      });
    }

    expect(createStructuredCompletion).toHaveBeenCalledOnce();
  });

  it("returns validation error for invalid JSON shape without retrying", async () => {
    createStructuredCompletion.mockResolvedValue(
      JSON.stringify({
        industry: "logistics",
        location: "Finland",
        employeeRange: "invalid-range",
      }),
    );

    const result = await agent.execute({
      query: "Find logistics companies in Finland with 50-200 employees.",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
    expect(createStructuredCompletion).toHaveBeenCalledOnce();
  });

  it("returns invalid input error for empty query", async () => {
    const result = await agent.execute({ query: "   " });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_INPUT");
    }
    expect(createStructuredCompletion).not.toHaveBeenCalled();
  });

  it("returns openai error when API call fails", async () => {
    createStructuredCompletion.mockRejectedValue(new Error("rate limit exceeded"));

    const result = await agent.execute({
      query: "Find logistics companies in Finland with 50-200 employees.",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("OPENAI_ERROR");
      expect(result.error.message).toContain("rate limit exceeded");
    }
  });

  it("returns parse error for non-json response", async () => {
    createStructuredCompletion.mockResolvedValue("not-json");

    const result = await agent.execute({
      query: "Find logistics companies in Finland with 50-200 employees.",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("PARSE_ERROR");
    }
  });
});
