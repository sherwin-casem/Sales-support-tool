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

function normalizeIndustry(value: string): string {
  return value.trim().toLowerCase();
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
