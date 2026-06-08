import { describe, expect, it, vi } from "vitest";
import { getDefaultCrawlerConfig } from "@/lib/config/crawler.config.js";
import type { CrawlPagePort } from "@/services/infrastructure/crawler/browser-pool.port.js";
import { PlaywrightPageCrawler } from "@/services/infrastructure/crawler/playwright-page-crawler.js";

describe("PlaywrightPageCrawler", () => {
  const config = {
    ...getDefaultCrawlerConfig(),
    CRAWLER_PAGE_MAX_ATTEMPTS: 2,
  };

  it("returns sanitized page content on success", async () => {
    const page: CrawlPagePort = {
      goto: vi.fn().mockResolvedValue({ status: 200, finalUrl: "https://acme.fi/about" }),
      title: vi.fn().mockResolvedValue("Acme Logistics"),
      content: vi.fn().mockResolvedValue({
        html: "<html><script>x</script><body>Hello</body></html>",
        text: "Hello",
      }),
      close: vi.fn(),
    };

    const crawler = new PlaywrightPageCrawler(config);
    const outcome = await crawler.crawlPage(page, "/", "https://acme.fi/");

    expect(outcome.success).toBe(true);
    expect(outcome.page?.contentText).toBe("Hello");
    expect(outcome.page?.html).not.toContain("<script");
  });

  it("does not retry non-retryable 404 responses", async () => {
    const page: CrawlPagePort = {
      goto: vi.fn().mockResolvedValue({ status: 404, finalUrl: "https://acme.fi/missing" }),
      title: vi.fn(),
      content: vi.fn(),
      close: vi.fn(),
    };

    const crawler = new PlaywrightPageCrawler(config);
    const outcome = await crawler.crawlPage(page, "/about", "https://acme.fi/about");

    expect(outcome.success).toBe(false);
    expect(outcome.error).toBe("HTTP 404");
    expect(page.goto).toHaveBeenCalledOnce();
  });
});
