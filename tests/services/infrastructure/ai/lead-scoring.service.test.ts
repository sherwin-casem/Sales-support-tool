import { describe, expect, it, vi } from "vitest";
import { LeadScoringAgent } from "@/agents/scoring/lead-scoring.agent.js";
import {
  LeadScoringService,
  mapLeadScoringError,
} from "@/services/infrastructure/ai/lead-scoring.service.js";
import { AgentError, LeadScoringError } from "@/types/agents/agent-error.types.js";
import { err, ok } from "@/lib/utils/result.js";

const companyId = "00000000-0000-4000-8000-000000000001";
const searchResultId = "00000000-0000-4000-8000-000000000002";
const searchJobId = "00000000-0000-4000-8000-000000000003";

const input = {
  profile: {
    companyName: "Acme Logistics Oy",
    description:
      "Leading freight and warehousing provider established since 1998, serving enterprise customers across Finland.",
    industry: "logistics",
    products: ["Tracking Platform"],
    services: ["Freight forwarding", "Warehousing"],
    targetCustomers: ["Manufacturers"],
    estimatedCompanySize: "100-200",
  },
  criteria: {
    industry: "logistics",
    location: "Finland",
    employeeRange: "50-200",
  },
  companyId,
  searchResultId,
  searchJobId,
  profileCompleteness: 0.9,
};

describe("LeadScoringService", () => {
  it("returns lead score with metadata from agent", async () => {
    const execute = vi.fn().mockResolvedValue(
      ok({
        score: 88.15,
        confidence: 0.91,
        explanation: "Strong logistics fit with aligned employee range.",
        breakdown: {
          industryFit: {
            score: 100,
            weight: 0.3,
            weightedScore: 30,
            confidence: 0.95,
            rationale: "Exact industry match.",
            signals: ["logistics"],
          },
          sizeFit: {
            score: 95,
            weight: 0.25,
            weightedScore: 23.75,
            confidence: 0.9,
            rationale: "Strong overlap.",
            signals: [],
          },
          businessMaturity: {
            score: 80,
            weight: 0.25,
            weightedScore: 20,
            confidence: 0.8,
            rationale: "Mature profile.",
            signals: [],
          },
          growthIndicators: {
            score: 60,
            weight: 0.2,
            weightedScore: 12,
            confidence: 0.7,
            rationale: "Moderate growth.",
            signals: [],
          },
        },
      }),
    );

    const agent = { execute } as unknown as LeadScoringAgent;
    const service = new LeadScoringService(agent, "gpt-4o", { maxAttempts: 1 });

    const result = await service.score(input);

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.value.leadScore.score).toBe(88.15);
      expect(result.value.meta.modelUsed).toBe("gpt-4o");
      expect(result.value.meta.weights.industryFit).toBe(0.3);
    }
  });

  it("retries on validation errors", async () => {
    const execute = vi
      .fn()
      .mockResolvedValueOnce(err(new AgentError("VALIDATION_ERROR", "invalid output")))
      .mockResolvedValueOnce(
        ok({
          score: 80,
          confidence: 0.8,
          explanation: "Retry succeeded with a valid lead score explanation for the company.",
          breakdown: {
            industryFit: {
              score: 100,
              weight: 0.3,
              weightedScore: 30,
              confidence: 0.95,
              rationale: "Exact industry match.",
              signals: [],
            },
            sizeFit: {
              score: 80,
              weight: 0.25,
              weightedScore: 20,
              confidence: 0.8,
              rationale: "Good overlap.",
              signals: [],
            },
            businessMaturity: {
              score: 70,
              weight: 0.25,
              weightedScore: 17.5,
              confidence: 0.7,
              rationale: "Moderate maturity.",
              signals: [],
            },
            growthIndicators: {
              score: 50,
              weight: 0.2,
              weightedScore: 10,
              confidence: 0.6,
              rationale: "Limited growth signals.",
              signals: [],
            },
          },
        }),
      );

    const agent = { execute } as unknown as LeadScoringAgent;
    const service = new LeadScoringService(agent, "gpt-4o", {
      maxAttempts: 2,
      initialDelayMs: 1,
    });

    const result = await service.score(input);

    expect(result.ok).toBe(true);
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it("maps invalid input to http 400", async () => {
    const execute = vi
      .fn()
      .mockResolvedValue(err(new AgentError("INVALID_INPUT", "bad input")));

    const agent = { execute } as unknown as LeadScoringAgent;
    const service = new LeadScoringService(agent, "gpt-4o", { maxAttempts: 1 });

    const result = await service.score({
      ...input,
      companyId: "not-a-uuid",
    });

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(mapLeadScoringError(result.error).status).toBe(400);
    }
  });
});

describe("mapLeadScoringError", () => {
  it("maps openai errors to 503", () => {
    const mapped = mapLeadScoringError(
      new LeadScoringError("OPENAI_ERROR", "rate limit"),
    );

    expect(mapped.status).toBe(503);
  });
});
