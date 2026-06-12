import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OutreachMessageAgent } from "@/agents/outreach/outreach-message.agent.js";
import { PromptLoader } from "@/agents/shared/prompt-loader.js";
import type { OpenAIClientPort } from "@/lib/config/openai.client.js";

describe("OutreachMessageAgent", () => {
  let agent: OutreachMessageAgent;
  let createStructuredCompletion: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "outreach-message-agent-"));
    const promptsRoot = path.join(tempDir, "prompts");
    await mkdir(path.join(promptsRoot, "outreach"), { recursive: true });
    await writeFile(
      path.join(promptsRoot, "outreach", "outreach-message.system.md"),
      "system prompt",
      "utf8",
    );
    await writeFile(
      path.join(promptsRoot, "outreach", "outreach-message.user.md"),
      "Name: {{salespersonName}}",
      "utf8",
    );

    createStructuredCompletion = vi.fn();
    const openai: OpenAIClientPort = {
      createStructuredCompletion,
      createWebDiscoveryCompletion: vi.fn(),
    };

    agent = new OutreachMessageAgent(openai, {
      model: "gpt-4o-mini",
      promptLoader: new PromptLoader(promptsRoot),
    });
  });

  it("returns generated message for valid OpenAI response", async () => {
    createStructuredCompletion.mockResolvedValue(
      JSON.stringify({
        subject: "Quick intro",
        bodyText: "Hello from Parijat",
        bodyHtml: null,
      }),
    );

    const result = await agent.execute({
      salespersonName: "Alex",
      tone: "professional",
      channel: "EMAIL",
      servicesCatalog: "[]",
      searchCriteria: "{}",
      companyProfile: "{}",
      intentSignals: "[]",
    });

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.value.subject).toBe("Quick intro");
      expect(result.value.bodyHtml).toBeNull();
    }
  });

  it("returns validation error for invalid OpenAI response", async () => {
    createStructuredCompletion.mockResolvedValue(
      JSON.stringify({
        subject: "",
        bodyText: "Hello",
        bodyHtml: null,
      }),
    );

    const result = await agent.execute({
      salespersonName: "Alex",
      tone: "professional",
      channel: "EMAIL",
      servicesCatalog: "[]",
      searchCriteria: "{}",
      companyProfile: "{}",
      intentSignals: "[]",
    });

    expect(result.ok).toBe(false);
  });

  it("returns OpenAI error when completion fails", async () => {
    createStructuredCompletion.mockRejectedValue(new Error("400 Invalid schema"));

    const result = await agent.execute({
      salespersonName: "Alex",
      tone: "professional",
      channel: "EMAIL",
      servicesCatalog: "[]",
      searchCriteria: "{}",
      companyProfile: "{}",
      intentSignals: "[]",
    });

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.error.code).toBe("OPENAI_ERROR");
      expect(result.error.message).toContain("400 Invalid schema");
    }
  });
});
