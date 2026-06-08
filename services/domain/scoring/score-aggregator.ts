import { resolveScoringWeights } from "@/lib/config/scoring.config.js";
import type {
  RawFactorScore,
  ScoreBreakdown,
  ScoringWeights,
} from "@/types/agents/lead-scoring.types.js";

export interface DeterministicScoreInput {
  industryFit: RawFactorScore;
  sizeFit: RawFactorScore;
  businessMaturity: RawFactorScore;
  growthIndicators: RawFactorScore;
  profileCompleteness?: number;
  weights?: Partial<ScoringWeights>;
}

export interface AggregatedScore {
  score: number;
  confidence: number;
  breakdown: ScoreBreakdown;
  weights: ScoringWeights;
}

function toFactorScore(
  raw: RawFactorScore,
  weight: number,
): ScoreBreakdown[keyof ScoreBreakdown] {
  const weightedScore = round(raw.score * weight);

  return {
    score: raw.score,
    weight,
    weightedScore,
    confidence: raw.confidence,
    rationale: raw.rationale,
    signals: raw.signals,
  };
}

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function averageConfidence(factors: RawFactorScore[]): number {
  if (factors.length === 0) {
    return 0;
  }

  const total = factors.reduce((sum, factor) => sum + factor.confidence, 0);
  return total / factors.length;
}

function criticalUnknownPenalty(input: DeterministicScoreInput): number {
  let penalty = 1;

  if (input.industryFit.signals.includes("unknown industry")) {
    penalty = Math.min(penalty, 0.7);
  }

  if (
    input.sizeFit.signals.includes("profile size unknown") ||
    input.sizeFit.signals.includes("criteria size unknown")
  ) {
    penalty = Math.min(penalty, 0.75);
  }

  return penalty;
}

export function aggregateDeterministicScore(
  input: DeterministicScoreInput,
): AggregatedScore {
  const weights = resolveScoringWeights(input.weights);

  const breakdown: ScoreBreakdown = {
    industryFit: toFactorScore(input.industryFit, weights.industryFit),
    sizeFit: toFactorScore(input.sizeFit, weights.sizeFit),
    businessMaturity: toFactorScore(
      input.businessMaturity,
      weights.businessMaturity,
    ),
    growthIndicators: toFactorScore(
      input.growthIndicators,
      weights.growthIndicators,
    ),
  };

  const score = round(
    breakdown.industryFit.weightedScore +
      breakdown.sizeFit.weightedScore +
      breakdown.businessMaturity.weightedScore +
      breakdown.growthIndicators.weightedScore,
  );

  const profileCompleteness = input.profileCompleteness ?? 1;
  const factorConfidence = averageConfidence([
    input.industryFit,
    input.sizeFit,
    input.businessMaturity,
    input.growthIndicators,
  ]);

  const confidence = round(
    Math.min(
      profileCompleteness,
      factorConfidence,
      criticalUnknownPenalty(input),
    ),
    3,
  );

  return {
    score,
    confidence,
    breakdown,
    weights,
  };
}

export function buildFallbackExplanation(
  companyName: string,
  aggregated: AggregatedScore,
): string {
  const { breakdown, score } = aggregated;

  return (
    `${companyName} scored ${score}/100. ` +
    `Industry fit ${breakdown.industryFit.score}/100, ` +
    `size fit ${breakdown.sizeFit.score}/100, ` +
    `business maturity ${breakdown.businessMaturity.score}/100, ` +
    `growth indicators ${breakdown.growthIndicators.score}/100. ` +
    `${breakdown.industryFit.rationale} ${breakdown.sizeFit.rationale}`
  );
}
