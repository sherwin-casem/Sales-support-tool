import { describe, expect, it } from "vitest";
import { aggregateDeterministicScore } from "@/services/domain/scoring/score-aggregator.js";
import { scoreIndustryFit } from "@/services/domain/scoring/industry-fit.scorer.js";
import { scoreSizeFit } from "@/services/domain/scoring/size-fit.scorer.js";
import { scoreBusinessMaturity } from "@/services/domain/scoring/business-maturity.scorer.js";
import { scoreGrowthIndicators } from "@/services/domain/scoring/growth-indicators.scorer.js";

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

describe("aggregateDeterministicScore", () => {
  it("computes weighted total score with default weights", () => {
    const aggregated = aggregateDeterministicScore({
      industryFit: scoreIndustryFit("logistics", profile.industry),
      sizeFit: scoreSizeFit("50-200", profile.estimatedCompanySize),
      businessMaturity: scoreBusinessMaturity(profile, 0.9),
      growthIndicators: scoreGrowthIndicators(profile),
      profileCompleteness: 0.9,
    });

    expect(aggregated.score).toBeGreaterThan(70);
    expect(aggregated.confidence).toBeGreaterThan(0);
    expect(aggregated.breakdown.industryFit.weight).toBe(0.3);
    expect(aggregated.breakdown.industryFit.weightedScore).toBeCloseTo(
      aggregated.breakdown.industryFit.score * 0.3,
      2,
    );
  });

  it("respects custom weights", () => {
    const aggregated = aggregateDeterministicScore({
      industryFit: scoreIndustryFit("logistics", profile.industry),
      sizeFit: scoreSizeFit("50-200", profile.estimatedCompanySize),
      businessMaturity: scoreBusinessMaturity(profile, 0.9),
      growthIndicators: scoreGrowthIndicators(profile),
      weights: {
        industryFit: 0.5,
        sizeFit: 0.2,
        businessMaturity: 0.2,
        growthIndicators: 0.1,
      },
    });

    expect(aggregated.weights.industryFit).toBe(0.5);
    expect(aggregated.breakdown.industryFit.weight).toBe(0.5);
  });
});
