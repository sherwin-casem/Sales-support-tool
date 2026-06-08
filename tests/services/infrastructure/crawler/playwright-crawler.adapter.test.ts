import { describe, expect, it, vi } from "vitest";
import { getDefaultCrawlerConfig } from "@/lib/config/crawler.config.js";
import type {
  BrowserContextPort,
  BrowserPoolPort,
  CrawlPagePort,
  PageCrawlerPort,
} from "@/services/infrastructure/crawler/browser-pool.port.js";
import { PlaywrightCrawlerAdapter } from "@/services/infrastructure/crawler/playwright-crawler.adapter.js";
import { RobotsTxtService } from "@/services/domain/crawler/robots-txt.service.js";
import type { HttpClient } from "@/lib/http/http-client.js";

function createMockPage(content: string, status = 200, url = "https://acme.fi/"): CrawlPagePort {
  return {
    goto: vi.fn().mockResolvedValue({ status, finalUrl: url }),
    title: vi.fn().mockResolvedValue("Acme Logistics"),
    content: vi.fn().mockResolvedValue({
      html: `<html><body>${content}</body></html>`,
      text: content,
    }),
    close: vi.fn().mockResolvedValue(undefined),
  };
}

describe("PlaywrightCrawlerAdapter", () => {
  const config = {
    ...getDefaultCrawlerConfig(),
    CRAWLER_INTER_PAGE_DELAY_MS: 0,
    CRAWLER_DOMAIN_DELAY_MS: 0,
    CRAWLER_RESPECT_ROBOTS: false,
  };

  it("crawls all configured paths and returns structured result", async () => {
    const mockPage = createMockPage("Logistics services in Finland");
    const context: BrowserContextPort = {
      newPage: vi.fn().mockResolvedValue(mockPage),
      close: vi.fn(),
    };
    const pool: BrowserPoolPort = {
      withContext: vi.fn(async (operation) => operation(context)),
      shutdown: vi.fn(),
    };

    const pageCrawler: PageCrawlerPort = {
      crawlPage: vi.fn(async (page, path, url) => ({
        success: true,
        page: {
          path,
          url,
          httpStatus: 200,
          title: "Acme Logistics",
          contentText: `Content for ${path}`,
          html: `<html>${path}</html>`,
        },
      })),
    };

    const http: HttpClient = { get: vi.fn(), post: vi.fn() };
    const adapter = new PlaywrightCrawlerAdapter(
      pool,
      pageCrawler,
      new RobotsTxtService(http),
      config,
    );

    const result = await adapter.crawlCompany({
      companyId: "00000000-0000-4000-8000-000000000001",
      website: "https://acme.fi",
      normalizedDomain: "acme.fi",
    });

    expect(result.status).toBe("success");
    expect(result.pages).toHaveLength(5);
    expect(result.pagesSucceeded).toBe(5);
    expect(result.pages[0]?.path).toBe("/");
    expect(result.pages[4]?.path).toBe("/careers");
  });

  it("returns partial status when some pages fail", async () => {
    const context: BrowserContextPort = {
      newPage: vi.fn().mockResolvedValue(createMockPage("homepage")),
      close: vi.fn(),
    };
    const pool: BrowserPoolPort = {
      withContext: vi.fn(async (operation) => operation(context)),
      shutdown: vi.fn(),
    };

    const pageCrawler: PageCrawlerPort = {
      crawlPage: vi.fn(async (page, path, url) => {
        if (path === "/") {
          return {
            success: true,
            page: {
              path,
              url,
              httpStatus: 200,
              title: "Acme",
              contentText: "Homepage content",
              html: "<html>home</html>",
            },
          };
        }

        return { success: false, error: "HTTP 404", retryable: false };
      }),
    };

    const http: HttpClient = { get: vi.fn(), post: vi.fn() };
    const adapter = new PlaywrightCrawlerAdapter(
      pool,
      pageCrawler,
      new RobotsTxtService(http),
      config,
    );

    const result = await adapter.crawlCompany({
      companyId: "00000000-0000-4000-8000-000000000001",
      website: "https://acme.fi",
      normalizedDomain: "acme.fi",
    });

    expect(result.status).toBe("partial");
    expect(result.pagesSucceeded).toBe(1);
    expect(result.pages.filter((page) => page.error)).toHaveLength(4);
  });
});
