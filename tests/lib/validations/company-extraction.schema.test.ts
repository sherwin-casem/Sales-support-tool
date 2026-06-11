import { describe, expect, it } from "vitest";
import {
  CompanyExtractionInputSchema,
  ExtractedCompanySchema,
  computeExtractionCompleteness,
} from "@/lib/validations/company-extraction.schema.js";

describe("ExtractedCompanySchema", () => {
  it("validates and normalizes extracted company profile", () => {
    const result = ExtractedCompanySchema.safeParse({
      companyName: " Acme Logistics Oy ",
      description: "Freight and warehousing provider in Finland.",
      industry: " Logistics ",
      products: ["Tracking Platform", "tracking platform"],
      services: ["Freight forwarding", "Warehousing"],
      targetCustomers: ["Manufacturers", "Retailers"],
      estimatedCompanySize: "100-200",
      city: "Helsinki",
      country: "Finland",
      decisionMaker: "Jane Doe, CEO",
      linkedInUrl: "https://linkedin.com/company/acme",
      xUrl: null,
      email: "info@acme.fi",
      revenue: "10M-50M EUR",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.industry).toBe("logistics");
      expect(result.data.products).toEqual(["Tracking Platform"]);
      expect(result.data.estimatedCompanySize).toBe("100-200");
      expect(result.data.city).toBe("helsinki");
      expect(result.data.email).toBe("info@acme.fi");
    }
  });

  it("applies defaults for legacy profiles missing new fields", () => {
    const result = ExtractedCompanySchema.safeParse({
      companyName: "Acme Oy",
      description: "A logistics company.",
      industry: "logistics",
      products: [],
      services: [],
      targetCustomers: [],
      estimatedCompanySize: "unknown",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.city).toBe("unknown");
      expect(result.data.decisionMaker).toBe("unknown");
      expect(result.data.decisionMakerEmail).toBeNull();
      expect(result.data.decisionMakerPhone).toBeNull();
      expect(result.data.decisionMakerLinkedInUrl).toBeNull();
      expect(result.data.linkedInUrl).toBeNull();
      expect(result.data.phone).toBeNull();
      expect(result.data.revenue).toBe("unknown");
    }
  });

  it("coerces invalid contact fields to null", () => {
    const result = ExtractedCompanySchema.safeParse({
      companyName: "Acme Oy",
      description: "A logistics company.",
      industry: "logistics",
      products: [],
      services: [],
      targetCustomers: [],
      estimatedCompanySize: "unknown",
      email: "not-an-email",
      phone: "12345",
      decisionMakerEmail: "bad@@acme.fi",
      decisionMakerPhone: "abc",
    });

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.data.email).toBeNull();
      expect(result.data.phone).toBeNull();
      expect(result.data.decisionMakerEmail).toBeNull();
      expect(result.data.decisionMakerPhone).toBeNull();
    }
  });

  it("rejects invalid estimatedCompanySize", () => {
    const result = ExtractedCompanySchema.safeParse({
      companyName: "Acme Oy",
      description: "A logistics company.",
      industry: "logistics",
      products: [],
      services: [],
      targetCustomers: [],
      estimatedCompanySize: "lots of people",
    });

    expect(result.success).toBe(false);
  });
});

describe("CompanyExtractionInputSchema", () => {
  it("rejects content shorter than 100 characters", () => {
    const result = CompanyExtractionInputSchema.safeParse({
      content: "too short",
      domain: "acme.fi",
      companyId: "00000000-0000-4000-8000-000000000001",
    });

    expect(result.success).toBe(false);
  });
});

describe("computeExtractionCompleteness", () => {
  it("returns higher completeness for richer profiles", () => {
    const rich = computeExtractionCompleteness({
      companyName: "Acme Logistics Oy",
      description: "Freight and warehousing provider operating across Finland.",
      industry: "logistics",
      products: ["Tracking Platform"],
      services: ["Freight forwarding"],
      targetCustomers: ["Manufacturers"],
      estimatedCompanySize: "100-200",
      city: "helsinki",
      country: "finland",
      decisionMaker: "Jane Doe, CEO",
      decisionMakerEmail: "jane@acme.fi",
      decisionMakerPhone: "+358 9 123 4567",
      decisionMakerLinkedInUrl: "https://linkedin.com/in/janedoe",
      linkedInUrl: "https://linkedin.com/company/acme",
      xUrl: null,
      email: "info@acme.fi",
      phone: "+358 9 765 4321",
      revenue: "10M-50M EUR",
    });

    const sparse = computeExtractionCompleteness({
      companyName: "Acme Oy",
      description: "Short",
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
    });

    expect(rich).toBeGreaterThan(sparse);
  });
});
