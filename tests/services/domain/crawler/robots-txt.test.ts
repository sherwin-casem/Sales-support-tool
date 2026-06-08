import { describe, expect, it, vi } from "vitest";
import { RobotsTxtService } from "@/services/domain/crawler/robots-txt.service.js";
import type { HttpClient } from "@/lib/http/http-client.js";

describe("RobotsTxtService", () => {
  it("blocks disallowed paths from robots.txt", async () => {
    const http: HttpClient = {
      get: vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => "User-agent: *\nDisallow: /careers\n",
      }),
      post: vi.fn(),
    };

    const service = new RobotsTxtService(http);
    const allowed = await service.isAllowed("https://acme.fi", "/about");
    const blocked = await service.isAllowed("https://acme.fi", "/careers");

    expect(allowed).toBe(true);
    expect(blocked).toBe(false);
  });
});
