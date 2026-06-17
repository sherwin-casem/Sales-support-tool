import type { ExtractedCompany } from "@/types/agents/company-extraction.types.js";
import { displayValue, isDisplayEmpty } from "@/lib/display/display-fields.js";
import {
  validatePersonalEmail,
  validatePhone,
} from "@/lib/validations/lead-contact.validation.js";

export interface DecisionMakerContact {
  name: string;
  email: string | null;
  phone: string | null;
  linkedInUrl: string | null;
}

export function resolveDecisionMakerContact(
  profile: ExtractedCompany | null | undefined,
): DecisionMakerContact | null {
  if (!profile || isDisplayEmpty(profile.decisionMaker)) {
    return null;
  }

  const rawEmail = profile.decisionMakerEmail ?? null;
  const resolvedEmail = validatePersonalEmail(rawEmail, profile.email ?? null);

  return {
    name: displayValue(profile.decisionMaker),
    email: resolvedEmail,
    phone: validatePhone(profile.decisionMakerPhone),
    linkedInUrl: profile.decisionMakerLinkedInUrl ?? null,
  };
}

export function hasDecisionMakerContactDetails(contact: DecisionMakerContact): boolean {
  return Boolean(contact.email?.trim() || contact.phone?.trim() || contact.linkedInUrl?.trim());
}
