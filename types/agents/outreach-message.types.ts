export const OUTREACH_MESSAGE_PROMPT_VERSION = "outreach-v1";

export interface OutreachMessageInput {
  salespersonName: string;
  tone: string;
  channel: string;
  servicesCatalog: string;
  searchCriteria: string;
  companyProfile: string;
  intentSignals: string;
}
