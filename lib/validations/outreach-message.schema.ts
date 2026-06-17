import { z } from "zod";

export const OutreachChannelSchema = z.enum(["EMAIL", "WHATSAPP", "LINKEDIN"]);

export const GenerateOutreachMessageSchema = z.object({
  companyId: z.string().uuid(),
  searchResultId: z.string().uuid().optional(),
  tone: z.enum(["professional", "consultative", "brief"]).default("professional"),
  channel: OutreachChannelSchema.default("EMAIL"),
});

export type GenerateOutreachMessageInput = z.infer<typeof GenerateOutreachMessageSchema>;

export const OutreachMessageOutputSchema = z.object({
  subject: z.string().max(500),
  bodyText: z.string().min(1),
  bodyHtml: z.union([z.string(), z.null()]),
});

export function validateOutreachMessageOutput(
  channel: z.infer<typeof OutreachChannelSchema>,
  output: z.infer<typeof OutreachMessageOutputSchema>,
): z.SafeParseReturnType<unknown, z.infer<typeof OutreachMessageOutputSchema>> {
  if (channel === "EMAIL" && !output.subject.trim()) {
    return {
      success: false,
      error: new z.ZodError([
        {
          code: z.ZodIssueCode.custom,
          message: "Subject is required for email outreach",
          path: ["subject"],
        },
      ]),
    };
  }

  if (channel !== "EMAIL" && !output.bodyText.trim()) {
    return {
      success: false,
      error: new z.ZodError([
        {
          code: z.ZodIssueCode.custom,
          message: "Message body is required",
          path: ["bodyText"],
        },
      ]),
    };
  }

  return { success: true, data: output };
}

export function getOutreachMessageJsonSchema(channel: z.infer<typeof OutreachChannelSchema>) {
  return {
    type: "object",
    additionalProperties: false,
    required: channel === "EMAIL" ? ["subject", "bodyText", "bodyHtml"] : ["bodyText", "bodyHtml"],
    properties: {
      subject: { type: "string" },
      bodyText: { type: "string" },
      bodyHtml: { type: ["string", "null"] },
    },
  } as const;
}

/** Converts plain-text paragraphs to simple HTML for email delivery. */
export function bodyTextToHtml(bodyText: string): string {
  const paragraphs = bodyText
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) {
    return `<p>${escapeHtml(bodyText.trim())}</p>`;
  }

  return paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("");
}

export function resolveOutreachBodyHtml(
  bodyText: string,
  bodyHtml: string | null | undefined,
): string {
  if (bodyHtml?.trim()) {
    return bodyHtml.trim();
  }

  return bodyTextToHtml(bodyText);
}

export function resolveOutreachSubject(
  channel: z.infer<typeof OutreachChannelSchema>,
  subject: string,
): string {
  if (channel === "EMAIL") {
    return subject.trim();
  }

  return subject.trim() || "Outreach";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
