import { describe, expect, it, vi } from "vitest";
import type { HttpClient } from "@/lib/http/http-client.js";
import {
  buildSparqlQuery,
  WikidataDiscoverySource,
} from "@/services/infrastructure/discovery/sources/wikidata.source.js";

const payload = {
  results: {
    bindings: [
      {
        companyLabel: { value: "Acme Logistics Oy" },
        website: { value: "https://www.acme.fi" },
      },
    ],
  },
};

describe("WikidataDiscoverySource", () => {
  it("maps Wikidata SPARQL bindings to candidates", async () => {
    const http: HttpClient = {
      get: vi.fn(),
      post: vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(payload),
      }),
    };

    const source = new WikidataDiscoverySource(http);
    const results = await source.discover({
      industry: "logistics",
      location: "Finland",
      locationContext: {
        location: "Finland",
        countryQid: "Q33",
      },
      limit: 10,
    });

    expect(results).toEqual([
      {
        companyName: "Acme Logistics Oy",
        website: "https://www.acme.fi",
        source: "wikidata",
        confidence: 0.85,
      },
    ]);
    expect(http.post).toHaveBeenCalledOnce();
  });

  it("falls back to GET when POST returns 405", async () => {
    const http: HttpClient = {
      post: vi.fn().mockResolvedValue({
        ok: false,
        status: 405,
        text: async () => "Method Not Allowed",
      }),
      get: vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(payload),
      }),
    };

    const source = new WikidataDiscoverySource(http);
    const results = await source.discover({
      industry: "logistics",
      location: "Finland",
      locationContext: {
        location: "Finland",
        countryQid: "Q33",
      },
      limit: 10,
    });

    expect(results).toHaveLength(1);
    expect(http.post).toHaveBeenCalledOnce();
    expect(http.get).toHaveBeenCalledOnce();
  });

  it("returns empty list when country is not mapped", async () => {
    const http: HttpClient = {
      get: vi.fn(),
      post: vi.fn(),
    };

    const source = new WikidataDiscoverySource(http);
    const results = await source.discover({
      industry: "logistics",
      location: "Narnia",
      locationContext: { location: "Narnia" },
      limit: 10,
    });

    expect(results).toEqual([]);
    expect(http.post).not.toHaveBeenCalled();
  });

  it("builds fintech query with expanded industry terms", () => {
    const query = buildSparqlQuery("fintech", "Q30", 10);

    expect(query).toContain("fintech");
    expect(query).toContain("financial");
    expect(query).toContain("payments");
    expect(query).toContain("wd:Q30");
  });

  it("omits industry filter for generic industry searches", () => {
    const query = buildSparqlQuery("unknown", "Q30", 10);

    expect(query).not.toContain("industryLabel");
    expect(query).toContain("wd:Q30");
  });
});
