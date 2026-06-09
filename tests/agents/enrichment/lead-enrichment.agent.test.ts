import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LeadEnrichmentAgent } from "@/agents/enrichment/lead-enrichment.agent.js";
import { PromptLoader } from "@/agents/shared/prompt-loader.js";
import type { OpenAIClientPort } from "@/lib/config/openai.client.js";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import type { ExtractedCompany } from "@/types/agents/company-extraction.types.js";

const companyId = "00000000-0000-4000-8000-000000000001";

const websiteProfile: ExtractedCompany = {
  companyName: "Acme Logistics Oy",
  description: "Freight provider in Finland.",
  industry: "logistics",
  products: ["Tracking Platform"],
  services: ["Freight forwarding"],
  targetCustomers: ["Manufacturers"],
  estimatedCompanySize: "unknown",
  city: "unknown",
  country: "unknown",
  decisionMaker: "unknown",
  linkedInUrl: null,
  xUrl: null,
  email: null,
  revenue: "unknown",
};

describe("LeadEnrichmentAgent", () => {
  let agent: LeadEnrichmentAgent;
  let createWebDiscoveryCompletion: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "lead-enrichment-agent-"));
    const promptsRoot = path.join(tempDir, "prompts");
    await mkdir(path.join(promptsRoot, "enrichment"), { recursive: true });
    await writeFile(
      path.join(promptsRoot, "enrichment", "lead-enrichment.system.md"),
      "system prompt",
      "utf8",
    );
    await writeFile(
      path.join(promptsRoot, "enrichment", "lead-enrichment.user.md"),
      "Company: {{companyName}}\nWebsite: {{website}}\nDomain: {{domain}}\nProfile: {{websiteProfile}}",
      "utf8",
    );

    createWebDiscoveryCompletion = vi.fn();
    const openai: OpenAIClientPort = {
      createStructuredCompletion: vi.fn(),
      createWebDiscoveryCompletion,
    };

    agent = new LeadEnrichmentAgent(openai, {
      model: "gpt-4o",
      promptLoader: new PromptLoader(promptsRoot),
      maxAttempts: 2,
    });
  });

  it("returns enriched profile for valid OpenAI response", async () => {
    createWebDiscoveryCompletion.mockResolvedValue(
      JSON.stringify({
        profile: {
          ...websiteProfile,
          city: "Helsinki",
          country: "Finland",
          decisionMaker: "Jane Doe, CEO",
          linkedInUrl: "https://linkedin.com/company/acme",
          email: "info@acme.fi",
        },
      }),
    );

    const result = await agent.execute({
      companyId,
      companyName: "Acme Logistics Oy",
      domain: "acme.fi",
      website: "https://acme.fi",
      websiteProfile,
    });

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.value.city).toBe("helsinki");
      expect(result.value.country).toBe("finland");
      expect(result.value.email).toBe("info@acme.fi");
    }

    expect(createWebDiscoveryCompletion).toHaveBeenCalledOnce();
    expect(createWebDiscoveryCompletion.mock.calls[0]?.[0].schemaName).toBe("lead_enrichment");
  });

  it("returns validation error for invalid input", async () => {
    const result = await agent.execute({
      companyId: "not-a-uuid",
      companyName: "Acme",
      domain: "acme.fi",
      website: "https://acme.fi",
      websiteProfile,
    });

    expect(result.ok).toBe(false);
    expect(createWebDiscoveryCompletion).not.toHaveBeenCalled();
  });

  it("retries when OpenAI returns invalid JSON", async () => {
    createWebDiscoveryCompletion
      .mockResolvedValueOnce("not json")
      .mockResolvedValueOnce(
        JSON.stringify({
          profile: {
            ...websiteProfile,
            city: "Helsinki",
          },
        }),
      );

    const result = await agent.execute({
      companyId,
      companyName: "Acme Logistics Oy",
      domain: "acme.fi",
      website: "https://acme.fi",
      websiteProfile,
    });

    expect(result.ok).toBe(true);
    expect(createWebDiscoveryCompletion).toHaveBeenCalledTimes(2);
  });
});
