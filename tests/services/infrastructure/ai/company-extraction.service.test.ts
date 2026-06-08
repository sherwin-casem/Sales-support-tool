import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { CompanyExtractionAgent } from "@/agents/extraction/company-extraction.agent.js";
import {
  CompanyExtractionService,
  mapCompanyExtractionError,
} from "@/services/infrastructure/ai/company-extraction.service.js";
import { CompanyExtractionError } from "@/types/agents/agent-error.types.js";
import { err, ok } from "@/lib/utils/result.js";
import { AgentError } from "@/types/agents/agent-error.types.js";

const fixtureDir = path.dirname(fileURLToPath(import.meta.url));

function loadFixture(name: string): string {
  return readFileSync(path.join(fixtureDir, "../../../fixtures/extraction", name), "utf8");
}

describe("CompanyExtractionService", () => {
  const companyId = "00000000-0000-4000-8000-000000000001";

  it("returns profile with metadata from agent", async () => {
    const execute = vi.fn().mockResolvedValue(
      ok({
        companyName: "Acme Logistics Oy",
        description: "Freight and warehousing provider in Finland.",
        industry: "logistics",
        products: ["Tracking Platform"],
        services: ["Freight forwarding"],
        targetCustomers: ["Manufacturers"],
        estimatedCompanySize: "100-200",
      }),
    );

    const agent = { execute } as unknown as CompanyExtractionAgent;
    const service = new CompanyExtractionService(agent, "gpt-4o", { maxAttempts: 1 });

    const content = loadFixture("acme-llm-ready.txt");
    const result = await service.extract({
      content,
      domain: "acme.fi",
      companyId,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.profile.companyName).toBe("Acme Logistics Oy");
      expect(result.value.meta.modelUsed).toBe("gpt-4o");
      expect(result.value.meta.completeness).toBeGreaterThan(0);
      expect(result.value.meta.contentHash).toHaveLength(64);
    }
  });

  it("retries on validation errors", async () => {
    const execute = vi
      .fn()
      .mockResolvedValueOnce(
        err(new AgentError("VALIDATION_ERROR", "invalid output")),
      )
      .mockResolvedValueOnce(
        ok({
          companyName: "Acme Logistics Oy",
          description: "Freight and warehousing provider in Finland.",
          industry: "logistics",
          products: [],
          services: ["Freight forwarding"],
          targetCustomers: [],
          estimatedCompanySize: "100-200",
        }),
      );

    const agent = { execute } as unknown as CompanyExtractionAgent;
    const service = new CompanyExtractionService(agent, "gpt-4o", {
      maxAttempts: 2,
      initialDelayMs: 1,
    });

    const content = loadFixture("acme-llm-ready.txt");
    const result = await service.extract({
      content,
      domain: "acme.fi",
      companyId,
    });

    expect(result.ok).toBe(true);
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it("maps extraction errors to http status", async () => {
    const execute = vi.fn().mockResolvedValue(
      err(new AgentError("INVALID_INPUT", "content too short")),
    );

    const agent = { execute } as unknown as CompanyExtractionAgent;
    const service = new CompanyExtractionService(agent, "gpt-4o", { maxAttempts: 1 });

    const result = await service.extract({
      content: "x".repeat(120),
      domain: "acme.fi",
      companyId,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(mapCompanyExtractionError(result.error).status).toBe(400);
    }
  });
});

describe("mapCompanyExtractionError", () => {
  it("maps openai errors to 503", () => {
    const mapped = mapCompanyExtractionError(
      new CompanyExtractionError("OPENAI_ERROR", "rate limit"),
    );

    expect(mapped.status).toBe(503);
  });
});
