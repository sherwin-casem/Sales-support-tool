import { describe, expect, it } from "vitest";
import {
  CrawlCompanyResultSchema,
  CrawledPageSchema,
} from "@/lib/validations/crawler.schema.js";

describe("CrawlCompanyResultSchema", () => {
  it("validates structured crawl output", () => {
    const result = CrawlCompanyResultSchema.safeParse({
      companyId: "00000000-0000-4000-8000-000000000001",
      domain: "acme.fi",
      baseUrl: "https://acme.fi",
      pages: [
        {
          path: "/",
          url: "https://acme.fi/",
          httpStatus: 200,
          title: "Acme Logistics",
          contentText: "Finnish logistics provider",
          html: "<html></html>",
          crawledAt: new Date().toISOString(),
        },
      ],
      status: "partial",
      pagesSucceeded: 1,
      pagesAttempted: 5,
      durationMs: 1200,
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid crawl path", () => {
    const result = CrawledPageSchema.safeParse({
      path: "/invalid",
      url: "https://acme.fi/invalid",
      httpStatus: 200,
      title: "Acme",
      contentText: "text",
      html: "<html></html>",
      crawledAt: new Date().toISOString(),
    });

    expect(result.success).toBe(false);
  });
});
