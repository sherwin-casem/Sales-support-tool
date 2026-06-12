import type { IntentSignalType } from "@prisma/client";

const TYPE_WEIGHTS: Record<IntentSignalType, number> = {
  HIRING: 0.25,
  FUNDING: 0.35,
  EXPANSION: 0.3,
  PRODUCT_LAUNCH: 0.2,
  OTHER: 0.1,
};

const RECENCY_HALF_LIFE_DAYS = 30;

export interface IntentSignalScoreInput {
  type: IntentSignalType;
  confidence: number;
  detectedAt: Date;
}

export function computeIntentScore(signals: IntentSignalScoreInput[]): number {
  if (signals.length === 0) {
    return 0;
  }

  const now = Date.now();
  let weightedSum = 0;
  let weightTotal = 0;

  for (const signal of signals) {
    const ageDays = Math.max(0, (now - signal.detectedAt.getTime()) / (1000 * 60 * 60 * 24));
    const recencyFactor = Math.pow(0.5, ageDays / RECENCY_HALF_LIFE_DAYS);
    const typeWeight = TYPE_WEIGHTS[signal.type];
    const signalWeight = typeWeight * signal.confidence * recencyFactor;
    weightedSum += signalWeight;
    weightTotal += typeWeight;
  }

  if (weightTotal === 0) {
    return 0;
  }

  return Math.min(1, Number((weightedSum / weightTotal).toFixed(3)));
}
