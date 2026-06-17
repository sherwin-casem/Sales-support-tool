import { describe, expect, it, vi } from "vitest";
import {
  buildOrganizationSlugCandidates,
  resolveUniqueOrganizationSlug,
  slugifyOrganizationName,
} from "@/services/domain/organization/organization-slug.js";

describe("organization-slug", () => {
  it("slugifies organization names", () => {
    expect(slugifyOrganizationName("Acme Payments Inc.")).toBe("acme-payments-inc");
    expect(slugifyOrganizationName("  Hello   World  ")).toBe("hello-world");
  });

  it("falls back when slug would be empty", () => {
    expect(slugifyOrganizationName("***")).toBe("organization");
  });

  it("builds collision suffix candidates", () => {
    const candidates = buildOrganizationSlugCandidates("acme");

    expect(candidates[0]).toBe("acme");
    expect(candidates[1]).toBe("acme-2");
    expect(candidates[2]).toBe("acme-3");
    expect(candidates).toHaveLength(50);
  });

  it("returns the first available slug", async () => {
    const slugExists = vi
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    const slug = await resolveUniqueOrganizationSlug("Acme", slugExists);

    expect(slug).toBe("acme-2");
    expect(slugExists).toHaveBeenCalledTimes(2);
  });
});
