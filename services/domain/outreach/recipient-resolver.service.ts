import type { OutreachChannel } from "@prisma/client";
import {
  isPersonalLinkedInUrl,
  normalizeToE164Phone,
  validateEmail,
  validatePersonalEmail,
} from "@/lib/validations/lead-contact.validation.js";
import type { ExtractedCompany } from "@/types/agents/company-extraction.types.js";

export interface ResolvedRecipient {
  channel: OutreachChannel;
  toAddress: string;
  toName: string | null;
  toEmail: string | null;
}

export function resolveRecipientForChannel(
  profile: ExtractedCompany,
  channel: OutreachChannel,
): ResolvedRecipient | null {
  const toName = profile.decisionMaker?.trim() && profile.decisionMaker.toLowerCase() !== "unknown"
    ? profile.decisionMaker.trim()
    : null;

  switch (channel) {
    case "EMAIL": {
      const email =
        validatePersonalEmail(profile.decisionMakerEmail, profile.email) ??
        validateEmail(profile.email);

      if (!email) {
        return null;
      }

      return { channel, toAddress: email, toName, toEmail: email };
    }
    case "WHATSAPP": {
      const phone =
        normalizeToE164Phone(profile.decisionMakerPhone) ??
        normalizeToE164Phone(profile.phone);

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

export function getRecipientMissingContactMessage(
  channel: OutreachChannel,
  domain: string,
): string {
  switch (channel) {
    case "EMAIL":
      return `No valid email for company ${domain}`;
    case "WHATSAPP":
      return `No valid phone number for company ${domain}`;
    case "LINKEDIN":
      return `No valid decision-maker LinkedIn profile for company ${domain}`;
    default:
      return `No valid contact for company ${domain}`;
  }
}
