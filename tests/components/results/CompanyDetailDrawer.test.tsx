import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
  }),
}));
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
      products: ["Tracking Platform", "Fleet API"],
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
  it("renders company sections without decision maker contact in overview mode", () => {
    const html = renderDrawer(createSearchResult(), "overview");

    expect(html).toContain("Acme Logistics Oy");
    expect(html).toContain("Overview");
    expect(html).toContain("Technology");
    expect(html).toContain("Tracking Platform");
    expect(html).toContain("Company contact");
    expect(html).toContain("info@acme.fi");
    expect(html).toContain("Target customers");
    expect(html).toContain("Outreach message");
    expect(html).toContain("Generate with AI");
    expect(html).not.toContain("Decision maker contact");
    expect(html).not.toContain("jane@acme.fi");
  });

  it("places company contact after services and target customers", () => {
    const html = renderDrawer(createSearchResult(), "overview");

    expect(html.indexOf("Services")).toBeLessThan(html.indexOf("Company contact"));
    expect(html.indexOf("Target customers")).toBeLessThan(html.indexOf("Company contact"));
    expect(html.indexOf("info@acme.fi")).toBeGreaterThan(html.indexOf("Target customers"));
  });

  it("renders only personal decision maker contact in decision maker mode", () => {
    const html = renderDrawer(createSearchResult(), "decisionMaker");

    expect(html).toContain("Jane Doe, CEO");
    expect(html).toContain("Decision maker contact");
    expect(html).toContain("jane@acme.fi");
    expect(html).toContain("+358 9 111 2222");
    expect(html).toContain("https://linkedin.com/in/janedoe");
    expect(html).not.toContain("Acme Logistics Oy");
    expect(html).not.toContain("Overview");
    expect(html).not.toContain("Technology");
    expect(html).not.toContain("Company contact");
    expect(html).not.toContain("info@acme.fi");
  });

  it("shows an empty personal contact message when personal fields are missing", () => {
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
    expect(html).not.toContain(">Email</dt>");
    expect(html).not.toContain(">Phone</dt>");
    expect(html).not.toContain(">LinkedIn</dt>");
  });

  it("hides empty company contact rows when only email is available", () => {
    const html = renderDrawer(
      createSearchResult({
        email: "info@acme.fi",
        phone: null,
        linkedInUrl: null,
        xUrl: null,
      }),
      "overview",
    );

    expect(html).toContain("Company contact");
    expect(html).toContain("info@acme.fi");
    expect(html).not.toContain(">Phone</dt>");
    expect(html).not.toContain(">LinkedIn</dt>");
    expect(html).not.toContain(">X</dt>");
  });

  it("hides the company contact section when all contact fields are empty", () => {
    const html = renderDrawer(
      createSearchResult({
        email: null,
        phone: null,
        linkedInUrl: null,
        xUrl: null,
      }),
      "overview",
    );

    expect(html).not.toContain("Company contact");
  });

  it("hides empty decision maker contact rows when only email is available", () => {
    const html = renderDrawer(
      createSearchResult({
        decisionMakerEmail: "jane@acme.fi",
        decisionMakerPhone: null,
        decisionMakerLinkedInUrl: null,
      }),
      "decisionMaker",
    );

    expect(html).toContain("jane@acme.fi");
    expect(html).not.toContain(">Phone</dt>");
    expect(html).not.toContain(">LinkedIn</dt>");
    expect(html).not.toContain("+358 9 111 2222");
  });

  it("hides empty overview fields instead of showing em dashes", () => {
    const html = renderDrawer(
      createSearchResult({
        industry: "logistics",
        estimatedCompanySize: "unknown",
        revenue: "unknown",
        city: "unknown",
        country: "unknown",
      }),
      "overview",
    );

    expect(html).toContain("Industry");
    expect(html).toContain("logistics");
    expect(html).not.toContain("Company size");
    expect(html).not.toContain("Revenue");
    expect(html).not.toContain("Location");
    expect(html).not.toContain("—");
  });

  it("hides the overview detail grid when all overview fields are unknown", () => {
    const html = renderDrawer(
      createSearchResult({
        industry: "unknown",
        estimatedCompanySize: "unknown",
        revenue: "unknown",
        city: "unknown",
        country: "unknown",
      }),
      "overview",
    );

    expect(html).toContain("Overview");
    expect(html).not.toContain("Industry");
    expect(html).not.toContain("Company size");
    expect(html).not.toContain("Revenue");
    expect(html).not.toContain("—");
  });

  it("shows an empty technology state when no products are extracted", () => {
    const html = renderDrawer(createSearchResult({ products: [] }));

    expect(html).toContain("No technology identified");
  });
});
