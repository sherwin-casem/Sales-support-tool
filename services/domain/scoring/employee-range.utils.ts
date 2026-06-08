export interface EmployeeRange {
  min: number;
  max: number;
}

export function parseEmployeeRange(value: string): EmployeeRange | null {
  const normalized = value.trim().toLowerCase();

  if (normalized === "unknown") {
    return null;
  }

  const rangeMatch = /^(\d+)-(\d+)$/.exec(normalized);

  if (rangeMatch) {
    const min = Number.parseInt(rangeMatch[1] ?? "0", 10);
    const max = Number.parseInt(rangeMatch[2] ?? "0", 10);

    if (min > max) {
      return null;
    }

    return { min, max };
  }

  const minimumMatch = /^(\d+)\+$/.exec(normalized);

  if (minimumMatch) {
    return {
      min: Number.parseInt(minimumMatch[1] ?? "0", 10),
      max: Number.POSITIVE_INFINITY,
    };
  }

  return null;
}

export function rangeSpan(range: EmployeeRange): number {
  if (!Number.isFinite(range.max)) {
    return range.min;
  }

  return Math.max(range.max - range.min, 1);
}

export function computeRangeOverlapRatio(
  criteria: EmployeeRange,
  profile: EmployeeRange,
): number {
  const overlapMin = Math.max(criteria.min, profile.min);
  const overlapMax = Math.min(criteria.max, profile.max);

  if (overlapMin > overlapMax) {
    return 0;
  }

  const overlap = overlapMax - overlapMin;
  const referenceSpan = Math.min(rangeSpan(criteria), rangeSpan(profile));

  return overlap / referenceSpan;
}

export function isAdjacentRange(
  criteria: EmployeeRange,
  profile: EmployeeRange,
): boolean {
  if (!Number.isFinite(criteria.max) || !Number.isFinite(profile.max)) {
    return false;
  }

  const gap = Math.min(
    Math.abs(profile.min - criteria.max),
    Math.abs(criteria.min - profile.max),
  );

  const threshold = Math.max(rangeSpan(criteria), rangeSpan(profile)) * 0.2;

  return gap > 0 && gap <= threshold;
}

export function isRangeFullyInside(
  inner: EmployeeRange,
  outer: EmployeeRange,
): boolean {
  if (!Number.isFinite(inner.max)) {
    return false;
  }

  if (inner.min < outer.min) {
    return false;
  }

  if (!Number.isFinite(outer.max)) {
    return true;
  }

  return inner.max <= outer.max;
}
