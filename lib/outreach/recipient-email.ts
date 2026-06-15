import {
  validateEmail,
  validatePersonalEmail,
} from "@/lib/validations/lead-contact.validation.js";
import type { ExtractedCompany } from "@/types/agents/company-extraction.types.js";

export function resolveRecipientEmail(profile: ExtractedCompany): string | null {
  return (
    validatePersonalEmail(profile.decisionMakerEmail, profile.email) ??
    validateEmail(profile.email)
  );
}

export function hasOutreachRecipientEmail(
  profile: ExtractedCompany | null | undefined,
): boolean {
  return profile !== null && profile !== undefined && resolveRecipientEmail(profile) !== null;
}
