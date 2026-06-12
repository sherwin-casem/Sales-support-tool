export const INTENT_SIGNAL_PROMPT_VERSION = "intent-v1";

export interface IntentDetectionInput {
  companyId: string;
  companyName: string;
  domain: string;
  website: string;
  industry?: string | null;
  profileSummary: string;
}

export interface DetectedIntentSignal {
  type: "HIRING" | "FUNDING" | "EXPANSION" | "PRODUCT_LAUNCH" | "OTHER";
  title: string;
  summary: string;
  sourceUrl?: string | null;
  confidence: number;
  expiresAt?: string | null;
}
