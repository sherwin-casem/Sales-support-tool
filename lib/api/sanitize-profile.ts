import type { ExtractedCompany } from "@/types/agents/company-extraction.types.js";
import { sanitizeLeadContacts } from "@/services/domain/enrichment/decision-maker-contact.service.js";

/** Re-validates stored contact fields when serving profiles (covers legacy DB rows). */
export function sanitizeProfileForResponse(
  profile: ExtractedCompany | null | undefined,
): ExtractedCompany | null {
  if (!profile) {
    return null;
  }

  return sanitizeLeadContacts(profile);
}
