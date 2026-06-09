import { describe, expect, it } from "vitest";
import {
  countEnrichmentGaps,
  mergeExtractedProfiles,
} from "@/services/domain/enrichment/profile-merge.service.js";
import type { ExtractedCompany } from "@/types/agents/company-extraction.types.js";

const websiteProfile: ExtractedCompany = {
  companyName: "Acme Logistics Oy",
  description: "Freight provider in Finland.",
  industry: "logistics",
  products: ["Tracking Platform"],
  services: ["Freight forwarding"],
  targetCustomers: ["Manufacturers"],
  estimatedCompanySize: "unknown",
  city: "unknown",
  country: "unknown",
  decisionMaker: "unknown",
  linkedInUrl: null,
  xUrl: null,
  email: null,
  revenue: "unknown",
};

const webProfile: ExtractedCompany = {
  companyName: "Acme Logistics",
  description: "International logistics company.",
  industry: "transportation",
  products: ["Fleet management"],
  services: ["Warehousing"],
  targetCustomers: ["Retailers"],
  estimatedCompanySize: "100-200",
  city: "Helsinki",
  country: "Finland",
  decisionMaker: "Jane Doe, CEO",
  linkedInUrl: "https://linkedin.com/company/acme",
  xUrl: null,
  email: "info@acme.fi",
  revenue: "10M-50M EUR",
};

describe("profile-merge.service", () => {
  it("prefers website values when they are known", () => {
    const merged = mergeExtractedProfiles(websiteProfile, webProfile);

    expect(merged.companyName).toBe("Acme Logistics Oy");
    expect(merged.description).toBe("Freight provider in Finland.");
    expect(merged.industry).toBe("logistics");
    expect(merged.products).toEqual(["Tracking Platform", "Fleet management"]);
    expect(merged.services).toEqual(["Freight forwarding", "Warehousing"]);
  });

  it("fills unknown website fields from web enrichment", () => {
    const merged = mergeExtractedProfiles(websiteProfile, webProfile);

    expect(merged.city).toBe("Helsinki");
    expect(merged.country).toBe("Finland");
    expect(merged.decisionMaker).toBe("Jane Doe, CEO");
    expect(merged.estimatedCompanySize).toBe("100-200");
    expect(merged.linkedInUrl).toBe("https://linkedin.com/company/acme");
    expect(merged.email).toBe("info@acme.fi");
    expect(merged.revenue).toBe("10M-50M EUR");
  });

  it("counts remaining enrichment gaps", () => {
    const merged = mergeExtractedProfiles(websiteProfile, webProfile);

    expect(countEnrichmentGaps(merged)).toBe(0);
    expect(countEnrichmentGaps(websiteProfile)).toBeGreaterThan(0);
  });
});
