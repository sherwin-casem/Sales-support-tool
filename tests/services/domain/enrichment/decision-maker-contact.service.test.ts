import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createExtractedCompanyProfile } from "../../../helpers/extracted-company.fixture.js";
import {
  applyDecisionMakerContactHints,
  enrichProfileWithDecisionMakerContacts,
  extractDecisionMakerContactsFromHtml,
  hasDecisionMakerPersonalContactGaps,
  sanitizeDecisionMakerContacts,
} from "@/services/domain/enrichment/decision-maker-contact.service.js";

const teamHtml = readFileSync(
  join(process.cwd(), "tests/fixtures/content/acme-team.html"),
  "utf8",
);

describe("decision-maker-contact.service", () => {
  it("extracts personal contacts near the decision maker name from HTML", () => {
    const hints = extractDecisionMakerContactsFromHtml(teamHtml, "Jane Doe, CEO");

    expect(hints.email).toBe("jane.doe@acme.fi");
    expect(hints.linkedInUrl).toBe("https://linkedin.com/in/janedoe");
    expect(hints.phone).toContain("+358");
  });

  it("does not attribute another executive's email to the selected decision maker", () => {
    const hints = extractDecisionMakerContactsFromHtml(teamHtml, "Jane Doe, CEO");

    expect(hints.email).not.toBe("john.smith@acme.fi");
  });

  it("sanitizes generic and duplicate company contacts from personal fields", () => {
    const sanitized = sanitizeDecisionMakerContacts(
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
    expect(enriched.decisionMakerPhone).toContain("+358");
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
            phone: null,
            linkedInUrl: null,
          },
        ),
      ),
    ).toBe(false);
  });
});
