import { describe, expect, it } from "vitest";
import {
  getOutreachMessageJsonSchema,
  OutreachMessageOutputSchema,
  validateOutreachMessageOutput,
  bodyTextToHtml,
  resolveOutreachBodyHtml,
} from "@/lib/validations/outreach-message.schema.js";

describe("getOutreachMessageJsonSchema", () => {
  it("requires subject for email channel", () => {
    const schema = getOutreachMessageJsonSchema("EMAIL");
    expect(schema.required).toContain("subject");
  });

  it("does not require subject for WhatsApp channel", () => {
    const schema = getOutreachMessageJsonSchema("WHATSAPP");
    expect(schema.required).not.toContain("subject");
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

  it("allows empty subject at schema level", () => {
    const parsed = OutreachMessageOutputSchema.safeParse({
      subject: "",
      bodyText: "Hello",
      bodyHtml: null,
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects empty email subject via channel validation", () => {
    const parsed = OutreachMessageOutputSchema.safeParse({
      subject: "",
      bodyText: "Hello",
      bodyHtml: null,
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      const channelValidated = validateOutreachMessageOutput("EMAIL", parsed.data);
      expect(channelValidated.success).toBe(false);
    }
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
