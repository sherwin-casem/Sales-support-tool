import { assertAllowedHostname } from "@/lib/security/url-safety.js";
import { normalizeWebsiteUrl } from "@/services/domain/company/domain-normalizer.service.js";
import { CrawlError } from "@/types/crawler/crawler-error.types.js";
import {
  ALL_CRAWL_PATHS,
  CRAWL_PATHS,
  type CrawlPath,
  type ResolvedCrawlTarget,
} from "@/types/crawler/crawler.types.js";

export class CrawlPathResolverService {
  resolve(
    baseWebsite: string,
    normalizedDomain: string,
    paths: readonly CrawlPath[] = CRAWL_PATHS,
  ): ResolvedCrawlTarget[] {
    const baseUrl = normalizeWebsiteUrl(baseWebsite);

    if (!baseUrl) {
      throw new CrawlError("INVALID_INPUT", "website must be a valid http(s) URL");
    }

    const base = new URL(baseUrl);
    assertAllowedHostname(base.hostname, normalizedDomain);

    return paths.map((path) => {
      const resolved = new URL(path, `${base.origin}/`);
      resolved.hash = "";
      resolved.search = "";

      const url =
        path === "/"
          ? `${base.origin}/`
          : resolved.toString().replace(/\/$/, "");

      return { path, url };
    });
  }
}

export const crawlPathResolverService = new CrawlPathResolverService();

export function isCrawlPath(value: string): value is CrawlPath {
  return (ALL_CRAWL_PATHS as readonly string[]).includes(value);
}
