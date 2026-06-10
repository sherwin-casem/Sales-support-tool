import { describe, expect, it } from "vitest";
import { hasOutreachContactGaps } from "@/services/domain/enrichment/outreach-gaps.service.js";
import { createExtractedCompanyProfile } from "../../../helpers/extracted-company.fixture.js";

describe("outreach-gaps.service", () => {
  it("detects missing outreach contact fields", () => {
    expect(
      hasOutreachContactGaps(
        createExtractedCompanyProfile({
          decisionMaker: "unknown",
          email: null,
          linkedInUrl: null,
        }),
      ),
    ).toBe(true);
  });

  it("returns false when decision maker, email, and linkedin are present", () => {
    expect(
      hasOutreachContactGaps(
        createExtractedCompanyProfile({
          decisionMaker: "Jane Doe, CEO",
          email: "info@acme.fi",
          linkedInUrl: "https://linkedin.com/company/acme",
        }),
      ),
    ).toBe(false);
  });
});
