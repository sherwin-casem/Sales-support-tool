import { z } from "zod";

export const TextCleaningInputSchema = z.object({
  html: z.string().min(1, "html must not be empty").max(500_000),
  url: z.string().url().max(2048),
  pagePath: z.string().min(1).max(500),
  title: z.string().max(500).nullable().optional(),
});

export const ContentHeadingSchema = z.object({
  level: z.number().int().min(1).max(6),
  text: z.string().min(1).max(500),
});

export const LlmReadyContentSchema = z.object({
  body: z.string().max(50_000),
  metadata: z.object({
    title: z.string().nullable(),
    description: z.string().nullable(),
    jsonLd: z.array(z.record(z.unknown())),
    headings: z.array(ContentHeadingSchema),
    language: z.string().nullable(),
  }),
  stats: z.object({
    inputBytes: z.number().int().min(0),
    outputChars: z.number().int().min(0),
    compressionRatio: z.number().min(0),
    blocksRemoved: z.number().int().min(0),
    sectionsPreserved: z.number().int().min(0),
    lowQuality: z.boolean(),
  }),
  source: z.object({
    url: z.string().url(),
    pagePath: z.string(),
    cleanedAt: z.string().datetime(),
  }),
});

export type TextCleaningInputValidated = z.infer<typeof TextCleaningInputSchema>;
