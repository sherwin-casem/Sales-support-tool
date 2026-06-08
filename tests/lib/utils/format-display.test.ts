import { describe, expect, it } from "vitest";
import { formatCompleteness, formatDateTime } from "@/lib/utils/format-display";

describe("format-display", () => {
  it("formats ISO timestamps for display", () => {
    const formatted = formatDateTime("2026-06-07T12:00:00.000Z");

    expect(formatted).not.toBe("—");
    expect(formatted.length).toBeGreaterThan(0);
  });

  it("formats completeness ratios as percentages", () => {
    expect(formatCompleteness(0.876)).toBe("88%");
    expect(formatCompleteness(null)).toBe("—");
  });
});
