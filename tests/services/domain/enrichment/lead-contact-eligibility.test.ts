import { describe, expect, it } from "vitest";
import { createExtractedCompanyProfile } from "../../../helpers/extracted-company.fixture.js";
import {
  hasAnyLeadContactDetails,
  hasCompanyContactDetails,
} from "@/services/domain/enrichment/lead-contact-eligibility.js";

describe("lead-contact-eligibility", () => {
  it("detects company email as company contact", () => {
    const profile = createExtractedCompanyProfile({
      email: "info@acme.fi",
      phone: null,
      linkedInUrl: null,
      xUrl: null,
    });

    expect(hasCompanyContactDetails(profile)).toBe(true);
    expect(hasAnyLeadContactDetails(profile)).toBe(true);
  });

  it("detects company phone and social URLs as company contact", () => {
    expect(
      hasCompanyContactDetails(
        createExtractedCompanyProfile({
          email: null,
          phone: "+358 9 123 4567",
        }),
      ),
    ).toBe(true);

    expect(
      hasCompanyContactDetails(
        createExtractedCompanyProfile({
          email: null,
          phone: null,
          linkedInUrl: "https://linkedin.com/company/acme",
        }),
      ),
    ).toBe(true);

    expect(
      hasCompanyContactDetails(
        createExtractedCompanyProfile({
          email: null,
          phone: null,
          linkedInUrl: null,
          xUrl: "https://x.com/acme",
        }),
      ),
    ).toBe(true);
  });

  it("detects decision-maker personal contact without company contact", () => {
    const profile = createExtractedCompanyProfile({
      email: null,
      phone: null,
      linkedInUrl: null,
      xUrl: null,
      decisionMaker: "Jane Doe, CEO",
      decisionMakerEmail: "jane@acme.fi",
    });

    expect(hasCompanyContactDetails(profile)).toBe(false);
    expect(hasAnyLeadContactDetails(profile)).toBe(true);
  });

  it("treats decision-maker name only as contactless", () => {
    const profile = createExtractedCompanyProfile({
      email: null,
      phone: null,
      linkedInUrl: null,
      xUrl: null,
      decisionMaker: "Jane Doe, CEO",
      decisionMakerEmail: null,
      decisionMakerPhone: null,
      decisionMakerLinkedInUrl: null,
    });

    expect(hasAnyLeadContactDetails(profile)).toBe(false);
  });

  it("treats missing profile as contactless", () => {
    expect(hasAnyLeadContactDetails(null)).toBe(false);
    expect(hasAnyLeadContactDetails(undefined)).toBe(false);
  });

  it("treats profiles with no company or decision-maker contact as contactless", () => {
    const profile = createExtractedCompanyProfile({
      email: null,
      phone: null,
      linkedInUrl: null,
      xUrl: null,
      decisionMaker: "unknown",
      decisionMakerEmail: null,
      decisionMakerPhone: null,
      decisionMakerLinkedInUrl: null,
    });

    expect(hasCompanyContactDetails(profile)).toBe(false);
    expect(hasAnyLeadContactDetails(profile)).toBe(false);
  });
});
