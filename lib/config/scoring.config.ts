import type { ScoringWeights } from "@/types/agents/lead-scoring.types.js";

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  industryFit: 0.3,
  sizeFit: 0.25,
  businessMaturity: 0.25,
  growthIndicators: 0.2,
};

const WEIGHT_TOLERANCE = 0.001;

export function normalizeScoringWeights(
  weights: ScoringWeights,
): ScoringWeights {
  const sum =
    weights.industryFit +
    weights.sizeFit +
    weights.businessMaturity +
    weights.growthIndicators;

  if (Math.abs(sum - 1) <= WEIGHT_TOLERANCE) {
    return weights;
  }

  if (sum <= 0) {
    return { ...DEFAULT_SCORING_WEIGHTS };
  }

  return {
    industryFit: weights.industryFit / sum,
    sizeFit: weights.sizeFit / sum,
    businessMaturity: weights.businessMaturity / sum,
    growthIndicators: weights.growthIndicators / sum,
  };
}

export function resolveScoringWeights(
  overrides?: Partial<ScoringWeights>,
): ScoringWeights {
  if (!overrides) {
    return { ...DEFAULT_SCORING_WEIGHTS };
  }

  return normalizeScoringWeights({
    industryFit: overrides.industryFit ?? DEFAULT_SCORING_WEIGHTS.industryFit,
    sizeFit: overrides.sizeFit ?? DEFAULT_SCORING_WEIGHTS.sizeFit,
    businessMaturity:
      overrides.businessMaturity ?? DEFAULT_SCORING_WEIGHTS.businessMaturity,
    growthIndicators:
      overrides.growthIndicators ?? DEFAULT_SCORING_WEIGHTS.growthIndicators,
  });
}
