import type { ParsedQuery } from "@/types/agents/query-parser.types.js";
import type { ExtractedCompany } from "@/types/agents/company-extraction.types.js";

const EMPTY_LABEL = "—";

export function displayValue(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return EMPTY_LABEL;
  }

  const trimmed = value.trim();

  if (!trimmed || trimmed.toLowerCase() === "unknown") {
    return EMPTY_LABEL;
  }

  return trimmed;
}

export function formatWebsiteLabel(url: string | null | undefined): string {
  if (!url) {
    return EMPTY_LABEL;
  }

  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function formatLocation(
  profile: ExtractedCompany | null | undefined,
  criteria: ParsedQuery | null | undefined,
): string {
  const city = profile?.city;
  const country = profile?.country;
  const cityLabel = displayValue(city);
  const countryLabel = displayValue(country);

  if (cityLabel !== EMPTY_LABEL && countryLabel !== EMPTY_LABEL) {
    return `${titleCase(cityLabel)}, ${titleCase(countryLabel)}`;
  }

  if (cityLabel !== EMPTY_LABEL) {
    return titleCase(cityLabel);
  }

  if (countryLabel !== EMPTY_LABEL) {
    return titleCase(countryLabel);
  }

  const criteriaLocation = criteria?.location;

  if (criteriaLocation && criteriaLocation !== "unknown") {
    return titleCase(criteriaLocation);
  }

  return EMPTY_LABEL;
}

export function getCompanyDisplayName(
  profile: ExtractedCompany | null | undefined,
  companyName: string | null | undefined,
  domain: string,
): string {
  return profile?.companyName ?? companyName ?? domain;
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
