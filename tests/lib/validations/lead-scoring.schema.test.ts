import { describe, expect, it } from "vitest";
import {
  LeadScoreOutputSchema,
  LeadScoringInputSchema,
  ScoringWeightsSchema,
} from "@/lib/validations/lead-scoring.schema.js";

const companyId = "00000000-0000-4000-8000-000000000001";
const searchResultId = "00000000-0000-4000-8000-000000000002";
const searchJobId = "00000000-0000-4000-8000-000000000003";

const profile = {
  companyName: "Acme Logistics Oy",
  description: "Freight and warehousing provider in Finland.",
  industry: "logistics",
  products: ["Tracking Platform"],
  services: ["Freight forwarding"],
  targetCustomers: ["Manufacturers"],
  estimatedCompanySize: "100-200",
};

describe("LeadScoringInputSchema", () => {
  it("validates lead scoring input", () => {
    const result = LeadScoringInputSchema.safeParse({
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

    expect(result.success).toBe(true);
  });
});

describe("LeadScoreOutputSchema", () => {
  it("validates lead score output", () => {
    const result = LeadScoreOutputSchema.safeParse({
      score: 88.15,
      confidence: 0.91,
      explanation:
        "Acme Logistics is a strong match for your logistics search with solid size fit and mature operations.",
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
          signals: ["100-200", "50-200"],
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
          rationale: "Moderate growth signals.",
          signals: [],
        },
      },
    });

    expect(result.success).toBe(true);
  });
});

describe("ScoringWeightsSchema", () => {
  it("normalizes weights that do not sum to one", () => {
    const result = ScoringWeightsSchema.safeParse({
      industryFit: 3,
      sizeFit: 3,
      businessMaturity: 2,
      growthIndicators: 2,
    });

    expect(result.success).toBe(true);

    if (result.success) {
      const sum =
        result.data.industryFit +
        result.data.sizeFit +
        result.data.businessMaturity +
        result.data.growthIndicators;

      expect(sum).toBeCloseTo(1, 3);
    }
  });
});
