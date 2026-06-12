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
  bodyHtml: z.string().optional(),
});

export const OUTREACH_MESSAGE_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["subject", "bodyText"],
  properties: {
    subject: { type: "string" },
    bodyText: { type: "string" },
    bodyHtml: { type: ["string", "null"] },
  },
} as const;
