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
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.industry).toBe("logistics");
      expect(result.data.products).toEqual(["Tracking Platform"]);
      expect(result.data.estimatedCompanySize).toBe("100-200");
    }
  });

  it("accepts unknown company size and empty arrays", () => {
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
    });

    const sparse = computeExtractionCompleteness({
      companyName: "Acme Oy",
      description: "Short",
      industry: "unknown",
      products: [],
      services: [],
      targetCustomers: [],
      estimatedCompanySize: "unknown",
    });

    expect(rich).toBeGreaterThan(sparse);
  });
});
