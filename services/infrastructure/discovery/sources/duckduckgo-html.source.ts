import type { HttpClient } from "@/lib/http/http-client.js";
import {
  getDiscoveryConfig,
  type DiscoveryConfig,
} from "@/lib/config/discovery.config.js";
import { aiLogger } from "@/lib/logging/logger.js";
import { withRetry } from "@/lib/utils/retry.js";
import { buildDiscoveryLocationPhrase } from "@/services/domain/discovery/location-resolver.service.js";
import {
  expandIndustrySearchTerms,
  isGenericIndustry,
} from "@/services/domain/discovery/industry-terms.service.js";
import type {
  DiscoveryCriteria,
  RawDiscoveryCandidate,
} from "@/types/agents/company-discovery.types.js";
import {
  DiscoverySourceError,
  type DiscoverySource,
} from "@/services/infrastructure/discovery/sources/discovery-source.interface.js";
import {
  isDuckDuckGoBlockedPage,
  parseDuckDuckGoHtml,
} from "@/services/infrastructure/discovery/sources/duckduckgo-html.parser.js";
import {
  createPlaywrightDuckDuckGoClient,
  type DuckDuckGoPlaywrightClient,
} from "@/services/infrastructure/discovery/sources/duckduckgo-playwright.client.js";

const DUCKDUCKGO_HTML_ENDPOINT = "https://html.duckduckgo.com/html/";

export type DuckDuckGoTransport = "http" | "playwright";

export interface DuckDuckGoHtmlDiscoverySourceOptions {
  config?: DiscoveryConfig;
  playwrightClient?: DuckDuckGoPlaywrightClient;
}

export class DuckDuckGoHtmlDiscoverySource implements DiscoverySource {
  readonly name = "duckduckgo_html";
  readonly tier = 1 as const;

  private readonly config: DiscoveryConfig;
  private readonly playwrightClient: DuckDuckGoPlaywrightClient;

  constructor(
    private readonly http: HttpClient,
    options: DuckDuckGoHtmlDiscoverySourceOptions = {},
  ) {
    this.config = options.config ?? getDiscoveryConfig();
    this.playwrightClient =
      options.playwrightClient ?? createPlaywrightDuckDuckGoClient(this.config);
  }

  async discover(criteria: DiscoveryCriteria): Promise<RawDiscoveryCandidate[]> {
    const queries = [
      buildSearchQuery(criteria),
      buildFallbackSearchQuery(criteria),
    ];

    const seenDomains = new Set<string>();
    const results: RawDiscoveryCandidate[] = [];

    for (const query of queries) {
      const batch = await this.fetchResults(query, criteria, seenDomains);

      for (const candidate of batch) {
        if (results.length >= criteria.limit) {
          break;
        }

        results.push(candidate);
      }

      if (results.length >= criteria.limit) {
        break;
      }
    }

    return results.slice(0, criteria.limit);
  }

  private async fetchResults(
    query: string,
    criteria: DiscoveryCriteria,
    seenDomains: Set<string>,
  ): Promise<RawDiscoveryCandidate[]> {
    const transports = this.resolveTransports();

    for (const transport of transports) {
      const candidates = await this.fetchWithTransport(transport, query, criteria, seenDomains);

      if (candidates.length > 0) {
        return candidates;
      }
    }

    return [];
  }

  private resolveTransports(): DuckDuckGoTransport[] {
    switch (this.config.DISCOVERY_DDG_MODE) {
      case "http":
        return ["http"];
      case "playwright":
        return ["playwright"];
      case "auto":
      default:
        return ["http", "playwright"];
    }
  }

  private async fetchWithTransport(
    transport: DuckDuckGoTransport,
    query: string,
    criteria: DiscoveryCriteria,
    seenDomains: Set<string>,
  ): Promise<RawDiscoveryCandidate[]> {
    try {
      return await withRetry(
        async () => {
          const html =
            transport === "http"
              ? await this.fetchHtmlViaHttp(query)
              : await this.playwrightClient.search(query);

          const blocked = isDuckDuckGoBlockedPage(html);
          const candidates = blocked
            ? []
            : parseDuckDuckGoHtml(html, criteria, seenDomains);

          aiLogger.info("DuckDuckGo discovery query completed", {
            source: this.name,
            transport,
            queryLength: query.length,
            htmlLength: html.length,
            blocked,
            parsedCount: candidates.length,
          });

          if (blocked) {
            throw new DiscoverySourceError(
              this.name,
              "DuckDuckGo blocked the request (captcha/anomaly page)",
            );
          }

          return candidates;
        },
        {
          maxAttempts: transport === "http" ? 2 : 1,
          initialDelayMs: 750,
          shouldRetry: (error) => error instanceof DiscoverySourceError,
        },
      );
    } catch (error) {
      aiLogger.warn("DuckDuckGo discovery transport failed", {
        source: this.name,
        transport,
        queryLength: query.length,
        message: error instanceof Error ? error.message : "DuckDuckGo discovery failed",
      });

      return [];
    }
  }

  private async fetchHtmlViaHttp(query: string): Promise<string> {
    const headers = buildDuckDuckGoHeaders(this.config);
    const body = new URLSearchParams({ q: query, b: "", kl: "" });

    const postResponse = await this.http.post(DUCKDUCKGO_HTML_ENDPOINT, body, { headers });

    if (!postResponse.ok) {
      throw new DiscoverySourceError(
        this.name,
        `DuckDuckGo request failed with status ${postResponse.status}`,
      );
    }

    const postHtml = await postResponse.text();

    if (!isDuckDuckGoBlockedPage(postHtml)) {
      return postHtml;
    }

    const getUrl = `${DUCKDUCKGO_HTML_ENDPOINT}?q=${encodeURIComponent(query)}`;
    const getResponse = await this.http.get(getUrl, { headers });

    if (!getResponse.ok) {
      throw new DiscoverySourceError(
        this.name,
        `DuckDuckGo GET request failed with status ${getResponse.status}`,
      );
    }

    return getResponse.text();
  }
}

export function buildDuckDuckGoHeaders(config: DiscoveryConfig): Record<string, string> {
  return {
    "User-Agent": config.DISCOVERY_DDG_USER_AGENT,
    Accept: "text/html,application/xhtml+xml",
    "Accept-Language": "en-US,en;q=0.9",
    Referer: DUCKDUCKGO_HTML_ENDPOINT,
  };
}

export function buildSearchQuery(criteria: DiscoveryCriteria): string {
  const locationPhrase = buildDiscoveryLocationPhrase(criteria.locationContext);
  const industryTerms = expandIndustrySearchTerms(criteria.industry);
  const industryPhrase = isGenericIndustry(criteria.industry)
    ? "companies"
    : industryTerms.slice(0, 4).join(" ");

  const tldHint = criteria.locationContext.primaryTld
    ? ` site:*${criteria.locationContext.primaryTld}`
    : "";

  return `${industryPhrase} ${locationPhrase} official website${tldHint}`.trim();
}

export function buildFallbackSearchQuery(criteria: DiscoveryCriteria): string {
  const locationPhrase = buildDiscoveryLocationPhrase(criteria.locationContext);

  return `companies ${locationPhrase} corporate website`.trim();
}

export function createDuckDuckGoHtmlDiscoverySource(
  http: HttpClient,
  options?: DuckDuckGoHtmlDiscoverySourceOptions,
): DuckDuckGoHtmlDiscoverySource {
  return new DuckDuckGoHtmlDiscoverySource(http, options);
}
