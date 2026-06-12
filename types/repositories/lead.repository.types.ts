import type { CompanyProfileRecord, CompanyRecord } from "@/types/repositories/company.repository.types.js";

export interface RankedLeadRecord {
  searchResultId: string;
  searchJobId: string;
  companyId: string;
  rank: number | null;
  stage: string;
  stageError: string | null;
  discoveredAt: Date;
  completedAt: Date | null;
  company: CompanyRecord;
  profile: CompanyProfileRecord | null;
}
