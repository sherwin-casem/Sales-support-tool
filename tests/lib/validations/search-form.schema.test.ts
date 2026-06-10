import { describe, expect, it } from "vitest";
import {
  mapSearchFormFieldErrors,
  SearchFormSchema,
} from "@/lib/validations/search-form.schema.js";

describe("SearchFormSchema", () => {
  it("accepts a valid search query", () => {
    const parsed = SearchFormSchema.safeParse({
      query: "logistics companies in Finland",
      companyLimit: 25,
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.query).toBe("logistics companies in Finland");
      expect(parsed.data.companyLimit).toBe(25);
    }
  });

  it("defaults company limit to none when omitted", () => {
    const parsed = SearchFormSchema.safeParse({
      query: "logistics companies in Finland",
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.companyLimit).toBeNull();
    }
  });

  it("treats an empty company limit as none", () => {
    const parsed = SearchFormSchema.safeParse({
      query: "logistics companies in Finland",
      companyLimit: "",
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.companyLimit).toBeNull();
    }
  });

  it("trims whitespace from the query", () => {
    const parsed = SearchFormSchema.safeParse({
      query: "  SaaS startups  ",
      companyLimit: 10,
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.query).toBe("SaaS startups");
    }
  });

  it("rejects an empty query", () => {
    const parsed = SearchFormSchema.safeParse({
      query: "   ",
      companyLimit: 25,
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects queries longer than 500 characters", () => {
    const parsed = SearchFormSchema.safeParse({
      query: "a".repeat(501),
      companyLimit: 25,
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects company limits outside the allowed range", () => {
    const parsed = SearchFormSchema.safeParse({
      query: "valid query",
      companyLimit: 101,
    });

    expect(parsed.success).toBe(false);
  });

  it("maps field errors by form field name", () => {
    const parsed = SearchFormSchema.safeParse({
      query: "",
      companyLimit: 0,
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(mapSearchFormFieldErrors(parsed.error)).toEqual({
        query: "Describe the companies you are looking for",
        companyLimit: "Company limit must be at least 1",
      });
    }
  });
});
