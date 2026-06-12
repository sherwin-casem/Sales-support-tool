import { describe, expect, it } from "vitest";
import { OutreachMessageOutputSchema } from "@/lib/validations/outreach-message.schema.js";

describe("OutreachMessageOutputSchema", () => {
  it("accepts valid outreach output", () => {
    const parsed = OutreachMessageOutputSchema.safeParse({
      subject: "Partnership idea",
      bodyText: "Hello there",
      bodyHtml: "<p>Hello there</p>",
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects empty subject", () => {
    const parsed = OutreachMessageOutputSchema.safeParse({
      subject: "",
      bodyText: "Hello",
    });

    expect(parsed.success).toBe(false);
  });
});
