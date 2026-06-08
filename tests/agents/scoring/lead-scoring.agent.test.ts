import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LeadScoringAgent } from "@/agents/scoring/lead-scoring.agent.js";
import { PromptLoader } from "@/agents/shared/prompt-loader.js";
import type { OpenAIClientPort } from "@/lib/config/openai.client.js";

const companyId = "00000000-0000-4000-8000-000000000001";
const searchResultId = "00000000-0000-4000-8000-000000000002";
const searchJobId = "00000000-0000-4000-8000-000000000003";

const profile = {
  companyName: "Acme Logistics Oy",
  description:
    "Leading freight and warehousing provider established since 1998, serving enterprise customers across Finland.",
  industry: "logistics",
  products: ["Tracking Platform"],
  services: ["Freight forwarding", "Warehousing", "Cross-border logistics"],
  targetCustomers: ["Manufacturers", "Retailers"],
  estimatedCompanySize: "100-200",
};

describe("LeadScoringAgent", () => {
  let agent: LeadScoringAgent;
  let createStructuredCompletion: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "lead-scoring-agent-"));
    const promptsRoot = path.join(tempDir, "prompts");
    await mkdir(path.join(promptsRoot, "scoring"), { recursive: true });
    await writeFile(
      path.join(promptsRoot, "scoring", "lead-scoring.system.md"),
      "system prompt",
      "utf8",
    );
    await writeFile(
      path.join(promptsRoot, "scoring", "lead-scoring.user.md"),
      "Criteria: {{criteriaIndustry}} Profile: {{profileJson}} Score: {{totalScore}}",
      "utf8",
    );

    createStructuredCompletion = vi.fn();
    const openai: OpenAIClientPort = { createStructuredCompletion };

    agent = new LeadScoringAgent(openai, {
      model: "gpt-4o",
      promptLoader: new PromptLoader(promptsRoot),
      maxAttempts: 2,
    });
  });

  it("returns deterministic score with AI explanation", async () => {
    createStructuredCompletion.mockResolvedValue(
      JSON.stringify({
        explanation:
          "Acme Logistics is a strong match for your logistics search in Finland with employee count aligned to your 50-200 target range.",
      }),
    );

    const result = await agent.execute({
      profile,
      criteria: {
        industry: "logistics",
        location: "Finland",
        employeeRange: "50-200",
      },
      companyId,
      searchResultId,
      searchJobId,
      profileCompleteness: 0.9,
    });

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.value.score).toBeGreaterThan(70);
      expect(result.value.confidence).toBeGreaterThan(0);
      expect(result.value.explanation).toContain("Acme Logistics");
      expect(result.value.breakdown.industryFit.score).toBe(100);
      expect(result.value.breakdown.sizeFit.score).toBe(100);
    }

    expect(createStructuredCompletion).toHaveBeenCalledOnce();
    expect(createStructuredCompletion.mock.calls[0]?.[0].schemaName).toBe(
      "lead_score_explanation",
    );
  });

  it("uses fallback explanation when OpenAI fails", async () => {
    createStructuredCompletion.mockRejectedValue(new Error("rate limit exceeded"));

    const result = await agent.execute({
      profile,
      criteria: {
        industry: "logistics",
        location: "Finland",
        employeeRange: "50-200",
      },
      companyId,
      searchResultId,
      searchJobId,
      profileCompleteness: 0.9,
    });

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.value.explanation).toContain("Acme Logistics Oy");
      expect(result.value.explanation).toContain("/100");
    }
  });

  it("retries when explanation validation fails", async () => {
    createStructuredCompletion
      .mockResolvedValueOnce(JSON.stringify({ explanation: "too short" }))
      .mockResolvedValueOnce(
        JSON.stringify({
          explanation:
            "Acme Logistics scores well on industry and size fit, making it a strong lead for logistics companies in the 50-200 employee range.",
        }),
      );

    const result = await agent.execute({
      profile,
      criteria: {
        industry: "logistics",
        location: "Finland",
        employeeRange: "50-200",
      },
      companyId,
      searchResultId,
      searchJobId,
    });

    expect(result.ok).toBe(true);
    expect(createStructuredCompletion).toHaveBeenCalledTimes(2);
  });

  it("returns invalid input for malformed profile", async () => {
    const result = await agent.execute({
      profile: {
        ...profile,
        estimatedCompanySize: "lots of people",
      },
      criteria: {
        industry: "logistics",
        location: "Finland",
        employeeRange: "50-200",
      },
      companyId,
      searchResultId,
      searchJobId,
    });

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_INPUT");
    }

    expect(createStructuredCompletion).not.toHaveBeenCalled();
  });

  it("applies custom weights to breakdown", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "lead-scoring-weight-"));
    const promptsRoot = path.join(tempDir, "prompts");
    await mkdir(path.join(promptsRoot, "scoring"), { recursive: true });
    await writeFile(
      path.join(promptsRoot, "scoring", "lead-scoring.system.md"),
      "system prompt",
      "utf8",
    );
    await writeFile(
      path.join(promptsRoot, "scoring", "lead-scoring.user.md"),
      "Criteria: {{criteriaIndustry}}",
      "utf8",
    );

    const weightedAgent = new LeadScoringAgent(
      {
        createStructuredCompletion: vi.fn().mockResolvedValue(
          JSON.stringify({
            explanation:
              "Custom weights were applied while scoring this lead for logistics companies in Finland with aligned employee count.",
          }),
        ),
      },
      {
        model: "gpt-4o",
        promptLoader: new PromptLoader(promptsRoot),
        weights: {
          industryFit: 0.5,
          sizeFit: 0.2,
          businessMaturity: 0.2,
          growthIndicators: 0.1,
        },
      },
    );

    const result = await weightedAgent.execute({
      profile,
      criteria: {
        industry: "logistics",
        location: "Finland",
        employeeRange: "50-200",
      },
      companyId,
      searchResultId,
      searchJobId,
    });

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.value.breakdown.industryFit.weight).toBe(0.5);
    }
  });
});
