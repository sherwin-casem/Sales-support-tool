import type { CrawlerConfig } from "@/lib/config/crawler.config.js";
import { getCrawlerConfig } from "@/lib/config/crawler.config.js";
import { httpClient } from "@/lib/http/http-client.js";
import { crawlerLogger } from "@/lib/logging/logger.js";
import { CrawlCompanyInputSchema } from "@/lib/validations/crawler.schema.js";
import { err, ok, type Result } from "@/lib/utils/result.js";
import { createRobotsTxtService } from "@/services/domain/crawler/robots-txt.service.js";
import type { BrowserPoolPort, PageCrawlerPort } from "@/services/infrastructure/crawler/browser-pool.port.js";
import {
  createPlaywrightBrowserPool,
  PlaywrightBrowserPool,
} from "@/services/infrastructure/crawler/playwright-browser-pool.js";
import {
  createPlaywrightCrawlerAdapter,
  PlaywrightCrawlerAdapter,
} from "@/services/infrastructure/crawler/playwright-crawler.adapter.js";
import {
  createPlaywrightPageCrawler,
} from "@/services/infrastructure/crawler/playwright-page-crawler.js";
import {
  CrawlError,
  WebsiteCrawlerError,
} from "@/types/crawler/crawler-error.types.js";
import type {
  CrawlCompanyInput,
  CrawlCompanyResult,
} from "@/types/crawler/crawler.types.js";

export interface WebsiteCrawlerPort {
  crawl(input: CrawlCompanyInput): Promise<Result<CrawlCompanyResult, WebsiteCrawlerError>>;
}

export interface WebsiteCrawlerServiceOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
}

export class WebsiteCrawlerService implements WebsiteCrawlerPort {
  private readonly maxAttempts: number;
  private readonly initialDelayMs: number;

  constructor(
    private readonly adapter: PlaywrightCrawlerAdapter,
    options: WebsiteCrawlerServiceOptions = {},
  ) {
    this.maxAttempts = options.maxAttempts ?? 2;
    this.initialDelayMs = options.initialDelayMs ?? 500;
  }

  async crawl(
    input: CrawlCompanyInput,
  ): Promise<Result<CrawlCompanyResult, WebsiteCrawlerError>> {
    const parsedInput = CrawlCompanyInputSchema.safeParse(input);

    if (!parsedInput.success) {
      return err(
        WebsiteCrawlerError.fromCrawlError(
          new CrawlError(
            "INVALID_INPUT",
            parsedInput.error.issues.map((issue) => issue.message).join("; "),
            parsedInput.error,
          ),
        ),
      );
    }

    const startedAt = Date.now();

    crawlerLogger.info("WebsiteCrawlerService.crawl started", {
      companyId: parsedInput.data.companyId,
      domain: parsedInput.data.normalizedDomain,
    });

    try {
      const result = await this.crawlWithRetry(parsedInput.data);
      const durationMs = Date.now() - startedAt;

      if (result.status === "failed") {
        crawlerLogger.error("WebsiteCrawlerService.crawl failed", {
          companyId: parsedInput.data.companyId,
          domain: parsedInput.data.normalizedDomain,
          durationMs,
          pagesSucceeded: result.pagesSucceeded,
        });

        return err(
          new WebsiteCrawlerError(
            "CRAWL_FAILED",
            "All crawl paths failed for company",
            result,
          ),
        );
      }

      crawlerLogger.info("WebsiteCrawlerService.crawl completed", {
        companyId: parsedInput.data.companyId,
        domain: parsedInput.data.normalizedDomain,
        durationMs,
        status: result.status,
        pagesSucceeded: result.pagesSucceeded,
        pagesAttempted: result.pagesAttempted,
      });

      return ok(result);
    } catch (error) {
      const durationMs = Date.now() - startedAt;

      if (error instanceof CrawlError) {
        crawlerLogger.error("WebsiteCrawlerService.crawl error", {
          companyId: parsedInput.data.companyId,
          domain: parsedInput.data.normalizedDomain,
          code: error.code,
          durationMs,
        });

        return err(WebsiteCrawlerError.fromCrawlError(error));
      }

      crawlerLogger.error("WebsiteCrawlerService.crawl unexpected error", {
        companyId: parsedInput.data.companyId,
        domain: parsedInput.data.normalizedDomain,
        durationMs,
        message: error instanceof Error ? error.message : "Unknown error",
      });

      return err(
        new WebsiteCrawlerError(
          "BROWSER_ERROR",
          error instanceof Error ? error.message : "Unexpected crawler failure",
          error,
        ),
      );
    }
  }

  private async crawlWithRetry(input: CrawlCompanyInput): Promise<CrawlCompanyResult> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      try {
        const result = await this.adapter.crawlCompany(input);

        if (result.status !== "failed") {
          return result;
        }

        lastError = new CrawlError("CRAWL_FAILED", "All crawl paths failed");
      } catch (error) {
        lastError = error;

        if (error instanceof CrawlError && !isRetryableCrawlError(error)) {
          throw error;
        }
      }

      if (attempt < this.maxAttempts) {
        await sleep(this.initialDelayMs * attempt);
      }
    }

    throw lastError instanceof Error ? lastError : new CrawlError("CRAWL_FAILED", "Crawl failed");
  }
}

function isRetryableCrawlError(error: CrawlError): boolean {
  return (
    error.code === "CRAWL_TIMEOUT" ||
    error.code === "BROWSER_ERROR" ||
    error.code === "CRAWL_FAILED"
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let cachedService: WebsiteCrawlerService | undefined;
let cachedPool: PlaywrightBrowserPool | undefined;

export function createWebsiteCrawlerService(
  config: CrawlerConfig = getCrawlerConfig(),
): WebsiteCrawlerService {
  const pool = createPlaywrightBrowserPool(config);
  cachedPool = pool;

  const adapter = createPlaywrightCrawlerAdapter({
    pool,
    pageCrawler: createPlaywrightPageCrawler(config),
    robotsTxt: createRobotsTxtService(httpClient),
    config,
  });

  return new WebsiteCrawlerService(adapter);
}

export function getWebsiteCrawlerService(): WebsiteCrawlerService {
  if (!cachedService) {
    cachedService = createWebsiteCrawlerService();
  }

  return cachedService;
}

export async function shutdownWebsiteCrawler(): Promise<void> {
  if (cachedPool) {
    await cachedPool.shutdown();
    cachedPool = undefined;
  }

  cachedService = undefined;
}

export function resetWebsiteCrawlerServiceCache(): void {
  cachedService = undefined;
  cachedPool = undefined;
}

export function mapWebsiteCrawlerError(error: WebsiteCrawlerError): {
  status: number;
  message: string;
  code: WebsiteCrawlerError["code"];
} {
  switch (error.code) {
    case "INVALID_INPUT":
    case "SSRF_BLOCKED":
    case "ROBOTS_DISALLOWED":
      return { status: 400, message: error.message, code: error.code };
    case "CRAWL_TIMEOUT":
    case "BROWSER_ERROR":
    case "CRAWL_FAILED":
      return { status: 503, message: error.message, code: error.code };
    default:
      return {
        status: 500,
        message: "Unexpected crawler failure",
        code: error.code,
      };
  }
}

export type { BrowserPoolPort, PageCrawlerPort };
