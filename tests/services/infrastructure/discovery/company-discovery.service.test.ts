import { describe, expect, it, vi } from "vitest";
import { CompanyDiscoveryAgent } from "@/agents/discovery/company-discovery.agent.js";
import {
  CompanyDiscoveryService,
  mapCompanyDiscoveryError,
} from "@/services/infrastructure/discovery/company-discovery.service.js";
import {
  CompanyDiscoveryError,
  DiscoveryError,
} from "@/types/agents/discovery-error.types.js";
import { err, ok } from "@/lib/utils/result.js";

describe("CompanyDiscoveryService", () => {
  it("returns discovered companies from agent", async () => {
    const execute = vi.fn().mockResolvedValue(
      ok([
        {
          companyName: "Acme Logistics",
          website: "https://www.acme.fi",
        },
      ]),
    );

    const agent = { execute } as unknown as CompanyDiscoveryAgent;
    const service = new CompanyDiscoveryService(agent, { maxAttempts: 1 });

    const result = await service.discover({
      query: "logistics companies in Finland",
      industry: "logistics",
      location: "Finland",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
    }
  });

  it("retries when discovery fails transiently", async () => {
    const execute = vi
      .fn()
      .mockResolvedValueOnce(
        err(new DiscoveryError("DISCOVERY_FAILED", "web search failed")),
      )
      .mockResolvedValueOnce(
        ok([
          {
            companyName: "Retry Logistics",
            website: "https://retry.fi",
          },
        ]),
      );

    const agent = { execute } as unknown as CompanyDiscoveryAgent;
    const service = new CompanyDiscoveryService(agent, {
      maxAttempts: 2,
      initialDelayMs: 1,
    });

    const result = await service.discover({
      query: "companies in Finland",
      limit: 10,
    });

    expect(result.ok).toBe(true);
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it("runs multiple discovery rounds when no limit is set", async () => {
    const execute = vi
      .fn()
      .mockResolvedValueOnce(
        ok([
          {
            companyName: "Acme Logistics",
            website: "https://acme.fi",
          },
        ]),
      )
      .mockResolvedValueOnce(
        ok([
          {
            companyName: "Other Logistics",
            website: "https://other.fi",
          },
        ]),
      )
      .mockResolvedValueOnce(ok([]));

    const agent = { execute } as unknown as CompanyDiscoveryAgent;
    const service = new CompanyDiscoveryService(agent, {
      maxAttempts: 1,
      unlimitedMaxRounds: 3,
    });

    const result = await service.discover({
      query: "logistics companies in Finland",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(2);
    }

    expect(execute).toHaveBeenCalledTimes(3);
    expect(execute.mock.calls[1]?.[0].excludedWebsites).toEqual(["https://acme.fi"]);
  });

  it("maps discovery errors", async () => {
    const execute = vi.fn().mockResolvedValue(
      err(new DiscoveryError("INVALID_INPUT", "invalid")),
    );

    const agent = { execute } as unknown as CompanyDiscoveryAgent;
    const service = new CompanyDiscoveryService(agent, { maxAttempts: 1 });

    const result = await service.discover({
      query: " ",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(mapCompanyDiscoveryError(result.error).status).toBe(400);
    }
  });
});

describe("mapCompanyDiscoveryError", () => {
  it("maps discovery failed to 503", () => {
    const mapped = mapCompanyDiscoveryError(
      CompanyDiscoveryError.fromDiscoveryError(
        new DiscoveryError("DISCOVERY_FAILED", "failed"),
      ),
    );

    expect(mapped.status).toBe(503);
  });
});
