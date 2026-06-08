import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { TextCleaningService } from "@/services/domain/content/text-cleaning.service.js";
import {
  TextCleaningServiceFacade,
  aggregateLlmReadyPages,
} from "@/services/infrastructure/content/text-cleaning.service.js";

const fixtureDir = path.dirname(fileURLToPath(import.meta.url));

function loadFixture(name: string): string {
  return readFileSync(path.join(fixtureDir, "../../../fixtures/content", name), "utf8");
}

describe("TextCleaningService", () => {
  const cleaner = new TextCleaningService();

  it("removes navigation, scripts, and footer boilerplate", () => {
    const html = loadFixture("acme-about.html");
    const result = cleaner.clean({
      html,
      url: "https://acme.fi/about",
      pagePath: "/about",
      title: "About Acme Logistics",
    });

    expect(result.body).not.toContain("window.tracking");
    expect(result.body).not.toContain("We use cookies");
    expect(result.body).not.toContain("navbar");
    expect(result.body).toContain("Acme Logistics Oy provides freight");
    expect(result.body).toContain("sales@acme.fi");
  });

  it("preserves business information and JSON-LD", () => {
    const html = loadFixture("acme-about.html");
    const result = cleaner.clean({
      html,
      url: "https://acme.fi/about",
      pagePath: "/about",
    });

    expect(result.metadata.title).toBe("About Acme Logistics");
    expect(result.metadata.description).toContain("Finnish logistics");
    expect(result.metadata.jsonLd).toHaveLength(1);
    expect(result.metadata.jsonLd[0]?.name).toBe("Acme Logistics Oy");
    expect(result.metadata.headings.some((heading) => heading.text === "Our Services")).toBe(
      true,
    );
    expect(result.body).toContain("STRUCTURED DATA:");
    expect(result.body).toContain("150 people");
  });

  it("marks low quality output when content is too short", () => {
    const result = cleaner.clean({
      html: "<html><head><title>Empty</title></head><body><nav>Menu</nav></body></html>",
      url: "https://acme.fi/empty",
      pagePath: "/empty",
    });

    expect(result.stats.lowQuality).toBe(true);
  });

  it("enforces body char budget while preserving header section", () => {
    const longText = "Logistics content. ".repeat(1000);
    const html = `<html><body><main><h1>Acme</h1><p>${longText}</p></main></body></html>`;

    const result = cleaner.clean(
      {
        html,
        url: "https://acme.fi/about",
        pagePath: "/about",
      },
      { maxBodyChars: 500 },
    );

    expect(result.body.length).toBeLessThanOrEqual(500);
    expect(result.body).toContain("--- PAGE: /about ---");
    expect(result.body).toContain("CONTENT:");
  });
});

describe("TextCleaningServiceFacade", () => {
  it("returns validated structured output", () => {
    const facade = new TextCleaningServiceFacade(new TextCleaningService());
    const html = loadFixture("acme-about.html");

    const result = facade.clean({
      html,
      url: "https://acme.fi/about",
      pagePath: "/about",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.source.pagePath).toBe("/about");
      expect(result.value.stats.outputChars).toBeGreaterThan(100);
    }
  });

  it("rejects invalid input", () => {
    const facade = new TextCleaningServiceFacade(new TextCleaningService());

    const result = facade.clean({
      html: "",
      url: "https://acme.fi/about",
      pagePath: "/about",
    });

    expect(result.ok).toBe(false);
  });
});

describe("aggregateLlmReadyPages", () => {
  it("combines multiple cleaned pages in priority order within budget", () => {
    const pages = [
      {
        body: "--- PAGE: /careers ---\nCAREERS CONTENT",
        metadata: {
          title: null,
          description: null,
          jsonLd: [],
          headings: [],
          language: null,
        },
        stats: {
          inputBytes: 100,
          outputChars: 30,
          compressionRatio: 0.3,
          blocksRemoved: 1,
          sectionsPreserved: 0,
          lowQuality: false,
        },
        source: {
          url: "https://acme.fi/careers",
          pagePath: "/careers",
          cleanedAt: new Date().toISOString(),
        },
      },
      {
        body: "--- PAGE: / ---\nHOME CONTENT",
        metadata: {
          title: null,
          description: null,
          jsonLd: [],
          headings: [],
          language: null,
        },
        stats: {
          inputBytes: 100,
          outputChars: 20,
          compressionRatio: 0.2,
          blocksRemoved: 1,
          sectionsPreserved: 0,
          lowQuality: false,
        },
        source: {
          url: "https://acme.fi/",
          pagePath: "/",
          cleanedAt: new Date().toISOString(),
        },
      },
    ];

    const aggregated = aggregateLlmReadyPages(pages, 50);

    expect(aggregated.startsWith("--- PAGE: / ---")).toBe(true);
    expect(aggregated.length).toBeLessThanOrEqual(50);
  });
});
