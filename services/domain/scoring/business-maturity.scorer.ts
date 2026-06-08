import type { ExtractedCompany } from "@/types/agents/company-extraction.types.js";
import type { RawFactorScore } from "@/types/agents/lead-scoring.types.js";

const MATURITY_KEYWORDS = [
  "since",
  "established",
  "founded",
  "leading",
  "years of experience",
  "trusted",
  "global",
  "enterprise",
  "headquarters",
] as const;

export function scoreBusinessMaturity(
  profile: ExtractedCompany,
  profileCompleteness = 0.5,
): RawFactorScore {
  let points = 0;
  const signals: string[] = [];

  if (profile.description.length >= 100) {
    points += 25;
    signals.push("detailed company description");
  } else if (profile.description.length >= 40) {
    points += 15;
    signals.push("moderate company description");
  } else {
    points += 5;
  }

  const offeringCount = profile.products.length + profile.services.length;

  if (offeringCount >= 4) {
    points += 25;
    signals.push(`${offeringCount} products/services listed`);
  } else if (offeringCount >= 2) {
    points += 15;
    signals.push(`${offeringCount} products/services listed`);
  } else if (offeringCount >= 1) {
    points += 8;
    signals.push("limited offering footprint");
  }

  if (profile.targetCustomers.length >= 2) {
    points += 15;
    signals.push("defined customer segments");
  } else if (profile.targetCustomers.length === 1) {
    points += 8;
    signals.push("single customer segment identified");
  }

  const descriptionLower = profile.description.toLowerCase();
  const keywordHits = MATURITY_KEYWORDS.filter((keyword) =>
    descriptionLower.includes(keyword),
  );

  if (keywordHits.length >= 2) {
    points += 25;
    signals.push("multiple establishment signals");
  } else if (keywordHits.length === 1) {
    points += 15;
    signals.push(`establishment signal: ${keywordHits[0]}`);
  }

  if (profile.companyName.trim().length > 3) {
    points += 10;
  }

  const score = Math.min(100, points);
  const confidence = Math.min(
    0.95,
    0.35 + profileCompleteness * 0.45 + (offeringCount > 0 ? 0.1 : 0),
  );

  let rationale: string;

  if (score >= 80) {
    rationale = "Strong maturity signals from offering breadth and company history.";
  } else if (score >= 50) {
    rationale = "Moderate maturity signals; company appears established but limited detail.";
  } else {
    rationale = "Limited maturity signals available from public profile data.";
  }

  return {
    score,
    confidence,
    rationale,
    signals,
  };
}
