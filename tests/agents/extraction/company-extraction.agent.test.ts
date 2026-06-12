import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CompanyExtractionAgent } from "@/agents/extraction/company-extraction.agent.js";
import { PromptLoader } from "@/agents/shared/prompt-loader.js";
import type { OpenAIClientPort } from "@/lib/config/openai.client.js";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";

const fixtureDir = path.dirname(fileURLToPath(import.meta.url));

function loadFixture(name: string): string {
  return readFileSync(path.join(fixtureDir, "../../fixtures/extraction", name), "utf8");
}

describe("CompanyExtractionAgent", () => {
  let agent: CompanyExtractionAgent;
  let createStructuredCompletion: ReturnType<typeof vi.fn>;
  const companyId = "00000000-0000-4000-8000-000000000001";

  beforeEach(async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "company-extraction-agent-"));
    const promptsRoot = path.join(tempDir, "prompts");
    await mkdir(path.join(promptsRoot, "extraction"), { recursive: true });
    await writeFile(
      path.join(promptsRoot, "extraction", "company-profile.system.md"),
      "system prompt",
      "utf8",
    );
    await writeFile(
      path.join(promptsRoot, "extraction", "company-profile.user.md"),
      "Domain: {{domain}}\nContent: {{content}}",
      "utf8",
    );

    createStructuredCompletion = vi.fn();
    const openai: OpenAIClientPort = {
      createStructuredCompletion,
      createWebDiscoveryCompletion: vi.fn(),
    };

    agent = new CompanyExtractionAgent(openai, {
      model: "gpt-4o",
      promptLoader: new PromptLoader(promptsRoot),
    });
  });

  it("returns extracted company for valid OpenAI response", async () => {
    createStructuredCompletion.mockResolvedValue(
      JSON.stringify({
        companyName: "Acme Logistics Oy",
        description: "Freight and warehousing provider in Finland.",
        industry: "logistics",
        products: ["Tracking Platform"],
        services: ["Freight forwarding", "Warehousing", "Cross-border logistics"],
        targetCustomers: ["Manufacturers", "Retailers"],
        estimatedCompanySize: "100-200",
      }),
    );

    const content = loadFixture("acme-llm-ready.txt");
    const result = await agent.execute({
      content,
      domain: "acme.fi",
      companyId,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.companyName).toBe("Acme Logistics Oy");
      expect(result.value.industry).toBe("logistics");
      expect(result.value.services).toHaveLength(3);
    }

    expect(createStructuredCompletion).toHaveBeenCalledOnce();
    expect(createStructuredCompletion.mock.calls[0]?.[0].schemaName).toBe("extracted_company");
  });

  it("returns validation error for invalid company size without retrying", async () => {
    createStructuredCompletion.mockResolvedValue(
      JSON.stringify({
        companyName: "Acme Logistics Oy",
        description: "Freight and warehousing provider in Finland.",
        industry: "logistics",
        products: [],
        services: ["Freight forwarding"],
        targetCustomers: [],
        estimatedCompanySize: "many employees",
      }),
    );

    const content = loadFixture("acme-llm-ready.txt");
    const result = await agent.execute({
      content,
      domain: "acme.fi",
      companyId,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
    expect(createStructuredCompletion).toHaveBeenCalledOnce();
  });

  it("returns invalid input for short content", async () => {
    const result = await agent.execute({
      content: "short",
      domain: "acme.fi",
      companyId,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_INPUT");
    }

    expect(createStructuredCompletion).not.toHaveBeenCalled();
  });

  it("returns openai error when API call fails", async () => {
    createStructuredCompletion.mockRejectedValue(new Error("rate limit exceeded"));

    const content = loadFixture("acme-llm-ready.txt");
    const result = await agent.execute({
      content,
      domain: "acme.fi",
      companyId,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("OPENAI_ERROR");
    }
  });
});
