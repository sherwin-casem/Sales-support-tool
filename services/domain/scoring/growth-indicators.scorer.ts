import type { ExtractedCompany } from "@/types/agents/company-extraction.types.js";
import type { RawFactorScore } from "@/types/agents/lead-scoring.types.js";

const GROWTH_KEYWORDS = [
  "hiring",
  "careers",
  "expand",
  "expansion",
  "growth",
  "growing",
  "new market",
  "international",
  "launch",
  "innovation",
  "scale",
  "scaling",
  "invest",
] as const;

export function scoreGrowthIndicators(profile: ExtractedCompany): RawFactorScore {
  const corpus = [
    profile.description,
    ...profile.products,
    ...profile.services,
    ...profile.targetCustomers,
  ]
    .join(" ")
    .toLowerCase();

  const hits = GROWTH_KEYWORDS.filter((keyword) => corpus.includes(keyword));
  const signals: string[] = [...hits];

  let score = 30;

  if (hits.length >= 3) {
    score = 85;
  } else if (hits.length === 2) {
    score = 70;
  } else if (hits.length === 1) {
    score = 55;
  }

  if (profile.products.length >= 3) {
    score = Math.min(100, score + 10);
    signals.push("multiple products listed");
  }

  const confidence = hits.length > 0 ? 0.75 : 0.45;

  let rationale: string;

  if (score >= 75) {
    rationale = "Multiple growth indicators detected in public company content.";
  } else if (score >= 55) {
    rationale = "Some growth indicators present; expansion signals are moderate.";
  } else {
    rationale = "Few or no explicit growth indicators found in profile data.";
  }

  return {
    score,
    confidence,
    rationale,
    signals,
  };
}
