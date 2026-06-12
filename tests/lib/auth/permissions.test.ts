import { describe, expect, it } from "vitest";
import { hasPermission } from "@/lib/auth/permissions.js";

describe("permissions", () => {
  it("allows sales reps to create searches and campaigns", () => {
    expect(hasPermission("SALES_REP", "search:create")).toBe(true);
    expect(hasPermission("SALES_REP", "campaign:create")).toBe(true);
    expect(hasPermission("SALES_REP", "outreach:generate")).toBe(true);
  });

  it("restricts analytics to managers and admins", () => {
    expect(hasPermission("SALES_REP", "analytics:read")).toBe(false);
    expect(hasPermission("MANAGER", "analytics:read")).toBe(true);
    expect(hasPermission("ADMIN", "analytics:read")).toBe(true);
  });

  it("restricts user management to admins", () => {
    expect(hasPermission("MANAGER", "user:manage")).toBe(false);
    expect(hasPermission("ADMIN", "user:manage")).toBe(true);
  });
});
