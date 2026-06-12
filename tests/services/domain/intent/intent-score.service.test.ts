import { describe, expect, it } from "vitest";
import { computeIntentScore } from "@/services/domain/intent/intent-score.service.js";

describe("computeIntentScore", () => {
  it("returns 0 for empty signals", () => {
    expect(computeIntentScore([])).toBe(0);
  });

  it("returns signal confidence for a single recent signal", () => {
    const score = computeIntentScore([
      { type: "FUNDING", confidence: 0.8, detectedAt: new Date() },
    ]);

    expect(score).toBe(0.8);
  });

  it("decays older signals", () => {
    const recent = new Date();
    const old = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const recentScore = computeIntentScore([
      { type: "HIRING", confidence: 0.8, detectedAt: recent },
    ]);
    const oldScore = computeIntentScore([
      { type: "HIRING", confidence: 0.8, detectedAt: old },
    ]);

    expect(recentScore).toBeGreaterThan(oldScore);
  });
});
