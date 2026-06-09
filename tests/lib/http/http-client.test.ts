import { describe, expect, it, vi } from "vitest";
import { FetchHttpClient } from "@/lib/http/http-client.js";

describe("FetchHttpClient", () => {
  it("passes custom headers on GET requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("ok", {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = new FetchHttpClient();
    await client.get("https://example.com/robots.txt", {
      headers: {
        Accept: "text/plain",
        "User-Agent": "test-agent",
      },
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const requestInit = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = requestInit.headers as Record<string, string>;

    expect(headers.Accept).toBe("text/plain");
    expect(headers["User-Agent"]).toBe("test-agent");

    vi.unstubAllGlobals();
  });
});
