import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CompanyDetailDrawer } from "@/components/results/CompanyDetailDrawer";
import type { SearchResultItemResponse } from "@/types/api/search.api.types.js";
import { createExtractedCompanyProfile } from "../../helpers/extracted-company.fixture.js";

function createSearchResult(
  profileOverrides: Parameters<typeof createExtractedCompanyProfile>[0] = {},
): SearchResultItemResponse {
  return {
    searchResultId: "00000000-0000-4000-8000-000000000040",
    rank: 1,
    stage: "ENRICHED",
    stageError: null,
    discoveredAt: "2026-06-07T12:00:00.000Z",
    completedAt: "2026-06-07T12:05:00.000Z",
    company: {
      id: "00000000-0000-4000-8000-000000000010",
      name: "Acme Logistics Oy",
      domain: "acme.fi",
      websiteUrl: "https://acme.fi",
    },
    profile: createExtractedCompanyProfile({
      decisionMaker: "Jane Doe, CEO",
      decisionMakerEmail: "jane@acme.fi",
      decisionMakerPhone: "+358 9 111 2222",
      decisionMakerLinkedInUrl: "https://linkedin.com/in/janedoe",
      email: "info@acme.fi",
      phone: "+358 9 333 4444",
      linkedInUrl: "https://linkedin.com/company/acme",
      services: ["Freight forwarding"],
      targetCustomers: ["Manufacturers"],
      ...profileOverrides,
    }),
    profileCompleteness: 0.9,
  };
}

function renderDrawer(
  result: SearchResultItemResponse,
  focusSection: "overview" | "decisionMaker" = "overview",
) {
  return renderToStaticMarkup(
    <CompanyDetailDrawer
      result={result}
      searchCriteria={null}
      open
      focusSection={focusSection}
      onClose={() => undefined}
    />,
  );
}

describe("CompanyDetailDrawer", () => {
  it("shows only personal contact content when focused on the decision maker", () => {
    const html = renderDrawer(createSearchResult(), "decisionMaker");

    expect(html).toContain("Jane Doe, CEO");
    expect(html).toContain("jane@acme.fi");
    expect(html).toContain("+358 9 111 2222");
    expect(html).toContain("https://linkedin.com/in/janedoe");
    expect(html).toContain("Decision maker contact");
    expect(html).not.toContain("Visit website");
    expect(html).not.toContain("Overview");
    expect(html).not.toContain("Company contact");
    expect(html).not.toContain("info@acme.fi");
    expect(html).not.toContain("Target customers");
  });

  it("uses the decision maker name as the drawer title in decision maker mode", () => {
    const html = renderDrawer(createSearchResult(), "decisionMaker");

    expect(html).toContain("Jane Doe, CEO");
    expect(html).not.toContain("Acme Logistics Oy");
  });

  it("shows the empty personal contact message when personal fields are missing", () => {
    const html = renderDrawer(
      createSearchResult({
        decisionMakerEmail: null,
        decisionMakerPhone: null,
        decisionMakerLinkedInUrl: null,
      }),
      "decisionMaker",
    );

    expect(html).toContain("No personal email, phone, or LinkedIn was found for this decision maker.");
    expect(html).not.toContain("Company contact");
  });

  it("shows the full company layout in overview mode", () => {
    const html = renderDrawer(createSearchResult(), "overview");

    expect(html).toContain("Acme Logistics Oy");
    expect(html).toContain("Visit website");
    expect(html).toContain("Overview");
    expect(html).toContain("Company contact");
    expect(html).toContain("info@acme.fi");
    expect(html).toContain("Target customers");
    expect(html).toContain("Jane Doe, CEO");
  });
});
