import type { ExtractedCompany } from "@/types/agents/company-extraction.types.js";
import {
  isGenericEmailLocalPart,
  isPersonalLinkedInUrl,
  normalizePhoneDigits,
  validateEmail,
  validatePersonalEmail,
  validatePhone,
} from "@/lib/validations/lead-contact.validation.js";

export interface DecisionMakerContactHints {
  email: string | null;
  linkedInUrl: string | null;
}

const PROXIMITY_WINDOW_CHARS = 300;

const MAILTO_PATTERN = /mailto:([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/gi;
const LINKEDIN_IN_PATTERN =
  /https?:\/\/(?:[\w.-]+\.)?linkedin\.com\/in\/[a-z0-9_-]+\/?/gi;

function isUnknown(value: string): boolean {
  return !value.trim() || value.trim().toLowerCase() === "unknown";
}

function isGenericEmail(email: string): boolean {
  return isGenericEmailLocalPart(email);
}

function isCompanyLinkedInUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.pathname.toLowerCase().includes("/company/");
  } catch {
    return false;
  }
}

function tokenizeDecisionMakerName(decisionMaker: string): string[] {
  const withoutTitle = decisionMaker.split(",")[0] ?? decisionMaker;
  return withoutTitle
    .toLowerCase()
    .split(/[\s-]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function hasNameProximity(content: string, index: number, nameTokens: string[]): boolean {
  if (nameTokens.length === 0) {
    return false;
  }

  const start = Math.max(0, index - PROXIMITY_WINDOW_CHARS);
  const window = content.slice(start, index).toLowerCase();
  return nameTokens.some((token) => window.includes(token));
}

function collectProximityMatches(
  content: string,
  nameTokens: string[],
  pattern: RegExp,
  mapValue: (match: RegExpExecArray) => string | null,
): string[] {
  const matches: string[] = [];
  const regex = new RegExp(pattern.source, pattern.flags);

  for (let match = regex.exec(content); match; match = regex.exec(content)) {
    const value = mapValue(match);

    if (!value) {
      continue;
    }

    const index = match.index ?? 0;

    if (hasNameProximity(content, index, nameTokens)) {
      matches.push(value);
    }
  }

  return matches;
}

function sanitizeDecisionMakerSemanticRules(
  profile: ExtractedCompany,
): ExtractedCompany {
  let decisionMakerEmail = profile.decisionMakerEmail;
  let decisionMakerPhone = profile.decisionMakerPhone;
  let decisionMakerLinkedInUrl = profile.decisionMakerLinkedInUrl;

  if (decisionMakerEmail) {
    decisionMakerEmail = validatePersonalEmail(decisionMakerEmail, profile.email);
  }

  if (decisionMakerLinkedInUrl) {
    const url = decisionMakerLinkedInUrl.trim();

    if (!isPersonalLinkedInUrl(url)) {
      decisionMakerLinkedInUrl = null;
    } else if (
      profile.linkedInUrl &&
      isCompanyLinkedInUrl(profile.linkedInUrl) &&
      url === profile.linkedInUrl.trim()
    ) {
      decisionMakerLinkedInUrl = null;
    }
  }

  if (decisionMakerPhone && profile.phone) {
    if (
      normalizePhoneDigits(decisionMakerPhone) === normalizePhoneDigits(profile.phone)
    ) {
      decisionMakerPhone = null;
    }
  }

  return {
    ...profile,
    decisionMakerEmail,
    decisionMakerPhone,
    decisionMakerLinkedInUrl,
  };
}

export function sanitizeLeadContacts(profile: ExtractedCompany): ExtractedCompany {
  const withValidatedFormats: ExtractedCompany = {
    ...profile,
    email: validateEmail(profile.email),
    phone: validatePhone(profile.phone),
    decisionMakerEmail: validateEmail(profile.decisionMakerEmail),
    decisionMakerPhone: validatePhone(profile.decisionMakerPhone),
  };

  return sanitizeDecisionMakerSemanticRules(withValidatedFormats);
}

export function hasDecisionMakerPersonalContactGaps(profile: ExtractedCompany): boolean {
  if (isUnknown(profile.decisionMaker)) {
    return true;
  }

  return !(
    profile.decisionMakerEmail?.trim() ||
    profile.decisionMakerPhone?.trim() ||
    profile.decisionMakerLinkedInUrl?.trim()
  );
}

export function extractDecisionMakerContactsFromHtml(
  html: string,
  decisionMakerName: string,
): DecisionMakerContactHints {
  if (isUnknown(decisionMakerName)) {
    return { email: null, linkedInUrl: null };
  }

  const nameTokens = tokenizeDecisionMakerName(decisionMakerName);
  const content = html;

  const emails = collectProximityMatches(content, nameTokens, MAILTO_PATTERN, (match) =>
    match[1]?.trim().toLowerCase() ?? null,
  );

  const linkedInUrls = collectProximityMatches(
    content,
    nameTokens,
    LINKEDIN_IN_PATTERN,
    (match) => match[0]?.trim() ?? null,
  );

  const rawEmail =
    emails.find((candidate) => candidate && !isGenericEmail(candidate)) ?? null;
  const linkedInUrl = linkedInUrls[0] ?? null;

  return {
    email: validateEmail(rawEmail),
    linkedInUrl,
  };
}

export function mergeDecisionMakerContactHints(
  hintsList: DecisionMakerContactHints[],
): DecisionMakerContactHints {
  let email: string | null = null;
  let linkedInUrl: string | null = null;

  for (const hints of hintsList) {
    if (!email && hints.email) {
      email = hints.email;
    }

    if (!linkedInUrl && hints.linkedInUrl) {
      linkedInUrl = hints.linkedInUrl;
    }
  }

  return { email, linkedInUrl };
}

export function applyDecisionMakerContactHints(
  profile: ExtractedCompany,
  hints: DecisionMakerContactHints,
): ExtractedCompany {
  return {
    ...profile,
    decisionMakerEmail: profile.decisionMakerEmail ?? hints.email,
    decisionMakerLinkedInUrl: profile.decisionMakerLinkedInUrl ?? hints.linkedInUrl,
  };
}

export function enrichProfileWithDecisionMakerContacts(
  profile: ExtractedCompany,
  htmlPages: string[],
): ExtractedCompany {
  if (isUnknown(profile.decisionMaker)) {
    return sanitizeLeadContacts(profile);
  }

  const hintsList = htmlPages.map((html) =>
    extractDecisionMakerContactsFromHtml(html, profile.decisionMaker),
  );

  const mergedHints = mergeDecisionMakerContactHints(hintsList);
  const withHints = applyDecisionMakerContactHints(profile, mergedHints);

  return sanitizeLeadContacts(withHints);
}
