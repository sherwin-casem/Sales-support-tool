import { z } from "zod";

export const IntentSignalTypeSchema = z.enum([
  "HIRING",
  "FUNDING",
  "EXPANSION",
  "PRODUCT_LAUNCH",
  "OTHER",
]);

export const IntentSignalItemSchema = z.object({
  type: IntentSignalTypeSchema,
  title: z.string().min(1).max(500),
  summary: z.string().min(1),
  sourceUrl: z.string().url().nullable().optional(),
  confidence: z.number().min(0).max(1),
  expiresAt: z.string().datetime().nullable().optional(),
});

export const IntentDetectionResponseSchema = z.object({
  signals: z.array(IntentSignalItemSchema).max(10),
});

export const INTENT_DETECTION_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["signals"],
  properties: {
    signals: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["type", "title", "summary", "confidence"],
        properties: {
          type: {
            type: "string",
            enum: ["HIRING", "FUNDING", "EXPANSION", "PRODUCT_LAUNCH", "OTHER"],
          },
          title: { type: "string" },
          summary: { type: "string" },
          sourceUrl: { type: ["string", "null"] },
          confidence: { type: "number" },
          expiresAt: { type: ["string", "null"] },
        },
      },
    },
  },
} as const;
