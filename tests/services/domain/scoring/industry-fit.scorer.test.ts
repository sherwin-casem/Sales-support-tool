import { describe, expect, it } from "vitest";
import { scoreIndustryFit } from "@/services/domain/scoring/industry-fit.scorer.js";

describe("scoreIndustryFit", () => {
  it("returns perfect score for exact match", () => {
    const result = scoreIndustryFit("logistics", "logistics");

    expect(result.score).toBe(100);
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  it("returns high score for synonym match", () => {
    const result = scoreIndustryFit("logistics", "freight");

    expect(result.score).toBe(85);
  });

  it("returns low score for mismatch", () => {
    const result = scoreIndustryFit("logistics", "fintech");

    expect(result.score).toBe(15);
  });

  it("returns neutral-low score when profile industry is unknown", () => {
    const result = scoreIndustryFit("logistics", "unknown");

    expect(result.score).toBe(30);
    expect(result.confidence).toBeLessThan(0.5);
  });
});
