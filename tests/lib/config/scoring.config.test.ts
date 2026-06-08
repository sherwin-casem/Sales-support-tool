import { describe, expect, it } from "vitest";
import {
  DEFAULT_SCORING_WEIGHTS,
  normalizeScoringWeights,
  resolveScoringWeights,
} from "@/lib/config/scoring.config.js";

describe("resolveScoringWeights", () => {
  it("returns default weights when no overrides are provided", () => {
    expect(resolveScoringWeights()).toEqual(DEFAULT_SCORING_WEIGHTS);
  });

  it("normalizes custom weights to sum to one", () => {
    const weights = resolveScoringWeights({
      industryFit: 2,
      sizeFit: 2,
      businessMaturity: 2,
      growthIndicators: 2,
    });

    const sum =
      weights.industryFit +
      weights.sizeFit +
      weights.businessMaturity +
      weights.growthIndicators;

    expect(sum).toBeCloseTo(1, 3);
  });
});

describe("normalizeScoringWeights", () => {
  it("returns defaults when sum is zero", () => {
    expect(
      normalizeScoringWeights({
        industryFit: 0,
        sizeFit: 0,
        businessMaturity: 0,
        growthIndicators: 0,
      }),
    ).toEqual(DEFAULT_SCORING_WEIGHTS);
  });
});
