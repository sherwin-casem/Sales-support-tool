import type { ExtractedCompany } from "@/types/agents/company-extraction.types.js";
import { hasDisplayValue } from "@/lib/results/display-fields.js";
import {
  hasDecisionMakerContactDetails,
  resolveDecisionMakerContact,
} from "@/lib/results/decision-maker-contact.js";
import {
  resolveDisplayEmail,
  resolveDisplayPhone,
} from "@/lib/results/profile-contacts.js";

export function hasCompanyContactDetails(profile: ExtractedCompany): boolean {
  const companyEmail = resolveDisplayEmail(profile.email ?? null);
  const companyPhone = resolveDisplayPhone(profile.phone ?? null);

  return (
    Boolean(companyEmail) ||
    Boolean(companyPhone) ||
    hasDisplayValue(profile.linkedInUrl) ||
    hasDisplayValue(profile.xUrl)
  );
}

export function hasAnyLeadContactDetails(
  profile: ExtractedCompany | null | undefined,
): boolean {
  if (!profile) {
    return false;
  }

  if (hasCompanyContactDetails(profile)) {
    return true;
  }

  const decisionMakerContact = resolveDecisionMakerContact(profile);

  if (!decisionMakerContact) {
    return false;
  }

  return hasDecisionMakerContactDetails(decisionMakerContact);
}
