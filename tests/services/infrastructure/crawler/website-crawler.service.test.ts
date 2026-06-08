import { describe, expect, it, vi } from "vitest";
import { PlaywrightCrawlerAdapter } from "@/services/infrastructure/crawler/playwright-crawler.adapter.js";
import {
  WebsiteCrawlerService,
  mapWebsiteCrawlerError,
} from "@/services/infrastructure/crawler/website-crawler.service.js";
import { WebsiteCrawlerError } from "@/types/crawler/crawler-error.types.js";

describe("WebsiteCrawlerService", () => {
  it("returns structured crawl result from adapter", async () => {
    const crawlCompany = vi.fn().mockResolvedValue({
      companyId: "00000000-0000-4000-8000-000000000001",
      domain: "acme.fi",
      baseUrl: "https://acme.fi",
      pages: [
        {
          path: "/",
          url: "https://acme.fi/",
          httpStatus: 200,
          title: "Acme",
          contentText: "Homepage",
          html: "<html>home</html>",
          crawledAt: new Date().toISOString(),
        },
      ],
      status: "partial",
      pagesSucceeded: 1,
      pagesAttempted: 5,
      durationMs: 100,
    });

    const adapter = { crawlCompany } as unknown as PlaywrightCrawlerAdapter;
    const service = new WebsiteCrawlerService(adapter, { maxAttempts: 1 });

    const result = await service.crawl({
      companyId: "00000000-0000-4000-8000-000000000001",
      website: "https://acme.fi",
      normalizedDomain: "acme.fi",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.status).toBe("partial");
      expect(result.value.pagesSucceeded).toBe(1);
    }
  });

  it("returns crawl failed when all pages fail", async () => {
    const crawlCompany = vi.fn().mockResolvedValue({
      companyId: "00000000-0000-4000-8000-000000000001",
      domain: "acme.fi",
      baseUrl: "https://acme.fi",
      pages: [],
      status: "failed",
      pagesSucceeded: 0,
      pagesAttempted: 5,
      durationMs: 50,
    });

    const adapter = { crawlCompany } as unknown as PlaywrightCrawlerAdapter;
    const service = new WebsiteCrawlerService(adapter, { maxAttempts: 1 });

    const result = await service.crawl({
      companyId: "00000000-0000-4000-8000-000000000001",
      website: "https://acme.fi",
      normalizedDomain: "acme.fi",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("CRAWL_FAILED");
    }
  });

  it("rejects invalid input", async () => {
    const adapter = { crawlCompany: vi.fn() } as unknown as PlaywrightCrawlerAdapter;
    const service = new WebsiteCrawlerService(adapter);

    const result = await service.crawl({
      companyId: "not-a-uuid",
      website: "https://acme.fi",
      normalizedDomain: "acme.fi",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(mapWebsiteCrawlerError(result.error).status).toBe(400);
    }
  });
});

describe("mapWebsiteCrawlerError", () => {
  it("maps crawl failures to 503", () => {
    const mapped = mapWebsiteCrawlerError(
      new WebsiteCrawlerError("CRAWL_FAILED", "All paths failed"),
    );

    expect(mapped.status).toBe(503);
  });
});
