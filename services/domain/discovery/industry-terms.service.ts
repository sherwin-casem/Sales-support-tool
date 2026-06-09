export const INDUSTRY_GROUPS: Record<string, readonly string[]> = {
  logistics: [
    "logistics",
    "freight",
    "supply chain",
    "transportation",
    "shipping",
    "warehousing",
    "courier",
    "delivery",
  ],
  saas: ["saas", "software", "cloud", "b2b software", "enterprise software"],
  fintech: [
    "fintech",
    "financial",
    "finance",
    "financial technology",
    "financial services",
    "payments",
    "payment",
    "banking",
    "insurtech",
  ],
  manufacturing: [
    "manufacturing",
    "industrial",
    "production",
    "factory",
    "automation",
    "robotics",
  ],
  healthcare: ["healthcare", "health", "medical", "pharma", "biotech"],
  retail: ["retail", "ecommerce", "e-commerce", "consumer goods"],
  consulting: ["consulting", "professional services", "advisory"],
  technology: ["technology", "tech", "it", "information technology"],
};

const GENERIC_INDUSTRY_TERMS = new Set([
  "unknown",
  "general",
  "business",
  "company",
  "companies",
  "firm",
  "firms",
  "any",
  "all",
  "nearby",
  "local",
]);

function normalizeIndustry(value: string): string {
  return value.trim().toLowerCase();
}

export function isGenericIndustry(industry: string): boolean {
  return GENERIC_INDUSTRY_TERMS.has(normalizeIndustry(industry));
}

export function expandIndustrySearchTerms(industry: string): string[] {
  const normalized = normalizeIndustry(industry);

  if (!normalized || isGenericIndustry(normalized)) {
    return [];
  }

  for (const synonyms of Object.values(INDUSTRY_GROUPS)) {
    const group = new Set(synonyms.map((term) => term.toLowerCase()));

    if (group.has(normalized)) {
      return uniqueTerms([normalized, ...synonyms]);
    }
  }

  for (const synonyms of Object.values(INDUSTRY_GROUPS)) {
    for (const synonym of synonyms) {
      const lowerSynonym = synonym.toLowerCase();

      if (
        lowerSynonym.includes(normalized) ||
        normalized.includes(lowerSynonym)
      ) {
        return uniqueTerms([normalized, ...synonyms]);
      }
    }
  }

  return [normalized];
}

export function sharesIndustryGroup(first: string, second: string): boolean {
  const normalizedFirst = normalizeIndustry(first);
  const normalizedSecond = normalizeIndustry(second);

  for (const synonyms of Object.values(INDUSTRY_GROUPS)) {
    const group = new Set(synonyms.map((term) => term.toLowerCase()));

    if (group.has(normalizedFirst) && group.has(normalizedSecond)) {
      return true;
    }
  }

  return false;
}

function uniqueTerms(terms: readonly string[]): string[] {
  return [...new Set(terms.map((term) => term.trim().toLowerCase()).filter(Boolean))];
}
