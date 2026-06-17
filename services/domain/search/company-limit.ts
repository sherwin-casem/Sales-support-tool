export type CompanyLimit = number | null;

export function isUnlimitedCompanyLimit(limit: CompanyLimit | undefined): boolean {
  return limit == null;
}

export function getEnrichmentDeficit(targetLimit: number, enrichedCount: number): number {
  return Math.max(0, targetLimit - enrichedCount);
}
