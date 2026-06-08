import { describe, expect, it } from "vitest";
import { CrawlPathResolverService } from "@/services/domain/crawler/crawl-path-resolver.service.js";
import { CRAWL_PATHS } from "@/types/crawler/crawler.types.js";
import { CrawlError } from "@/types/crawler/crawler-error.types.js";

describe("CrawlPathResolverService", () => {
  const resolver = new CrawlPathResolverService();

  it("resolves fixed crawl paths against base website", () => {
    const targets = resolver.resolve("https://www.acme.fi", "acme.fi");

    expect(targets.map((target) => target.path)).toEqual([...CRAWL_PATHS]);
    expect(targets[0]?.url).toBe("https://acme.fi/");
    expect(targets[1]?.url).toBe("https://acme.fi/about");
    expect(targets[4]?.url).toBe("https://acme.fi/careers");
  });

  it("blocks mismatched domain hosts", () => {
    expect(() =>
      resolver.resolve("https://evil.com", "acme.fi"),
    ).toThrow(CrawlError);

    try {
      resolver.resolve("https://evil.com", "acme.fi");
    } catch (error) {
      expect(error).toBeInstanceOf(CrawlError);
      expect((error as CrawlError).code).toBe("SSRF_BLOCKED");
    }
  });

  it("blocks localhost targets", () => {
    expect(() =>
      resolver.resolve("http://localhost:3000", "localhost"),
    ).toThrow(CrawlError);

    try {
      resolver.resolve("http://localhost:3000", "localhost");
    } catch (error) {
      expect(error).toBeInstanceOf(CrawlError);
      expect((error as CrawlError).code).toBe("SSRF_BLOCKED");
    }
  });

  it("blocks cloud metadata IP addresses", () => {
    expect(() =>
      resolver.resolve("http://169.254.169.254", "169.254.169.254"),
    ).toThrow(CrawlError);
  });
});
