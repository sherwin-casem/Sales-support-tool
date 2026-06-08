import type { CrawlerConfig } from "@/lib/config/crawler.config.js";
import { assertSafeHttpUrl } from "@/lib/security/url-safety.js";
import { isRetryableHttpStatus } from "@/lib/utils/retry.js";
import { withRetry } from "@/lib/utils/retry.js";
import { htmlSanitizerService } from "@/services/domain/crawler/html-sanitizer.service.js";
import type {
  CrawlPagePort,
  PageCrawlOutcome,
  PageCrawlerPort,
  PageCrawlSuccess,
} from "@/services/infrastructure/crawler/browser-pool.port.js";
import type { CrawlPath } from "@/types/crawler/crawler.types.js";

const NON_RETRYABLE_STATUSES = new Set([401, 404, 410]);

export class PlaywrightPageCrawler implements PageCrawlerPort {
  constructor(private readonly config: CrawlerConfig) {}

  async crawlPage(
    page: CrawlPagePort,
    path: CrawlPath,
    url: string,
  ): Promise<PageCrawlOutcome> {
    try {
      const pageResult = await withRetry(
        async () => {
          const outcome = await this.fetchPage(page, path, url);

          if (!outcome.success) {
            if (outcome.retryable) {
              throw new Error(outcome.error ?? "Retryable page crawl failure");
            }

            return outcome;
          }

          return outcome;
        },
        {
          maxAttempts: this.config.CRAWLER_PAGE_MAX_ATTEMPTS,
          initialDelayMs: 1000,
          shouldRetry: (error) => isRetryableCrawlError(error),
        },
      );

      return pageResult;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Page crawl failed",
        retryable: isRetryableCrawlError(error),
      };
    }
  }

  private async fetchPage(
    page: CrawlPagePort,
    path: CrawlPath,
    url: string,
  ): Promise<PageCrawlOutcome> {
    const expectedDomain = new URL(url).hostname.replace(/^www\./, "");
    const { status, finalUrl } = await page.goto(url);

    try {
      assertSafeHttpUrl(finalUrl, { allowedDomain: expectedDomain });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Redirect blocked by SSRF policy",
        retryable: false,
      };
    }

    if (status !== null && NON_RETRYABLE_STATUSES.has(status)) {
      return {
        success: false,
        error: `HTTP ${status}`,
        retryable: false,
      };
    }

    if (status !== null && status >= 400) {
      return {
        success: false,
        error: `HTTP ${status}`,
        retryable: isRetryableHttpStatus(status),
      };
    }

    const title = await page.title();
    const { html, text } = await page.content();
    const sanitized = htmlSanitizerService.sanitize(html, title, text);

    const pageResult: PageCrawlSuccess = {
      path,
      url: finalUrl,
      httpStatus: status,
      title: sanitized.title,
      contentText: sanitized.contentText,
      html: sanitized.html,
    };

    return {
      success: true,
      page: pageResult,
    };
  }
}

function isRetryableCrawlError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return true;
  }

  const message = error.message.toLowerCase();

  if (message.includes("timeout")) {
    return true;
  }

  if (message.includes("net::err_")) {
    return true;
  }

  if (message.includes("http 429") || message.includes("http 503")) {
    return true;
  }

  return false;
}

export function createPlaywrightPageCrawler(config: CrawlerConfig): PlaywrightPageCrawler {
  return new PlaywrightPageCrawler(config);
}
