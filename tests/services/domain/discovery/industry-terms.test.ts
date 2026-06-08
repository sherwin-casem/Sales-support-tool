import { describe, expect, it } from "vitest";
import {
  expandIndustrySearchTerms,
  isGenericIndustry,
  sharesIndustryGroup,
} from "@/services/domain/discovery/industry-terms.service.js";

describe("industry-terms.service", () => {
  it("treats unknown and filler industry terms as generic", () => {
    expect(isGenericIndustry("unknown")).toBe(true);
    expect(isGenericIndustry("companies")).toBe(true);
    expect(isGenericIndustry("fintech")).toBe(false);
  });

  it("expands fintech to related search terms", () => {
    const terms = expandIndustrySearchTerms("fintech");

    expect(terms).toContain("fintech");
    expect(terms).toContain("financial");
    expect(terms).toContain("payments");
  });

  it("returns the original term when no synonym group matches", () => {
    expect(expandIndustrySearchTerms("agriculture")).toEqual(["agriculture"]);
  });

  it("shares industry groups for related terms", () => {
    expect(sharesIndustryGroup("fintech", "payments")).toBe(true);
    expect(sharesIndustryGroup("fintech", "logistics")).toBe(false);
  });
});
