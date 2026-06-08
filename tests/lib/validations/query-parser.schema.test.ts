import { describe, expect, it } from "vitest";
import {
  ParsedQuerySchema,
  QueryParserInputSchema,
} from "@/lib/validations/query-parser.schema.js";

describe("QueryParserInputSchema", () => {
  it("trims query and accepts valid input", () => {
    const result = QueryParserInputSchema.safeParse({
      query: "  Find logistics companies  ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.query).toBe("Find logistics companies");
    }
  });

  it("rejects empty query", () => {
    const result = QueryParserInputSchema.safeParse({ query: "   " });
    expect(result.success).toBe(false);
  });

  it("rejects query longer than 500 characters", () => {
    const result = QueryParserInputSchema.safeParse({
      query: "a".repeat(501),
    });
    expect(result.success).toBe(false);
  });
});

describe("ParsedQuerySchema", () => {
  it("normalizes valid parsed query", () => {
    const result = ParsedQuerySchema.safeParse({
      industry: " Logistics ",
      location: " Finland ",
      employeeRange: "50-200",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        industry: "logistics",
        location: "Finland",
        employeeRange: "50-200",
      });
    }
  });

  it("accepts unknown employee range", () => {
    const result = ParsedQuerySchema.safeParse({
      industry: "saas",
      location: "Berlin",
      employeeRange: "unknown",
    });

    expect(result.success).toBe(true);
  });

  it("accepts minimum employee range format", () => {
    const result = ParsedQuerySchema.safeParse({
      industry: "manufacturing",
      location: "Germany",
      employeeRange: "500+",
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid employee range", () => {
    const result = ParsedQuerySchema.safeParse({
      industry: "saas",
      location: "Berlin",
      employeeRange: "lots of people",
    });

    expect(result.success).toBe(false);
  });
});
