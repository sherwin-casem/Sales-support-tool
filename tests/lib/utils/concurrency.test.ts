import { describe, expect, it } from "vitest";
import { runWithConcurrency } from "@/lib/utils/concurrency.js";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("runWithConcurrency", () => {
  it("returns results in input order", async () => {
    const results = await runWithConcurrency([1, 2, 3], 2, async (value) => value * 2);

    expect(results).toEqual([2, 4, 6]);
  });

  it("limits concurrent workers", async () => {
    let active = 0;
    let maxActive = 0;

    await runWithConcurrency([1, 2, 3, 4, 5], 2, async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await sleep(20);
      active -= 1;
    });

    expect(maxActive).toBeLessThanOrEqual(2);
    expect(maxActive).toBe(2);
  });

  it("returns an empty array for no items", async () => {
    const results = await runWithConcurrency([], 3, async () => "unused");

    expect(results).toEqual([]);
  });
});
