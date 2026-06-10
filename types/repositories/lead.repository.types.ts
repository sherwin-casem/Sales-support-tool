import type { CompanyProfileRecord, CompanyRecord } from "@/types/repositories/company.repository.types.js";

export interface RankedLeadRecord {
  searchResultId: string;
  searchJobId: string;
  rank: number | null;
  stage: string;
  company: CompanyRecord;
  profile: CompanyProfileRecord | null;
}
