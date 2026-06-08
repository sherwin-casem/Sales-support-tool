import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { HttpClient } from "@/lib/http/http-client.js";
import { getDefaultDiscoveryConfig } from "@/lib/config/discovery.config.js";
import {
  buildFallbackSearchQuery,
  buildSearchQuery,
  DuckDuckGoHtmlDiscoverySource,
} from "@/services/infrastructure/discovery/sources/duckduckgo-html.source.js";

const finlandCriteria = {
  industry: "logistics",
  location: "Finland",
  locationContext: {
    location: "Finland",
    countryCode: "FI",
    countryQid: "Q33",
    primaryTld: ".fi",
  },
  limit: 10,
};

function readFixture(name: string): string {
  return readFileSync(join(process.cwd(), "tests/fixtures/discovery", name), "utf8");
}

describe("DuckDuckGoHtmlDiscoverySource", () => {
  it("parses DuckDuckGo HTML results and skips blocklisted domains", async () => {
    const http: HttpClient = {
      get: vi.fn(),
      post: vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => readFixture("ddg-results.html"),
      }),
    };

    const source = new DuckDuckGoHtmlDiscoverySource(http, {
      config: { ...getDefaultDiscoveryConfig(), DISCOVERY_DDG_MODE: "http" },
    });
    const results = await source.discover(finlandCriteria);

    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      companyName: "Acme Logistics Finland",
      website: "https://www.acme.fi",
      source: "duckduckgo_html",
    });
    expect(http.post).toHaveBeenCalled();
  });

  it("falls back to Playwright when HTTP returns a blocked page", async () => {
    const http: HttpClient = {
      get: vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => readFixture("ddg-blocked.html"),
      }),
      post: vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => readFixture("ddg-blocked.html"),
      }),
    };

    const playwrightClient = {
      search: vi.fn().mockResolvedValue(readFixture("ddg-results.html")),
    };

    const source = new DuckDuckGoHtmlDiscoverySource(http, {
      config: { ...getDefaultDiscoveryConfig(), DISCOVERY_DDG_MODE: "auto" },
      playwrightClient,
    });

    const results = await source.discover(finlandCriteria);

    expect(results.length).toBeGreaterThan(0);
    expect(playwrightClient.search).toHaveBeenCalled();
  });

  it("builds simplified search queries without inline site exclusions", () => {
    const fintechQuery = buildSearchQuery({
      industry: "fintech",
      location: "United States",
      locationContext: {
        location: "United States",
        countryCode: "US",
        countryQid: "Q30",
        primaryTld: ".com",
      },
      limit: 10,
    });

    expect(fintechQuery).toContain("fintech");
    expect(fintechQuery).toContain("financial");
    expect(fintechQuery).toContain("United States");
    expect(fintechQuery).not.toContain("-site:linkedin.com");

    const houstonQuery = buildSearchQuery({
      industry: "unknown",
      location: "Houston",
      locationContext: {
        location: "Houston",
        city: "Houston",
        regionHint: "Texas",
        countryCode: "US",
        countryQid: "Q30",
        primaryTld: ".com",
      },
      limit: 10,
    });

    expect(houstonQuery).toContain("companies");
    expect(houstonQuery).toContain("Houston Texas");

    const fallbackQuery = buildFallbackSearchQuery({
      industry: "unknown",
      location: "Houston",
      locationContext: {
        location: "Houston",
        city: "Houston",
        regionHint: "Texas",
        countryCode: "US",
        countryQid: "Q30",
        primaryTld: ".com",
      },
      limit: 10,
    });

    expect(fallbackQuery).toContain("companies Houston Texas");
    expect(fallbackQuery).not.toContain("-site:");
  });

  it("registers as a tier 1 discovery source", () => {
    const source = new DuckDuckGoHtmlDiscoverySource({
      get: vi.fn(),
      post: vi.fn(),
    });

    expect(source.tier).toBe(1);
  });
});
