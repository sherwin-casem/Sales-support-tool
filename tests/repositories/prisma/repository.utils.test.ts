import { describe, expect, it } from "vitest";
import {
  dedupeCompanyUpsertInputs,
  normalizeCompanyUpsertInput,
} from "@/repositories/prisma/repository.utils.js";
import { RepositoryError } from "@/types/repositories/repository-error.types.js";

describe("repository.utils", () => {
  it("normalizes website input to domain", () => {
    const normalized = normalizeCompanyUpsertInput({
      website: "https://www.acme.fi/about",
      name: "Acme Logistics Oy",
    });

    expect(normalized.normalizedDomain).toBe("acme.fi");
    expect(normalized.websiteUrl).toBe("https://acme.fi/about");
  });

  it("deduplicates company upserts by normalized domain", () => {
    const deduped = dedupeCompanyUpsertInputs([
      { website: "https://acme.fi", name: "Acme Logistics Oy" },
      { website: "https://www.acme.fi", name: "Acme Logistics Oy" },
      { website: "https://beta.fi", name: "Beta Oy" },
    ]);

    expect(deduped).toHaveLength(2);
    expect(deduped.map((item) => item.normalizedDomain).sort()).toEqual([
      "acme.fi",
      "beta.fi",
    ]);
  });

  it("rejects blocked domains during normalization", () => {
    expect(() =>
      normalizeCompanyUpsertInput({
        website: "https://linkedin.com/company/acme",
      }),
    ).toThrow(RepositoryError);
  });
});
