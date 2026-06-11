import { describe, expect, it } from "vitest";
import { createExtractedCompanyProfile } from "../../helpers/extracted-company.fixture.js";
import {
  hasDecisionMakerContactDetails,
  resolveDecisionMakerContact,
} from "@/lib/results/decision-maker-contact.js";

describe("decision-maker-contact", () => {
  it("resolves personal decision maker contact fields only", () => {
    const profile = createExtractedCompanyProfile({
      decisionMaker: "Jane Doe, CEO",
      decisionMakerEmail: "jane@acme.fi",
      decisionMakerPhone: "+358 9 111 2222",
      decisionMakerLinkedInUrl: "https://linkedin.com/in/janedoe",
      email: "info@acme.fi",
      phone: "+358 9 333 4444",
      linkedInUrl: "https://linkedin.com/company/acme",
    });

    const contact = resolveDecisionMakerContact(profile);

    expect(contact).toEqual({
      name: "Jane Doe, CEO",
      email: "jane@acme.fi",
      phone: "+358 9 111 2222",
      linkedInUrl: "https://linkedin.com/in/janedoe",
    });
    expect(hasDecisionMakerContactDetails(contact!)).toBe(true);
  });

  it("does not fall back to company contact fields", () => {
    const profile = createExtractedCompanyProfile({
      decisionMaker: "Jane Doe, CEO",
      email: "info@acme.fi",
      phone: "+358 9 333 4444",
      linkedInUrl: "https://linkedin.com/company/acme",
    });

    const contact = resolveDecisionMakerContact(profile);

    expect(contact?.email).toBeNull();
    expect(contact?.phone).toBeNull();
    expect(contact?.linkedInUrl).toBeNull();
    expect(hasDecisionMakerContactDetails(contact!)).toBe(false);
  });

  it("formats compact decision maker phone numbers for display", () => {
    const contact = resolveDecisionMakerContact(
      createExtractedCompanyProfile({
        decisionMaker: "Jane Doe, CEO",
        decisionMakerPhone: "+358401234567",
      }),
    );

    expect(contact?.phone).toBe("+358 40 123 4567");
  });

  it("returns null when decision maker is unknown", () => {
    expect(resolveDecisionMakerContact(createExtractedCompanyProfile())).toBeNull();
  });
});
