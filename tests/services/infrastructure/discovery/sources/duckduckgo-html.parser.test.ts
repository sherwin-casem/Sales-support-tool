import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  extractTargetUrl,
  isDuckDuckGoBlockedPage,
  parseDuckDuckGoHtml,
  sanitizeResultTitle,
} from "@/services/infrastructure/discovery/sources/duckduckgo-html.parser.js";

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

describe("duckduckgo-html.parser", () => {
  it("detects blocked DuckDuckGo pages", () => {
    expect(isDuckDuckGoBlockedPage(readFixture("ddg-blocked.html"))).toBe(true);
    expect(isDuckDuckGoBlockedPage(readFixture("ddg-results.html"))).toBe(false);
  });

  it("parses valid HTML and skips blocklisted domains", () => {
    const seenDomains = new Set<string>();
    const results = parseDuckDuckGoHtml(readFixture("ddg-results.html"), finlandCriteria, seenDomains);

    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({
      companyName: "Acme Logistics Finland",
      website: "https://www.acme.fi",
      source: "duckduckgo_html",
    });
    expect(results[1]).toMatchObject({
      companyName: "Beta Transport Oy",
      website: "https://www.beta.fi",
    });
  });

  it("parses protocol-relative redirect links", () => {
    const results = parseDuckDuckGoHtml(
      readFixture("ddg-protocol-relative.html"),
      finlandCriteria,
      new Set<string>(),
    );

    expect(results).toEqual([
      expect.objectContaining({
        companyName: "Protocol Relative Co",
        website: "https://www.protocol-relative.fi",
      }),
    ]);
  });

  it("extracts target URLs from DuckDuckGo redirect links", () => {
    expect(
      extractTargetUrl("https://duckduckgo.com/l/?uddg=https%3A%2F%2Fwww.acme.fi"),
    ).toBe("https://www.acme.fi");
    expect(extractTargetUrl("//duckduckgo.com/l/?uddg=https%3A%2F%2Fwww.acme.fi")).toBe(
      "https://www.acme.fi",
    );
  });

  it("sanitizes result titles", () => {
    expect(sanitizeResultTitle("Acme Logistics | Official Website")).toBe("Acme Logistics");
  });
});
