import { describe, expect, it } from "vitest";
import {
  validateEmail,
  validatePersonalEmail,
} from "@/lib/validations/lead-contact.validation.js";
import { resolveDecisionMakerContact } from "@/lib/results/decision-maker-contact.js";
import { createExtractedCompanyProfile } from "../../helpers/extracted-company.fixture.js";

describe("lead-contact.validation email", () => {
  it("accepts valid company and personal emails", () => {
    expect(validateEmail("info@acme.fi")).toBe("info@acme.fi");
    expect(validateEmail(" Jane.Doe@Acme.FI ")).toBe("jane.doe@acme.fi");
  });

  it("rejects malformed and placeholder emails", () => {
    expect(validateEmail("not-an-email")).toBeNull();
    expect(validateEmail("@missing.com")).toBeNull();
    expect(validateEmail("user@")).toBeNull();
    expect(validateEmail("user@example.com")).toBeNull();
    expect(validateEmail("user@test.com")).toBeNull();
    expect(validateEmail("user@sample.com")).toBeNull();
    expect(validateEmail(null)).toBeNull();
    expect(validateEmail("")).toBeNull();
  });

  it("rejects generic inboxes for personal email validation", () => {
    expect(validatePersonalEmail("info@acme.fi")).toBeNull();
    expect(validatePersonalEmail("sales@acme.fi")).toBeNull();
    expect(validatePersonalEmail("noreply@acme.fi")).toBeNull();
  });

  it("accepts personal emails and rejects company duplicates", () => {
    expect(validatePersonalEmail("jane.doe@acme.fi")).toBe("jane.doe@acme.fi");
    expect(
      validatePersonalEmail("jane.doe@acme.fi", "info@acme.fi"),
    ).toBe("jane.doe@acme.fi");
    expect(
      validatePersonalEmail("info@acme.fi", "info@acme.fi"),
    ).toBeNull();
  });
});

describe("decision-maker-contact email display", () => {
  it("validates decision maker email at resolve time", () => {
    const contact = resolveDecisionMakerContact(
      createExtractedCompanyProfile({
        decisionMaker: "Jane Doe, CEO",
        decisionMakerEmail: "not-an-email",
      }),
    );

    expect(contact?.email).toBeNull();
  });

  it("rejects generic inbox shown as personal email", () => {
    const contact = resolveDecisionMakerContact(
      createExtractedCompanyProfile({
        decisionMaker: "Jane Doe, CEO",
        decisionMakerEmail: "info@acme.fi",
      }),
    );

    expect(contact?.email).toBeNull();
  });
});
