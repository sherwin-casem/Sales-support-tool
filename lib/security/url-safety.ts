import { CrawlError } from "@/types/crawler/crawler-error.types.js";

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "metadata.google.internal",
]);

const PRIVATE_IPV4_PATTERN =
  /^(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|127\.\d{1,3}\.\d{1,3}\.\d{1,3}|169\.254\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|0\.\d{1,3}\.\d{1,3}\.\d{1,3})$/;

const BLOCKED_SCHEMES = new Set(["file:", "ftp:", "data:", "javascript:", "blob:"]);

export function assertSafeHttpUrl(
  rawUrl: string,
  options: { allowedDomain?: string } = {},
): URL {
  let parsed: URL;

  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new CrawlError("SSRF_BLOCKED", `Invalid URL: ${rawUrl}`);
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new CrawlError("SSRF_BLOCKED", `Blocked URL scheme: ${parsed.protocol}`);
  }

  if (BLOCKED_SCHEMES.has(parsed.protocol)) {
    throw new CrawlError("SSRF_BLOCKED", `Blocked URL scheme: ${parsed.protocol}`);
  }

  assertAllowedHostname(parsed.hostname, options.allowedDomain);

  return parsed;
}

export function assertAllowedHostname(
  hostname: string,
  allowedDomain?: string,
): void {
  const host = hostname.toLowerCase().replace(/^www\./, "");

  if (BLOCKED_HOSTNAMES.has(host) || PRIVATE_IPV4_PATTERN.test(host)) {
    throw new CrawlError("SSRF_BLOCKED", `Blocked host: ${hostname}`);
  }

  if (host.endsWith(".local") || host.endsWith(".internal")) {
    throw new CrawlError("SSRF_BLOCKED", `Blocked host: ${hostname}`);
  }

  if (allowedDomain) {
    const normalizedDomain = allowedDomain.toLowerCase().replace(/^www\./, "");

    if (host !== normalizedDomain && !host.endsWith(`.${normalizedDomain}`)) {
      throw new CrawlError(
        "SSRF_BLOCKED",
        `URL host ${hostname} does not match domain ${allowedDomain}`,
      );
    }
  }
}

export function isBlockedRequestUrl(rawUrl: string): boolean {
  try {
    assertSafeHttpUrl(rawUrl);
    return false;
  } catch {
    return true;
  }
}
