import type { CompanyProfileRecord, CompanyRecord } from "@/types/repositories/company.repository.types.js";

export interface IntentSignalSummary {
  id: string;
  type: string;
  title: string;
  confidence: number;
}

export interface RankedLeadRecord {
  searchResultId: string;
  searchJobId: string;
  companyId: string;
  rank: number | null;
  stage: string;
  stageError: string | null;
  discoveredAt: Date;
  completedAt: Date | null;
  company: CompanyRecord & { intentScore?: number | null };
  profile: CompanyProfileRecord | null;
  intentSignals?: IntentSignalSummary[];
}
