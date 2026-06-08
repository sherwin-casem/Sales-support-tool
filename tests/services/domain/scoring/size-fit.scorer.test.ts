import { describe, expect, it } from "vitest";
import { scoreSizeFit } from "@/services/domain/scoring/size-fit.scorer.js";

describe("scoreSizeFit", () => {
  it("returns perfect score when profile range is inside criteria", () => {
    const result = scoreSizeFit("50-200", "100-200");

    expect(result.score).toBe(100);
  });

  it("returns neutral score when profile size is unknown", () => {
    const result = scoreSizeFit("50-200", "unknown");

    expect(result.score).toBe(40);
    expect(result.signals).toContain("profile size unknown");
  });

  it("returns low score for mismatched ranges", () => {
    const result = scoreSizeFit("50-200", "500+");

    expect(result.score).toBeLessThanOrEqual(30);
  });
});
