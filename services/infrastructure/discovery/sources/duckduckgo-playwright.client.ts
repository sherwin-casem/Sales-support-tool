import { chromium, type Browser, type BrowserContext } from "playwright";
import type { DiscoveryConfig } from "@/lib/config/discovery.config.js";
import { isDuckDuckGoBlockedPage } from "@/services/infrastructure/discovery/sources/duckduckgo-html.parser.js";

const DUCKDUCKGO_HTML_ENDPOINT = "https://html.duckduckgo.com/html/";

export interface DuckDuckGoPlaywrightClient {
  search(query: string): Promise<string>;
}

export class PlaywrightDuckDuckGoClient implements DuckDuckGoPlaywrightClient {
  constructor(private readonly config: DiscoveryConfig) {}

  async search(query: string): Promise<string> {
    let browser: Browser | undefined;
    let context: BrowserContext | undefined;

    try {
      browser = await chromium.launch({ headless: true });
      context = await browser.newContext({
        userAgent: this.config.DISCOVERY_DDG_USER_AGENT,
        viewport: { width: 1280, height: 720 },
        locale: "en-US",
      });

      const html = await searchViaPlaywrightRequest(context, query, this.config);

      await context.close();
      return html;
    } finally {
      await context?.close().catch(() => undefined);
      await browser?.close().catch(() => undefined);
    }
  }
}

async function searchViaPlaywrightRequest(
  context: BrowserContext,
  query: string,
  config: DiscoveryConfig,
): Promise<string> {
  const headers = buildPlaywrightHeaders(config);
  const timeout = config.DISCOVERY_DDG_TIMEOUT_MS;

  const postResponse = await context.request.post(DUCKDUCKGO_HTML_ENDPOINT, {
    form: {
      q: query,
      b: "",
      kl: "",
    },
    headers,
    timeout,
  });

  if (!postResponse.ok()) {
    throw new Error(`DuckDuckGo Playwright POST failed with status ${postResponse.status()}`);
  }

  let html = await postResponse.text();

  if (!isDuckDuckGoBlockedPage(html)) {
    return html;
  }

  const getResponse = await context.request.get(
    `${DUCKDUCKGO_HTML_ENDPOINT}?q=${encodeURIComponent(query)}`,
    {
      headers,
      timeout,
    },
  );

  if (!getResponse.ok()) {
    throw new Error(`DuckDuckGo Playwright GET failed with status ${getResponse.status()}`);
  }

  html = await getResponse.text();
  return html;
}

function buildPlaywrightHeaders(config: DiscoveryConfig): Record<string, string> {
  return {
    "User-Agent": config.DISCOVERY_DDG_USER_AGENT,
    Accept: "text/html,application/xhtml+xml",
    "Accept-Language": "en-US,en;q=0.9",
    Referer: DUCKDUCKGO_HTML_ENDPOINT,
  };
}

export function createPlaywrightDuckDuckGoClient(
  config: DiscoveryConfig,
): DuckDuckGoPlaywrightClient {
  return new PlaywrightDuckDuckGoClient(config);
}
