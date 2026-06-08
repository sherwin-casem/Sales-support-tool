import type { CrawlerConfig } from "@/lib/config/crawler.config.js";
import { crawlerLogger } from "@/lib/logging/logger.js";
import { CrawlCompanyResultSchema } from "@/lib/validations/crawler.schema.js";
import { crawlPathResolverService } from "@/services/domain/crawler/crawl-path-resolver.service.js";
import { DomainRateLimiterService } from "@/services/domain/crawler/domain-rate-limiter.service.js";
import { RobotsTxtService } from "@/services/domain/crawler/robots-txt.service.js";
import type {
  BrowserPoolPort,
  PageCrawlerPort,
} from "@/services/infrastructure/crawler/browser-pool.port.js";
import { CrawlError } from "@/types/crawler/crawler-error.types.js";
import type {
  CrawlCompanyInput,
  CrawlCompanyResult,
  CrawlCompanyStatus,
  CrawledPage,
} from "@/types/crawler/crawler.types.js";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class PlaywrightCrawlerAdapter {
  private readonly rateLimiter: DomainRateLimiterService;

  constructor(
    private readonly pool: BrowserPoolPort,
    private readonly pageCrawler: PageCrawlerPort,
    private readonly robotsTxt: RobotsTxtService,
    private readonly config: CrawlerConfig,
    rateLimiter?: DomainRateLimiterService,
  ) {
    this.rateLimiter =
      rateLimiter ??
      new DomainRateLimiterService(
        config.CRAWLER_DOMAIN_DELAY_MS,
        config.CRAWLER_GLOBAL_CONCURRENCY,
      );
  }

  async crawlCompany(input: CrawlCompanyInput): Promise<CrawlCompanyResult> {
    const startedAt = Date.now();
    const targets = crawlPathResolverService.resolve(
      input.website,
      input.normalizedDomain,
    );
    const baseUrl = new URL(targets[0]?.url ?? input.website).origin;

    const pages = await this.runWithCompanyTimeout(
      () => this.crawlAllPages(input, baseUrl, targets),
      this.config.CRAWLER_COMPANY_TIMEOUT_MS,
    );

    const result = buildCrawlCompanyResult({
      input,
      baseUrl,
      pages,
      startedAt,
    });

    const validated = CrawlCompanyResultSchema.safeParse(result);

    if (!validated.success) {
      throw new CrawlError(
        "CRAWL_FAILED",
        validated.error.issues.map((issue) => issue.message).join("; "),
        validated.error,
      );
    }

    return validated.data;
  }

  private async crawlAllPages(
    input: CrawlCompanyInput,
    baseUrl: string,
    targets: ReturnType<typeof crawlPathResolverService.resolve>,
  ): Promise<CrawledPage[]> {
    const pages: CrawledPage[] = [];

    for (const target of targets) {
      if (this.config.CRAWLER_RESPECT_ROBOTS) {
        const allowed = await this.robotsTxt.isAllowed(baseUrl, target.path);

        if (!allowed) {
          pages.push(createFailedPage(target.path, target.url, "Blocked by robots.txt"));
          continue;
        }
      }

      const pageResult = await this.rateLimiter.runExclusive(
        input.normalizedDomain,
        async () => this.crawlSinglePage(target.path, target.url),
      );

      pages.push(pageResult);

      if (this.config.CRAWLER_INTER_PAGE_DELAY_MS > 0) {
        await sleep(this.config.CRAWLER_INTER_PAGE_DELAY_MS);
      }
    }

    return pages;
  }

  private async crawlSinglePage(
    path: CrawledPage["path"],
    url: string,
  ): Promise<CrawledPage> {
    const crawledAt = new Date().toISOString();

    try {
      return await this.pool.withContext(async (context) => {
        const page = await context.newPage();

        try {
          const outcome = await this.pageCrawler.crawlPage(page, path, url);

          if (!outcome.success || !outcome.page) {
            return createFailedPage(path, url, outcome.error ?? "Unknown crawl error", crawledAt);
          }

          return {
            path,
            url,
            httpStatus: outcome.page.httpStatus,
            title: outcome.page.title,
            contentText: outcome.page.contentText,
            html: outcome.page.html,
            crawledAt,
          };
        } finally {
          await page.close();
        }
      });
    } catch (error) {
      crawlerLogger.warn("PlaywrightCrawlerAdapter page crawl failed", {
        path,
        url,
        message: error instanceof Error ? error.message : "Unknown error",
      });

      return createFailedPage(
        path,
        url,
        error instanceof Error ? error.message : "Browser error",
        crawledAt,
      );
    }
  }

  private async runWithCompanyTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
  ): Promise<T> {
    let timeoutId: NodeJS.Timeout | undefined;

    const timeoutPromise = new Promise<T>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new CrawlError("CRAWL_TIMEOUT", `Company crawl exceeded ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      return await Promise.race([operation(), timeoutPromise]);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }
}

function createFailedPage(
  path: CrawledPage["path"],
  url: string,
  error: string,
  crawledAt = new Date().toISOString(),
): CrawledPage {
  return {
    path,
    url,
    httpStatus: null,
    title: null,
    contentText: "",
    html: "",
    crawledAt,
    error,
  };
}

function buildCrawlCompanyResult(params: {
  input: CrawlCompanyInput;
  baseUrl: string;
  pages: CrawledPage[];
  startedAt: number;
}): CrawlCompanyResult {
  const pagesSucceeded = params.pages.filter(isSuccessfulPage).length;

  return {
    companyId: params.input.companyId,
    domain: params.input.normalizedDomain,
    baseUrl: params.baseUrl,
    pages: params.pages,
    status: determineStatus(params.pages),
    pagesSucceeded,
    pagesAttempted: params.pages.length,
    durationMs: Date.now() - params.startedAt,
  };
}

function isSuccessfulPage(page: CrawledPage): boolean {
  return !page.error && page.contentText.length > 0;
}

function determineStatus(pages: CrawledPage[]): CrawlCompanyStatus {
  const succeeded = pages.filter(isSuccessfulPage);

  if (succeeded.length === 0) {
    return "failed";
  }

  const allSucceeded = succeeded.length === pages.length;
  return allSucceeded ? "success" : "partial";
}

export function createPlaywrightCrawlerAdapter(deps: {
  pool: BrowserPoolPort;
  pageCrawler: PageCrawlerPort;
  robotsTxt: RobotsTxtService;
  config: CrawlerConfig;
  rateLimiter?: DomainRateLimiterService;
}): PlaywrightCrawlerAdapter {
  return new PlaywrightCrawlerAdapter(
    deps.pool,
    deps.pageCrawler,
    deps.robotsTxt,
    deps.config,
    deps.rateLimiter,
  );
}
