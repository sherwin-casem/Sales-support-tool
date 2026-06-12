import { z } from "zod";

export const GenerateOutreachMessageSchema = z.object({
  companyId: z.string().uuid(),
  searchResultId: z.string().uuid().optional(),
  tone: z.enum(["professional", "consultative", "brief"]).default("professional"),
  channel: z.enum(["EMAIL", "WHATSAPP", "LINKEDIN"]).default("EMAIL"),
});

export type GenerateOutreachMessageInput = z.infer<typeof GenerateOutreachMessageSchema>;

export const OutreachMessageOutputSchema = z.object({
  subject: z.string().min(1).max(500),
  bodyText: z.string().min(1),
  bodyHtml: z.union([z.string(), z.null()]),
});

export const OUTREACH_MESSAGE_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["subject", "bodyText", "bodyHtml"],
  properties: {
    subject: { type: "string" },
    bodyText: { type: "string" },
    bodyHtml: { type: ["string", "null"] },
  },
} as const;

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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
