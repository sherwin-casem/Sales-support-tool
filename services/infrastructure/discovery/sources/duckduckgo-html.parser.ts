import { parse } from "node-html-parser";
import {
  isBlockedDiscoveryDomain,
  normalizeDomain,
} from "@/services/domain/company/domain-normalizer.service.js";
import type {
  DiscoveryCriteria,
  RawDiscoveryCandidate,
} from "@/types/agents/company-discovery.types.js";

const BLOCKED_PAGE_PATTERNS = [
  /bots use duckduckgo/i,
  /please complete the following challenge/i,
  /confirm you are not a bot/i,
  /anomaly/i,
  /detected unusual traffic/i,
];

export function isDuckDuckGoBlockedPage(html: string): boolean {
  if (!html.trim()) {
    return true;
  }

  const hasResultLinks = /class="[^"]*result__a[^"]*"/i.test(html);
  const hasLinksSection = html.includes('id="links"') && html.includes('class="result');

  if (hasResultLinks || hasLinksSection) {
    return false;
  }

  if (BLOCKED_PAGE_PATTERNS.some((pattern) => pattern.test(html))) {
    return true;
  }

  const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
  const title = titleMatch?.[1]?.trim().toLowerCase() ?? "";

  return title === "duckduckgo" && !hasResultLinks;
}

export function parseDuckDuckGoHtml(
  html: string,
  criteria: DiscoveryCriteria,
  seenDomains: Set<string>,
): RawDiscoveryCandidate[] {
  const document = parse(html);
  const anchors = [
    ...document.querySelectorAll("#links .result a.result__a"),
    ...document.querySelectorAll("a.result__a"),
  ];

  const uniqueAnchors = [...new Map(anchors.map((anchor) => [anchor, anchor])).keys()];
  const results: RawDiscoveryCandidate[] = [];
  const scanLimit = Math.max(criteria.limit * 12, 24);
  let scanned = 0;

  for (const anchor of uniqueAnchors) {
    if (results.length >= criteria.limit || scanned >= scanLimit) {
      break;
    }

    scanned += 1;

    const href = anchor.getAttribute("href")?.trim() ?? "";
    const title = anchor.text.trim();
    const website = extractTargetUrl(href);
    const domain = website ? normalizeDomain(website) : null;

    if (
      website &&
      title &&
      domain &&
      !isBlockedDiscoveryDomain(domain) &&
      !seenDomains.has(domain)
    ) {
      seenDomains.add(domain);
      results.push({
        companyName: sanitizeResultTitle(title),
        website,
        source: "duckduckgo_html",
        confidence: scoreWebResult(website, criteria),
      });
    }
  }

  return results;
}

export function sanitizeResultTitle(title: string): string {
  return title
    .replace(/\s*[|\-–—]\s*(Home|Official Site|Official Website).*$/i, "")
    .trim();
}

export function extractTargetUrl(href: string): string | null {
  if (!href) {
    return null;
  }

  try {
    const url = new URL(href, "https://duckduckgo.com");

    if (url.hostname.includes("duckduckgo.com")) {
      const redirected = url.searchParams.get("uddg");
      if (redirected) {
        return redirected;
      }

      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

export function scoreWebResult(website: string, criteria: DiscoveryCriteria): number {
  let confidence = 0.55;

  if (criteria.locationContext.primaryTld) {
    try {
      const hostname = new URL(website).hostname.toLowerCase();
      if (hostname.endsWith(criteria.locationContext.primaryTld)) {
        confidence += 0.1;
      }
    } catch {
      return confidence;
    }
  }

  if (criteria.locationContext.city) {
    confidence += 0.05;
  }

  return confidence;
}
