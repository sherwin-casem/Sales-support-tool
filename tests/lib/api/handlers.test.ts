import { describe, expect, it, vi, beforeEach } from "vitest";
import { ApiError } from "@/lib/api/api-error.js";
import { withCronHandler } from "@/lib/api/cron-handler.js";
import { withWebhookHandler } from "@/lib/api/webhook-handler.js";
import { toApiError } from "@/lib/api/http-response.js";
import { DomainError } from "@/types/domain/domain-error.types.js";
import { RepositoryError } from "@/types/repositories/repository-error.types.js";

vi.mock("@/lib/config/outreach.config.js", () => ({
  getOutreachConfig: vi.fn(() => ({ cronSecret: "test-secret" })),
}));

describe("withCronHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns unauthorized when cron secret is missing", async () => {
    const handler = withCronHandler(async () => ({ ok: true }), {
      route: "/api/cron/test",
    });

    const response = await handler(new Request("https://example.com/cron"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns unauthorized when cron secret is wrong", async () => {
    const handler = withCronHandler(async () => ({ ok: true }), {
      route: "/api/cron/test",
    });

    const response = await handler(
      new Request("https://example.com/cron", {
        headers: { authorization: "Bearer wrong-secret" },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns handler result when authorized", async () => {
    const handler = withCronHandler(async () => ({ processed: 3 }), {
      route: "/api/cron/test",
    });

    const response = await handler(
      new Request("https://example.com/cron", {
        headers: { authorization: "Bearer test-secret" },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.processed).toBe(3);
  });

  it("maps thrown errors to JSON error responses", async () => {
    const handler = withCronHandler(
      async () => {
        throw ApiError.serviceUnavailable("Job failed");
      },
      { route: "/api/cron/test" },
    );

    const response = await handler(
      new Request("https://example.com/cron", {
        headers: { authorization: "Bearer test-secret" },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error.message).toBe("Job failed");
  });
});

describe("withWebhookHandler", () => {
  it("returns handler response on success", async () => {
    const handler = withWebhookHandler(
      async () => new Response(JSON.stringify({ received: true }), { status: 200 }),
      { route: "/api/v1/webhooks/test", method: "POST" },
    );

    const response = await handler(new Request("https://example.com/webhook"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.received).toBe(true);
  });

  it("maps thrown errors to JSON error responses", async () => {
    const handler = withWebhookHandler(
      async () => {
        throw ApiError.unauthorized("Invalid signature");
      },
      { route: "/api/v1/webhooks/test", method: "POST" },
    );

    const response = await handler(new Request("https://example.com/webhook"));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.message).toBe("Invalid signature");
  });
});

describe("toApiError", () => {
  it("maps RepositoryError codes to ApiError", () => {
    expect(toApiError(new RepositoryError("NOT_FOUND", "Missing")).status).toBe(404);
    expect(toApiError(new RepositoryError("INVALID_INPUT", "Bad input")).status).toBe(400);
    expect(toApiError(new RepositoryError("CONFLICT", "Duplicate")).status).toBe(422);
    expect(toApiError(new RepositoryError("DATABASE_ERROR", "DB down")).status).toBe(500);
  });

  it("maps DomainError codes to ApiError", () => {
    expect(toApiError(new DomainError("CONFLICT", "Slug exhausted")).status).toBe(422);
    expect(toApiError(new DomainError("NOT_FOUND", "Missing entity")).status).toBe(404);
    expect(toApiError(new DomainError("INVALID_INPUT", "Bad value")).status).toBe(400);
  });

  it("wraps unknown errors as internal errors", () => {
    const mapped = toApiError(new Error("Unexpected"));

    expect(mapped.status).toBe(500);
    expect(mapped.message).toBe("Unexpected");
  });
});
