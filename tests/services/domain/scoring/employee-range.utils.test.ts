import { describe, expect, it } from "vitest";
import {
  computeRangeOverlapRatio,
  isAdjacentRange,
  isRangeFullyInside,
  parseEmployeeRange,
  rangeSpan,
} from "@/services/domain/scoring/employee-range.utils.js";

describe("parseEmployeeRange", () => {
  it("parses bounded and open-ended ranges", () => {
    expect(parseEmployeeRange("50-200")).toEqual({ min: 50, max: 200 });
    expect(parseEmployeeRange("100+")).toEqual({
      min: 100,
      max: Number.POSITIVE_INFINITY,
    });
    expect(parseEmployeeRange("unknown")).toBeNull();
  });
});

describe("computeRangeOverlapRatio", () => {
  it("returns high overlap for overlapping ranges", () => {
    const criteria = parseEmployeeRange("50-200")!;
    const profile = parseEmployeeRange("150-250")!;

    expect(computeRangeOverlapRatio(criteria, profile)).toBeCloseTo(0.5, 2);
  });

  it("returns zero for disjoint ranges", () => {
    const criteria = parseEmployeeRange("50-200")!;
    const profile = parseEmployeeRange("300-400")!;

    expect(computeRangeOverlapRatio(criteria, profile)).toBe(0);
  });
});

describe("isRangeFullyInside", () => {
  it("detects profile range inside criteria", () => {
    expect(
      isRangeFullyInside(parseEmployeeRange("100-200")!, parseEmployeeRange("50-200")!),
    ).toBe(true);
  });
});

describe("isAdjacentRange", () => {
  it("detects adjacent bounded ranges", () => {
    expect(
      isAdjacentRange(parseEmployeeRange("50-200")!, parseEmployeeRange("201-300")!),
    ).toBe(true);
  });
});

describe("rangeSpan", () => {
  it("uses minimum for open-ended ranges", () => {
    expect(rangeSpan(parseEmployeeRange("100+")!)).toBe(100);
  });
});
