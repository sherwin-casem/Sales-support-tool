export interface TextCleaningInput {
  html: string;
  url: string;
  pagePath: string;
  title?: string | null;
}

export interface ContentHeading {
  level: number;
  text: string;
}

export interface ContentMetadata {
  title: string | null;
  description: string | null;
  jsonLd: Record<string, unknown>[];
  headings: ContentHeading[];
  language: string | null;
}

export interface CleaningStats {
  inputBytes: number;
  outputChars: number;
  compressionRatio: number;
  blocksRemoved: number;
  sectionsPreserved: number;
  lowQuality: boolean;
}

export interface LlmReadyContent {
  body: string;
  metadata: ContentMetadata;
  stats: CleaningStats;
  source: {
    url: string;
    pagePath: string;
    cleanedAt: string;
  };
}

export const DEFAULT_MAX_BODY_CHARS = 8_000;
