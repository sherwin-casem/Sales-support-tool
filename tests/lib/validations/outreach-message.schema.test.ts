import { describe, expect, it } from "vitest";
import {
  OUTREACH_MESSAGE_JSON_SCHEMA,
  OutreachMessageOutputSchema,
  bodyTextToHtml,
  resolveOutreachBodyHtml,
} from "@/lib/validations/outreach-message.schema.js";

describe("OUTREACH_MESSAGE_JSON_SCHEMA", () => {
  it("requires every property key for OpenAI strict mode", () => {
    const propertyKeys = Object.keys(OUTREACH_MESSAGE_JSON_SCHEMA.properties);
    const requiredKeys = OUTREACH_MESSAGE_JSON_SCHEMA.required;

    for (const key of propertyKeys) {
      expect(requiredKeys).toContain(key);
    }
  });
});

describe("OutreachMessageOutputSchema", () => {
  it("accepts valid outreach output", () => {
    const parsed = OutreachMessageOutputSchema.safeParse({
      subject: "Partnership idea",
      bodyText: "Hello there",
      bodyHtml: "<p>Hello there</p>",
    });

    expect(parsed.success).toBe(true);
  });

  it("accepts null bodyHtml", () => {
    const parsed = OutreachMessageOutputSchema.safeParse({
      subject: "Partnership idea",
      bodyText: "Hello there",
      bodyHtml: null,
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects empty subject", () => {
    const parsed = OutreachMessageOutputSchema.safeParse({
      subject: "",
      bodyText: "Hello",
      bodyHtml: null,
    });

    expect(parsed.success).toBe(false);
  });
});

describe("bodyTextToHtml", () => {
  it("wraps paragraphs in p tags", () => {
    expect(bodyTextToHtml("Hello\n\nWorld")).toBe("<p>Hello</p><p>World</p>");
  });

  it("escapes HTML characters", () => {
    expect(bodyTextToHtml("A & B <script>")).toBe("<p>A &amp; B &lt;script&gt;</p>");
  });
});

describe("resolveOutreachBodyHtml", () => {
  it("uses provided html when present", () => {
    expect(resolveOutreachBodyHtml("Hello", "<p>Custom</p>")).toBe("<p>Custom</p>");
  });

  it("falls back to bodyTextToHtml when html is null", () => {
    expect(resolveOutreachBodyHtml("Hello", null)).toBe("<p>Hello</p>");
  });
});
