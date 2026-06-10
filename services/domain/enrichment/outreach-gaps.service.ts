import type { ExtractedCompany } from "@/types/agents/company-extraction.types.js";

function isUnknown(value: string): boolean {
  return !value.trim() || value.trim().toLowerCase() === "unknown";
}

/** True when outreach-critical contact fields are still missing after web enrichment. */
export function hasOutreachContactGaps(profile: ExtractedCompany): boolean {
  return (
    isUnknown(profile.decisionMaker) ||
    !profile.email?.trim() ||
    !profile.linkedInUrl?.trim()
  );
}
