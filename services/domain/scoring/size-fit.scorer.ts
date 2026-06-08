import type { RawFactorScore } from "@/types/agents/lead-scoring.types.js";
import {
  computeRangeOverlapRatio,
  isAdjacentRange,
  isRangeFullyInside,
  parseEmployeeRange,
} from "@/services/domain/scoring/employee-range.utils.js";

export function scoreSizeFit(
  criteriaRange: string,
  profileRange: string,
): RawFactorScore {
  const criteria = parseEmployeeRange(criteriaRange);
  const profile = parseEmployeeRange(profileRange);

  if (!criteria || !profile) {
    const signals: string[] = [];

    if (!criteria) {
      signals.push("criteria size unknown");
    }

    if (!profile) {
      signals.push("profile size unknown");
    }

    return {
      score: 40,
      confidence: 0.3,
      rationale: "Employee range is unknown; neutral size fit applied.",
      signals,
    };
  }

  if (isRangeFullyInside(profile, criteria)) {
    return {
      score: 100,
      confidence: 0.95,
      rationale: `Company size ${profileRange} fits within target ${criteriaRange}.`,
      signals: [profileRange, criteriaRange],
    };
  }

  const overlap = computeRangeOverlapRatio(criteria, profile);

  if (overlap >= 0.9) {
    return {
      score: 100,
      confidence: 0.9,
      rationale: `Strong employee range overlap (${profileRange} vs ${criteriaRange}).`,
      signals: [profileRange, criteriaRange],
    };
  }

  if (overlap >= 0.5) {
    return {
      score: 80,
      confidence: 0.85,
      rationale: `Substantial employee range overlap (${profileRange} vs ${criteriaRange}).`,
      signals: [profileRange, criteriaRange],
    };
  }

  if (overlap > 0) {
    return {
      score: 50,
      confidence: 0.7,
      rationale: `Partial employee range overlap (${profileRange} vs ${criteriaRange}).`,
      signals: [profileRange, criteriaRange],
    };
  }

  if (isAdjacentRange(criteria, profile)) {
    return {
      score: 30,
      confidence: 0.65,
      rationale: `Employee ranges are adjacent (${profileRange} vs ${criteriaRange}).`,
      signals: [profileRange, criteriaRange],
    };
  }

  return {
    score: 10,
    confidence: 0.85,
    rationale: `Employee range mismatch (${profileRange} vs ${criteriaRange}).`,
    signals: [profileRange, criteriaRange],
  };
}
