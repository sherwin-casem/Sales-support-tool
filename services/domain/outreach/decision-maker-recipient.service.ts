import type { OutreachChannel } from "@prisma/client";
import {
  isPersonalLinkedInUrl,
  normalizeToE164Phone,
  validatePersonalEmail,
} from "@/lib/validations/lead-contact.validation.js";
import type { ExtractedCompany } from "@/types/agents/company-extraction.types.js";
import type { ResolvedRecipient } from "@/services/domain/outreach/recipient-resolver.service.js";

function isUnknownDecisionMaker(value: string | null | undefined): boolean {
  return !value?.trim() || value.trim().toLowerCase() === "unknown";
}

function resolveDecisionMakerName(profile: ExtractedCompany): string | null {
  if (isUnknownDecisionMaker(profile.decisionMaker)) {
    return null;
  }

  return profile.decisionMaker.trim();
}

export function hasDecisionMakerContactForChannel(
  profile: ExtractedCompany,
  channel: OutreachChannel,
): boolean {
  if (isUnknownDecisionMaker(profile.decisionMaker)) {
    return false;
  }

  return resolveDecisionMakerRecipientForChannel(profile, channel) !== null;
}

export function resolveDecisionMakerRecipientForChannel(
  profile: ExtractedCompany,
  channel: OutreachChannel,
): ResolvedRecipient | null {
  const toName = resolveDecisionMakerName(profile);

  if (!toName) {
    return null;
  }

  switch (channel) {
    case "EMAIL": {
      const email = validatePersonalEmail(profile.decisionMakerEmail);

      if (!email) {
        return null;
      }

      return { channel, toAddress: email, toName, toEmail: email };
    }
    case "WHATSAPP": {
      const phone = normalizeToE164Phone(profile.decisionMakerPhone);

      if (!phone) {
        return null;
      }

      return { channel, toAddress: phone, toName, toEmail: null };
    }
    case "LINKEDIN": {
      const linkedInUrl = profile.decisionMakerLinkedInUrl?.trim();

      if (!linkedInUrl || !isPersonalLinkedInUrl(linkedInUrl)) {
        return null;
      }

      return { channel, toAddress: linkedInUrl, toName, toEmail: null };
    }
    default:
      return null;
  }
}

export function getDecisionMakerMissingContactMessage(
  channel: OutreachChannel,
  domain: string,
): string {
  switch (channel) {
    case "EMAIL":
      return `No valid decision-maker email for company ${domain}`;
    case "WHATSAPP":
      return `No valid decision-maker phone for company ${domain}`;
    case "LINKEDIN":
      return `No valid decision-maker LinkedIn profile for company ${domain}`;
    default:
      return `No valid decision-maker contact for company ${domain}`;
  }
}
