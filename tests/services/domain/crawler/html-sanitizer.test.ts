import { describe, expect, it } from "vitest";
import { HtmlSanitizerService } from "@/services/domain/crawler/html-sanitizer.service.js";

describe("HtmlSanitizerService", () => {
  const sanitizer = new HtmlSanitizerService();

  it("strips scripts and normalizes whitespace", () => {
    const result = sanitizer.sanitize(
      "<html><head><script>alert(1)</script></head><body><p>Hello   world</p></body></html>",
      "Acme Logistics",
      "Hello   world",
    );

    expect(result.title).toBe("Acme Logistics");
    expect(result.contentText).toBe("Hello world");
    expect(result.html).not.toContain("<script");
  });
});
