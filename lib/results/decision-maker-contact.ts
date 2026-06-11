import type { ExtractedCompany } from "@/types/agents/company-extraction.types.js";
import { displayValue, isDisplayEmpty } from "@/lib/results/display-fields.js";

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

  return {
    name: displayValue(profile.decisionMaker),
    email: profile.decisionMakerEmail ?? null,
    phone: profile.decisionMakerPhone ?? null,
    linkedInUrl: profile.decisionMakerLinkedInUrl ?? null,
  };
}

export function hasDecisionMakerContactDetails(contact: DecisionMakerContact): boolean {
  return Boolean(contact.email?.trim() || contact.phone?.trim() || contact.linkedInUrl?.trim());
}
