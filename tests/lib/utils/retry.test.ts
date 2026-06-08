import { describe, expect, it, vi } from "vitest";
import { withRetry } from "@/lib/utils/retry.js";

describe("withRetry", () => {
  it("retries failed operations", async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error("temporary"))
      .mockResolvedValue("success");

    const result = await withRetry(operation, {
      maxAttempts: 2,
      initialDelayMs: 1,
    });

    expect(result).toBe("success");
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("throws after max attempts", async () => {
    const operation = vi.fn().mockRejectedValue(new Error("persistent"));

    await expect(
      withRetry(operation, {
        maxAttempts: 2,
        initialDelayMs: 1,
      }),
    ).rejects.toThrow("persistent");
  });
});
