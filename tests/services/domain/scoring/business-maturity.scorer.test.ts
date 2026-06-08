import { describe, expect, it } from "vitest";
import { scoreBusinessMaturity } from "@/services/domain/scoring/business-maturity.scorer.js";

const matureProfile = {
  companyName: "Acme Logistics Oy",
  description:
    "Leading freight and warehousing provider established since 1998, serving enterprise customers across Finland.",
  industry: "logistics",
  products: ["Tracking Platform"],
  services: ["Freight forwarding", "Warehousing", "Cross-border logistics"],
  targetCustomers: ["Manufacturers", "Retailers"],
  estimatedCompanySize: "100-200",
};

describe("scoreBusinessMaturity", () => {
  it("returns higher score for mature profiles", () => {
    const mature = scoreBusinessMaturity(matureProfile, 0.9);
    const sparse = scoreBusinessMaturity(
      {
        ...matureProfile,
        description: "Logistics company.",
        products: [],
        services: [],
        targetCustomers: [],
      },
      0.3,
    );

    expect(mature.score).toBeGreaterThan(sparse.score);
  });
});
