import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ApiError } from "@/lib/api/api-error.js";
import { withApiHandler } from "@/lib/api/handler.js";
import {
  parseJsonBodyWithSchema,
  parseQueryParamsWithSchema,
} from "@/lib/api/parse-request.js";

describe("parse-request", () => {
  it("throws validation error for invalid JSON bodies", () => {
    expect(() =>
      parseJsonBodyWithSchema(
        z.object({ query: z.string().min(1) }),
        { query: "" },
      ),
    ).toThrowError(
      expect.objectContaining({
        code: "VALIDATION_ERROR",
        status: 422,
      }),
    );
  });

  it("parses query params with defaults", () => {
    const schema = z.object({
      page: z.coerce.number().int().min(1).default(1),
    });

    const parsed = parseQueryParamsWithSchema(
      new Request("https://example.com/companies"),
      schema,
    );

    expect(parsed.page).toBe(1);
  });
});

describe("withApiHandler", () => {
  it("returns unauthorized when bearer token is missing", async () => {
    const handler = withApiHandler(
      async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
      { route: "/test", method: "GET" },
    );

    const response = await handler(new Request("https://example.com/test"), {});
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("resolves async route params before invoking handler", async () => {
    const handler = withApiHandler(
      async (_request, context) =>
        new Response(JSON.stringify(context.params), { status: 200 }),
      { requireAuth: false, route: "/test/:id", method: "GET" },
    );

    const response = await handler(new Request("https://example.com/test/1"), {
      params: Promise.resolve({ id: "abc" }),
    });
    const body = await response.json();

    expect(body.id).toBe("abc");
  });

  it("maps thrown ApiError instances to JSON error responses", async () => {
    const handler = withApiHandler(
      async () => {
        throw ApiError.notFound("missing");
      },
      { requireAuth: false, route: "/test", method: "GET" },
    );

    const response = await handler(new Request("https://example.com/test"), {});
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error.message).toBe("missing");
  });
});
