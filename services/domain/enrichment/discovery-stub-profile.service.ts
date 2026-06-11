import type { ExtractedCompany } from "@/types/agents/company-extraction.types.js";

export function createDiscoveryStubProfile(companyName: string): ExtractedCompany {
  const name = companyName.trim() || "unknown";

  return {
    companyName: name,
    description: "unknown",
    industry: "unknown",
    products: [],
    services: [],
    targetCustomers: [],
    estimatedCompanySize: "unknown",
    city: "unknown",
    country: "unknown",
    decisionMaker: "unknown",
    decisionMakerEmail: null,
    decisionMakerPhone: null,
    decisionMakerLinkedInUrl: null,
    linkedInUrl: null,
    xUrl: null,
    email: null,
    phone: null,
    revenue: "unknown",
  };
}
