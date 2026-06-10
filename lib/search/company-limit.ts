export type CompanyLimit = number | null;

export function isUnlimitedCompanyLimit(limit: CompanyLimit | undefined): boolean {
  return limit == null;
}

export function formatCompanyLimitLabel(limit: CompanyLimit): string {
  return isUnlimitedCompanyLimit(limit) ? "No limit" : String(limit);
}
