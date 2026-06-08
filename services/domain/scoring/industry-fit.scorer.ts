import type { RawFactorScore } from "@/types/agents/lead-scoring.types.js";
import {
  sharesIndustryGroup,
} from "@/services/domain/discovery/industry-terms.service.js";

function normalizeIndustry(value: string): string {
  return value.trim().toLowerCase();
}

export function scoreIndustryFit(
  criteriaIndustry: string,
  profileIndustry: string,
): RawFactorScore {
  const criteria = normalizeIndustry(criteriaIndustry);
  const profile = normalizeIndustry(profileIndustry);

  if (criteria === "unknown") {
    return {
      score: 50,
      confidence: 0.5,
      rationale: "Search industry not specified; neutral industry fit applied.",
      signals: [],
    };
  }

  if (profile === "unknown") {
    return {
      score: 30,
      confidence: 0.25,
      rationale: "Company industry is unknown; fit cannot be confirmed.",
      signals: ["unknown industry"],
    };
  }

  if (criteria === profile) {
    return {
      score: 100,
      confidence: 0.95,
      rationale: `Exact industry match (${profile}).`,
      signals: [profile],
    };
  }

  if (sharesIndustryGroup(criteria, profile)) {
    return {
      score: 85,
      confidence: 0.85,
      rationale: `Related industry match (${profile} ↔ ${criteria}).`,
      signals: [profile, criteria],
    };
  }

  if (criteria.includes(profile) || profile.includes(criteria)) {
    return {
      score: 55,
      confidence: 0.6,
      rationale: `Partial industry overlap between ${profile} and ${criteria}.`,
      signals: [profile, criteria],
    };
  }

  return {
    score: 15,
    confidence: 0.9,
    rationale: `Industry mismatch (${profile} vs ${criteria}).`,
    signals: [profile, criteria],
  };
}
