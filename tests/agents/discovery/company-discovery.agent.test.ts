import { describe, expect, it, vi } from "vitest";
import { CompanyDiscoveryAgent } from "@/agents/discovery/company-discovery.agent.js";
import type { OpenAIClientPort } from "@/lib/config/openai.client.js";

function createOpenAiMock(
  createWebDiscoveryCompletion: ReturnType<typeof vi.fn>,
): OpenAIClientPort {
  return {
    createStructuredCompletion: vi.fn(),
    createWebDiscoveryCompletion,
  };
}

describe("CompanyDiscoveryAgent", () => {
  it("returns discovered companies from OpenAI web search", async () => {
    const createWebDiscoveryCompletion = vi.fn().mockResolvedValue(
      JSON.stringify({
        companies: [
          {
            companyName: "Acme Logistics",
            website: "https://www.acme.fi",
          },
        ],
      }),
    );

    const agent = new CompanyDiscoveryAgent(createOpenAiMock(createWebDiscoveryCompletion), {
      model: "gpt-4o-mini",
    });

    const result = await agent.execute({
      query: "logistics companies in Finland",
      industry: "logistics",
      location: "Finland",
      limit: 5,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual([
        {
          companyName: "Acme Logistics",
          website: "https://acme.fi",
        },
      ]);
    }

    expect(createWebDiscoveryCompletion).toHaveBeenCalledOnce();
    expect(createWebDiscoveryCompletion.mock.calls[0]?.[0].schemaName).toBe(
      "discovered_companies",
    );
  });

  it("supports location-only queries without industry", async () => {
    const createWebDiscoveryCompletion = vi.fn().mockResolvedValue(
      JSON.stringify({
        companies: [
          {
            companyName: "Berlin Startup GmbH",
            website: "https://berlin-startup.de",
          },
        ],
      }),
    );

    const agent = new CompanyDiscoveryAgent(createOpenAiMock(createWebDiscoveryCompletion), {
      model: "gpt-4o-mini",
    });

    const result = await agent.execute({
      query: "companies in Berlin",
      location: "Berlin",
      limit: 10,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value[0]?.companyName).toBe("Berlin Startup GmbH");
    }
  });

  it("deduplicates companies by domain and respects limit", async () => {
    const createWebDiscoveryCompletion = vi.fn().mockResolvedValue(
      JSON.stringify({
        companies: [
          {
            companyName: "Acme Logistics",
            website: "https://www.acme.fi/about",
          },
          {
            companyName: "Acme Logistics Oy",
            website: "https://acme.fi",
          },
          {
            companyName: "Other Logistics",
            website: "https://other.fi",
          },
        ],
      }),
    );

    const agent = new CompanyDiscoveryAgent(createOpenAiMock(createWebDiscoveryCompletion), {
      model: "gpt-4o-mini",
    });

    const result = await agent.execute({
      query: "logistics companies in Finland",
      limit: 1,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(1);
    }
  });

  it("returns discovery failed when OpenAI throws", async () => {
    const createWebDiscoveryCompletion = vi
      .fn()
      .mockRejectedValue(new Error("rate limit exceeded"));

    const agent = new CompanyDiscoveryAgent(createOpenAiMock(createWebDiscoveryCompletion), {
      model: "gpt-4o-mini",
      maxAttempts: 1,
    });

    const result = await agent.execute({
      query: "companies in Houston",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("DISCOVERY_FAILED");
    }
  });

  it("returns invalid input for empty query", async () => {
    const createWebDiscoveryCompletion = vi.fn();

    const agent = new CompanyDiscoveryAgent(createOpenAiMock(createWebDiscoveryCompletion), {
      model: "gpt-4o-mini",
    });

    const result = await agent.execute({
      query: "  ",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_INPUT");
    }

    expect(createWebDiscoveryCompletion).not.toHaveBeenCalled();
  });

  it("retries when OpenAI returns invalid JSON", async () => {
    const createWebDiscoveryCompletion = vi
      .fn()
      .mockResolvedValueOnce("not-json")
      .mockResolvedValueOnce(
        JSON.stringify({
          companies: [
            {
              companyName: "Retry Logistics",
              website: "https://retry.fi",
            },
          ],
        }),
      );

    const agent = new CompanyDiscoveryAgent(createOpenAiMock(createWebDiscoveryCompletion), {
      model: "gpt-4o-mini",
      maxAttempts: 2,
    });

    const result = await agent.execute({
      query: "logistics companies in Finland",
    });

    expect(result.ok).toBe(true);
    expect(createWebDiscoveryCompletion).toHaveBeenCalledTimes(2);
  });
});
