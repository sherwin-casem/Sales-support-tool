import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createExtractedCompanyProfile } from "../../../helpers/extracted-company.fixture.js";
import {
  applyDecisionMakerContactHints,
  enrichProfileWithDecisionMakerContacts,
  extractDecisionMakerContactsFromHtml,
  hasDecisionMakerPersonalContactGaps,
  sanitizeLeadContacts,
} from "@/services/domain/enrichment/decision-maker-contact.service.js";

const teamHtml = readFileSync(
  join(process.cwd(), "tests/fixtures/content/acme-team.html"),
  "utf8",
);

describe("decision-maker-contact.service", () => {
  it("extracts personal email and LinkedIn near the decision maker name from HTML", () => {
    const hints = extractDecisionMakerContactsFromHtml(teamHtml, "Jane Doe, CEO");

    expect(hints.email).toBe("jane.doe@acme.fi");
    expect(hints.linkedInUrl).toBe("https://linkedin.com/in/janedoe");
  });

  it("does not attribute another executive's email to the selected decision maker", () => {
    const hints = extractDecisionMakerContactsFromHtml(teamHtml, "Jane Doe, CEO");

    expect(hints.email).not.toBe("john.smith@acme.fi");
  });

  it("nulls invalid company and decision maker contact formats", () => {
    const sanitized = sanitizeLeadContacts(
      createExtractedCompanyProfile({
        decisionMaker: "Jane Doe, CEO",
        email: "not-an-email",
        phone: "12345",
        decisionMakerEmail: "also-bad",
        decisionMakerPhone: "0000000",
      }),
    );

    expect(sanitized.email).toBeNull();
    expect(sanitized.phone).toBeNull();
    expect(sanitized.decisionMakerEmail).toBeNull();
    expect(sanitized.decisionMakerPhone).toBeNull();
  });

  it("sanitizes generic and duplicate company contacts from personal fields", () => {
    const sanitized = sanitizeLeadContacts(
      createExtractedCompanyProfile({
        decisionMaker: "Jane Doe, CEO",
        decisionMakerEmail: "info@acme.fi",
        decisionMakerPhone: "+358 9 123 4567",
        decisionMakerLinkedInUrl: "https://linkedin.com/company/acme",
        email: "info@acme.fi",
        phone: "+358 9 123 4567",
        linkedInUrl: "https://linkedin.com/company/acme",
      }),
    );

    expect(sanitized.decisionMakerEmail).toBeNull();
    expect(sanitized.decisionMakerPhone).toBeNull();
    expect(sanitized.decisionMakerLinkedInUrl).toBeNull();
  });

  it("enriches profile with HTML hints without overwriting existing personal fields", () => {
    const enriched = enrichProfileWithDecisionMakerContacts(
      createExtractedCompanyProfile({
        decisionMaker: "Jane Doe, CEO",
        decisionMakerEmail: "jane.doe@acme.fi",
      }),
      [teamHtml],
    );

    expect(enriched.decisionMakerEmail).toBe("jane.doe@acme.fi");
    expect(enriched.decisionMakerLinkedInUrl).toBe("https://linkedin.com/in/janedoe");
    expect(enriched.decisionMakerPhone).toBeNull();
  });

  it("preserves LLM-provided decision maker phone without HTML phone hints", () => {
    const enriched = enrichProfileWithDecisionMakerContacts(
      createExtractedCompanyProfile({
        decisionMaker: "Jane Doe, CEO",
        decisionMakerPhone: "+358 40 123 4567",
      }),
      [teamHtml],
    );

    expect(enriched.decisionMakerPhone).toBe("+358 40 123 4567");
  });

  it("rejects malformed HTML-extracted contacts", () => {
    const malformedHtml = `
      <section>
        <h2>Jane Doe, CEO</h2>
        <a href="mailto:not-an-email">Email</a>
        <a href="tel:123">Phone</a>
      </section>
    `;

    const hints = extractDecisionMakerContactsFromHtml(malformedHtml, "Jane Doe, CEO");

    expect(hints.email).toBeNull();
  });

  it("detects personal contact gaps using personal fields only", () => {
    expect(
      hasDecisionMakerPersonalContactGaps(
        createExtractedCompanyProfile({
          decisionMaker: "Jane Doe, CEO",
          email: "info@acme.fi",
          linkedInUrl: "https://linkedin.com/company/acme",
        }),
      ),
    ).toBe(true);

    expect(
      hasDecisionMakerPersonalContactGaps(
        applyDecisionMakerContactHints(
          createExtractedCompanyProfile({ decisionMaker: "Jane Doe, CEO" }),
          {
            email: "jane.doe@acme.fi",
            linkedInUrl: null,
          },
        ),
      ),
    ).toBe(false);
  });
});
