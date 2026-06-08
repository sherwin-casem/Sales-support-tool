import { describe, expect, it } from "vitest";
import {
  DomainNormalizerService,
  domainBlocklistService,
  normalizeDomain,
} from "@/services/domain/company/domain-normalizer.service.js";

describe("normalizeDomain", () => {
  it("normalizes website URLs to domain", () => {
    expect(normalizeDomain("https://www.Acme.fi/about")).toBe("acme.fi");
  });

  it("returns null for invalid input", () => {
    expect(normalizeDomain("not-a-domain")).toBeNull();
  });
});

describe("DomainNormalizerService", () => {
  it("returns normalized website and domain", () => {
    const service = new DomainNormalizerService();
    const result = service.normalizeWebsite("http://www.example.com/path");

    expect(result).toEqual({
      domain: "example.com",
      website: "http://example.com/path",
    });
  });
});

describe("domainBlocklistService", () => {
  it("blocks linkedin domains", () => {
    expect(domainBlocklistService.isBlocked("linkedin.com")).toBe(true);
    expect(domainBlocklistService.isBlocked("fi.linkedin.com")).toBe(true);
  });

  it("allows company domains", () => {
    expect(domainBlocklistService.isBlocked("acme.fi")).toBe(false);
  });
});
