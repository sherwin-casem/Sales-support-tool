import type { ExtractedCompany } from "@/types/agents/company-extraction.types.js";

export function createExtractedCompanyProfile(
  overrides: Partial<ExtractedCompany> = {},
): ExtractedCompany {
  return {
    companyName: "Acme Logistics Oy",
    description: "Freight and warehousing provider in Finland.",
    industry: "logistics",
    products: ["Tracking Platform"],
    services: ["Freight forwarding"],
    targetCustomers: ["Manufacturers"],
    estimatedCompanySize: "100-200",
    city: "unknown",
    country: "unknown",
    decisionMaker: "unknown",
    linkedInUrl: null,
    xUrl: null,
    email: null,
    revenue: "unknown",
    ...overrides,
  };
}
