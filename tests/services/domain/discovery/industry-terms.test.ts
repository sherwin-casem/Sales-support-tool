import { describe, expect, it } from "vitest";
import { sharesIndustryGroup } from "@/services/domain/discovery/industry-terms.service.js";

describe("industry-terms.service", () => {
  it("matches industries in the same synonym group", () => {
    expect(sharesIndustryGroup("fintech", "payments")).toBe(true);
    expect(sharesIndustryGroup("logistics", "freight")).toBe(true);
  });

  it("does not match unrelated industries", () => {
    expect(sharesIndustryGroup("fintech", "manufacturing")).toBe(false);
    expect(sharesIndustryGroup("saas", "logistics")).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(sharesIndustryGroup("Fintech", "PAYMENTS")).toBe(true);
  });
});
