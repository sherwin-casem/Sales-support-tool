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
      industry: "logistics",
      location: "Finland",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
    }
  });

  it("retries when all sources fail", async () => {
    const execute = vi
      .fn()
      .mockResolvedValueOnce(
        err(new DiscoveryError("ALL_SOURCES_FAILED", "all sources failed")),
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
      industry: "logistics",
      location: "Finland",
    });

    expect(result.ok).toBe(true);
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it("maps discovery errors", async () => {
    const execute = vi.fn().mockResolvedValue(
      err(new DiscoveryError("INVALID_INPUT", "invalid")),
    );

    const agent = { execute } as unknown as CompanyDiscoveryAgent;
    const service = new CompanyDiscoveryService(agent, { maxAttempts: 1 });

    const result = await service.discover({
      industry: " ",
      location: "Finland",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(mapCompanyDiscoveryError(result.error).status).toBe(400);
    }
  });
});

describe("mapCompanyDiscoveryError", () => {
  it("maps all sources failed to 503", () => {
    const mapped = mapCompanyDiscoveryError(
      CompanyDiscoveryError.fromDiscoveryError(
        new DiscoveryError("ALL_SOURCES_FAILED", "failed"),
      ),
    );

    expect(mapped.status).toBe(503);
  });
});
