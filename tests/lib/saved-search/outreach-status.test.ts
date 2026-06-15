import { describe, expect, it } from "vitest";
import { computeSavedSearchOutreachStatus } from "@/lib/saved-search/outreach-status.js";

describe("computeSavedSearchOutreachStatus", () => {
  it("returns NOT_STARTED when there are no recipients", () => {
    expect(computeSavedSearchOutreachStatus([])).toBe("NOT_STARTED");
  });

  it("returns IN_PROGRESS when recipients are pending", () => {
    expect(
      computeSavedSearchOutreachStatus([
        { status: "PENDING", campaignStatus: "RUNNING" },
      ]),
    ).toBe("IN_PROGRESS");
  });

  it("returns COMPLETED when all recipients are terminal and campaigns are inactive", () => {
    expect(
      computeSavedSearchOutreachStatus([
        { status: "SENT", campaignStatus: "COMPLETED" },
        { status: "DELIVERED", campaignStatus: "COMPLETED" },
      ]),
    ).toBe("COMPLETED");
  });
});
