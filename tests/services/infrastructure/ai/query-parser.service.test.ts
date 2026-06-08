import { describe, expect, it, vi } from "vitest";
import { QueryParserAgent } from "@/agents/discovery/query-parser.agent.js";
import {
  QueryParserService,
  mapQueryParserError,
} from "@/services/infrastructure/ai/query-parser.service.js";
import { AgentError, QueryParserError } from "@/types/agents/agent-error.types.js";
import { err, ok } from "@/lib/utils/result.js";

describe("QueryParserService", () => {
  it("returns parsed query from agent", async () => {
    const execute = vi.fn().mockResolvedValue(
      ok({
        industry: "logistics",
        location: "Finland",
        employeeRange: "50-200",
      }),
    );

    const agent = { execute } as unknown as QueryParserAgent;
    const service = new QueryParserService(agent);

    const result = await service.parse(
      "Find logistics companies in Finland with 50-200 employees.",
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.employeeRange).toBe("50-200");
    }
    expect(execute).toHaveBeenCalledWith({
      query: "Find logistics companies in Finland with 50-200 employees.",
    });
  });

  it("maps agent errors to QueryParserError", async () => {
    const execute = vi.fn().mockResolvedValue(
      err(new AgentError("VALIDATION_ERROR", "invalid output")),
    );

    const agent = { execute } as unknown as QueryParserAgent;
    const service = new QueryParserService(agent);

    const result = await service.parse("Find companies");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.name).toBe("QueryParserError");
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
  });
});

describe("mapQueryParserError", () => {
  it("maps invalid input to 400", () => {
    const mapped = mapQueryParserError(
      new QueryParserError("INVALID_INPUT", "query must not be empty"),
    );

    expect(mapped.status).toBe(400);
  });

  it("maps openai failures to 503", () => {
    const mapped = mapQueryParserError(
      new QueryParserError("OPENAI_ERROR", "rate limit exceeded"),
    );

    expect(mapped.status).toBe(503);
  });
});
