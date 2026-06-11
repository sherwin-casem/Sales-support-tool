import type { ExtractedCompany } from "@/types/agents/company-extraction.types.js";
import { hasDecisionMakerPersonalContactGaps } from "@/services/domain/enrichment/decision-maker-contact.service.js";

/** True when decision maker name or personal contact fields are still missing. */
export function hasOutreachContactGaps(profile: ExtractedCompany): boolean {
  return hasDecisionMakerPersonalContactGaps(profile);
}
