import type { ExtractedCompany } from "@/types/agents/company-extraction.types.js";

function isUnknown(value: string): boolean {
  return !value.trim() || value.trim().toLowerCase() === "unknown";
}

function mergeString(preferred: string, fallback: string): string {
  if (!isUnknown(preferred)) {
    return preferred.trim();
  }

  if (!isUnknown(fallback)) {
    return fallback.trim();
  }

  return "unknown";
}

function mergeNullable(preferred: string | null, fallback: string | null): string | null {
  if (preferred?.trim()) {
    return preferred.trim();
  }

  if (fallback?.trim()) {
    return fallback.trim();
  }

  return null;
}

function mergeStringArray(preferred: string[], fallback: string[]): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const value of [...preferred, ...fallback]) {
    const normalized = value.trim();

    if (!normalized) {
      continue;
    }

    const key = normalized.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    merged.push(normalized);
  }

  return merged;
}

export function mergeExtractedProfiles(
  websiteProfile: ExtractedCompany,
  webProfile: ExtractedCompany,
): ExtractedCompany {
  return {
    companyName: mergeString(websiteProfile.companyName, webProfile.companyName),
    description: mergeString(websiteProfile.description, webProfile.description),
    industry: mergeString(websiteProfile.industry, webProfile.industry),
    products: mergeStringArray(websiteProfile.products, webProfile.products),
    services: mergeStringArray(websiteProfile.services, webProfile.services),
    targetCustomers: mergeStringArray(
      websiteProfile.targetCustomers,
      webProfile.targetCustomers,
    ),
    estimatedCompanySize: mergeString(
      websiteProfile.estimatedCompanySize,
      webProfile.estimatedCompanySize,
    ),
    city: mergeString(websiteProfile.city, webProfile.city),
    country: mergeString(websiteProfile.country, webProfile.country),
    decisionMaker: mergeString(websiteProfile.decisionMaker, webProfile.decisionMaker),
    linkedInUrl: mergeNullable(websiteProfile.linkedInUrl, webProfile.linkedInUrl),
    xUrl: mergeNullable(websiteProfile.xUrl, webProfile.xUrl),
    email: mergeNullable(websiteProfile.email, webProfile.email),
    revenue: mergeString(websiteProfile.revenue, webProfile.revenue),
  };
}

export function countEnrichmentGaps(profile: ExtractedCompany): number {
  let gaps = 0;

  if (isUnknown(profile.city)) gaps += 1;
  if (isUnknown(profile.country)) gaps += 1;
  if (isUnknown(profile.decisionMaker)) gaps += 1;
  if (isUnknown(profile.estimatedCompanySize)) gaps += 1;
  if (isUnknown(profile.revenue)) gaps += 1;
  if (!profile.linkedInUrl) gaps += 1;
  if (!profile.email) gaps += 1;

  return gaps;
}
