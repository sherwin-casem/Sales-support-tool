import { describe, expect, it, vi } from "vitest";
import { FetchHttpClient } from "@/lib/http/http-client.js";

describe("FetchHttpClient", () => {
  it("preserves Content-Type on POST when custom headers are provided", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("ok", {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = new FetchHttpClient();
    await client.post(
      "https://example.com/sparql",
      new URLSearchParams({ query: "SELECT ?x", format: "json" }),
      {
        headers: {
          Accept: "application/sparql-results+json",
          "User-Agent": "test-agent",
        },
      },
    );

    expect(fetchMock).toHaveBeenCalledOnce();
    const requestInit = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = requestInit.headers as Record<string, string>;

    expect(requestInit.method).toBe("POST");
    expect(headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
    expect(headers.Accept).toBe("application/sparql-results+json");
    expect(headers["User-Agent"]).toBe("test-agent");
    expect(requestInit.body).toBe("query=SELECT+%3Fx&format=json");

    vi.unstubAllGlobals();
  });
});
