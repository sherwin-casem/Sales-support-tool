import { describe, expect, it } from "vitest";
import { createExtractedCompanyProfile } from "../../helpers/extracted-company.fixture.js";
import { sanitizeProfileForResponse } from "@/lib/api/sanitize-profile.js";

describe("profile-contacts", () => {
  it("re-validates stored contact fields for API responses", () => {
    const sanitized = sanitizeProfileForResponse(
      createExtractedCompanyProfile({
        phone: "1234567890",
        decisionMakerPhone: "+358401234567",
      }),
    );

    expect(sanitized?.phone).toBeNull();
    expect(sanitized?.decisionMakerPhone).toBe("+358 40 123 4567");
  });

  it("returns null when profile is missing", () => {
    expect(sanitizeProfileForResponse(null)).toBeNull();
    expect(sanitizeProfileForResponse(undefined)).toBeNull();
  });
});
