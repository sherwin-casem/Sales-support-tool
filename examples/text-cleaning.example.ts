/**
 * TextCleaningService usage examples.
 *
 * Run:
 *   npx tsx examples/text-cleaning.example.ts
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTextCleaningService, aggregateLlmReadyPages } from "@/services/infrastructure/content/text-cleaning.service.js";
import { TextCleaningService } from "@/services/domain/content/text-cleaning.service.js";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixturePath = path.join(rootDir, "tests/fixtures/content/acme-about.html");
const sampleHtml = readFileSync(fixturePath, "utf8");

console.log("=== Example 1: Domain service (direct) ===\n");

const domainCleaner = new TextCleaningService();
const cleaned = domainCleaner.clean({
  html: sampleHtml,
  url: "https://acme.fi/about",
  pagePath: "/about",
  title: "About Acme Logistics",
});

console.log(cleaned.body);
console.log("\n--- Stats ---");
console.log(JSON.stringify(cleaned.stats, null, 2));

console.log("\n=== Example 2: Infrastructure facade (validated + logging) ===\n");

const facade = createTextCleaningService();
const facadeResult = facade.clean({
  html: sampleHtml,
  url: "https://acme.fi/about",
  pagePath: "/about",
});

if (!facadeResult.ok) {
  console.error("Cleaning failed:", facadeResult.error.message);
  process.exit(1);
}

console.log("Title:", facadeResult.value.metadata.title);
console.log("Headings:", facadeResult.value.metadata.headings.map((h) => h.text).join(", "));
console.log("JSON-LD types:", facadeResult.value.metadata.jsonLd.map((item) => item["@type"]));

console.log("\n=== Example 3: Multi-page aggregation for extraction ===\n");

const pages = ["/", "/about", "/contact"].map((pagePath) =>
  domainCleaner.clean({
    html: sampleHtml,
    url: `https://acme.fi${pagePath === "/" ? "" : pagePath}`,
    pagePath,
  }),
);

const aggregated = aggregateLlmReadyPages(pages);
console.log(aggregated.slice(0, 800));
console.log("\n... [truncated for display]");
