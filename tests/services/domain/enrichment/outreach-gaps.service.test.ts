import { describe, expect, it } from "vitest";
import { hasOutreachContactGaps } from "@/services/domain/enrichment/outreach-gaps.service.js";
import { createExtractedCompanyProfile } from "../../../helpers/extracted-company.fixture.js";

describe("outreach-gaps.service", () => {
  it("detects missing decision maker and personal contact fields", () => {
    expect(
      hasOutreachContactGaps(
        createExtractedCompanyProfile({
          decisionMaker: "unknown",
          decisionMakerEmail: null,
          decisionMakerPhone: null,
          decisionMakerLinkedInUrl: null,
        }),
      ),
    ).toBe(true);
  });

  it("treats company-only contacts as gaps when personal fields are missing", () => {
    expect(
      hasOutreachContactGaps(
        createExtractedCompanyProfile({
          decisionMaker: "Jane Doe, CEO",
          email: "info@acme.fi",
          linkedInUrl: "https://linkedin.com/company/acme",
          decisionMakerEmail: null,
          decisionMakerPhone: null,
          decisionMakerLinkedInUrl: null,
        }),
      ),
    ).toBe(true);
  });

  it("returns false when at least one personal contact field is present", () => {
    expect(
      hasOutreachContactGaps(
        createExtractedCompanyProfile({
          decisionMaker: "Jane Doe, CEO",
          decisionMakerEmail: "jane@acme.fi",
          decisionMakerPhone: null,
          decisionMakerLinkedInUrl: null,
        }),
      ),
    ).toBe(false);
  });
});
