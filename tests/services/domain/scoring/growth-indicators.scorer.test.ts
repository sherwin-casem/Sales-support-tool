import { describe, expect, it } from "vitest";
import { scoreGrowthIndicators } from "@/services/domain/scoring/growth-indicators.scorer.js";

describe("scoreGrowthIndicators", () => {
  it("returns higher score when growth keywords are present", () => {
    const growing = scoreGrowthIndicators({
      companyName: "Acme Logistics Oy",
      description: "Expanding internationally with new market launches and hiring across teams.",
      industry: "logistics",
      products: ["Platform A", "Platform B", "Platform C"],
      services: ["Freight forwarding"],
      targetCustomers: ["Manufacturers"],
      estimatedCompanySize: "100-200",
    });

    const staticProfile = scoreGrowthIndicators({
      companyName: "Acme Logistics Oy",
      description: "Freight and warehousing provider.",
      industry: "logistics",
      products: [],
      services: ["Freight forwarding"],
      targetCustomers: [],
      estimatedCompanySize: "100-200",
    });

    expect(growing.score).toBeGreaterThan(staticProfile.score);
  });
});
