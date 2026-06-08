import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import type { CrawlerConfig } from "@/lib/config/crawler.config.js";
import { isBlockedRequestUrl } from "@/lib/security/url-safety.js";
import type {
  BrowserContextPort,
  BrowserPoolPort,
  CrawlPagePort,
} from "@/services/infrastructure/crawler/browser-pool.port.js";

class PlaywrightPageAdapter implements CrawlPagePort {
  constructor(
    private readonly page: Page,
    private readonly config: CrawlerConfig,
  ) {
    this.page.setDefaultNavigationTimeout(config.CRAWLER_NAVIGATION_TIMEOUT_MS);
    this.page.setDefaultTimeout(config.CRAWLER_PAGE_ACTION_TIMEOUT_MS);
  }

  async goto(url: string): Promise<{ status: number | null; finalUrl: string }> {
    const response = await this.page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: this.config.CRAWLER_NAVIGATION_TIMEOUT_MS,
    });

    return { status: response?.status() ?? null, finalUrl: this.page.url() };
  }

  async title(): Promise<string> {
    return this.page.title();
  }

  async content(): Promise<{ html: string; text: string }> {
    const html = await this.page.content();
    const text = await this.page.locator("body").innerText();

    return { html, text };
  }

  async close(): Promise<void> {
    await this.page.close();
  }
}

class PlaywrightContextAdapter implements BrowserContextPort {
  constructor(
    private readonly context: BrowserContext,
    private readonly config: CrawlerConfig,
  ) {}

  async newPage(): Promise<CrawlPagePort> {
    const page = await this.context.newPage();
    return new PlaywrightPageAdapter(page, this.config);
  }

  async close(): Promise<void> {
    await this.context.close();
  }
}

export class PlaywrightBrowserPool implements BrowserPoolPort {
  private browser: Browser | undefined;
  private activeContexts = 0;
  private contextWaiters: Array<() => void> = [];

  constructor(private readonly config: CrawlerConfig) {}

  async withContext<T>(
    operation: (context: BrowserContextPort) => Promise<T>,
  ): Promise<T> {
    await this.acquireContextSlot();

    const browser = await this.getBrowser();
    const context = await browser.newContext({
      userAgent: this.config.CRAWLER_USER_AGENT,
    });

    await context.route("**/*", (route) => {
      if (isBlockedRequestUrl(route.request().url())) {
        void route.abort("blockedbyclient");
        return;
      }

      void route.continue();
    });

    try {
      return await operation(new PlaywrightContextAdapter(context, this.config));
    } finally {
      await context.close();
      this.releaseContextSlot();
    }
  }

  async shutdown(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = undefined;
    }
  }

  private async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await chromium.launch({ headless: true });
    }

    return this.browser;
  }

  private async acquireContextSlot(): Promise<void> {
    if (this.activeContexts < this.config.CRAWLER_MAX_CONTEXTS) {
      this.activeContexts += 1;
      return;
    }

    await new Promise<void>((resolve) => {
      this.contextWaiters.push(resolve);
    });

    this.activeContexts += 1;
  }

  private releaseContextSlot(): void {
    this.activeContexts -= 1;
    const next = this.contextWaiters.shift();

    if (next) {
      next();
    }
  }
}

export function createPlaywrightBrowserPool(config: CrawlerConfig): PlaywrightBrowserPool {
  return new PlaywrightBrowserPool(config);
}
