export const BUSINESS_KEYWORD_PATTERN =
  /\b(\d{2,5}\+?\s*(employees|staff|people|team members)|contact|email|phone|address|headquarters|hq|founded|established|since\s+\d{4}|services|products|solutions|logistics|warehousing|freight)\b/i;

export const EMAIL_PATTERN = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;

export const PHONE_PATTERN = /\+?\d[\d\s().-]{7,}\d/;

export function containsBusinessSignals(text: string): boolean {
  const normalized = text.replace(/\s+/g, " ").trim();

  if (normalized.length < 20) {
    return false;
  }

  return (
    BUSINESS_KEYWORD_PATTERN.test(normalized) ||
    EMAIL_PATTERN.test(normalized) ||
    PHONE_PATTERN.test(normalized)
  );
}

export function matchesBoilerplatePattern(value: string): boolean {
  const normalized = value.toLowerCase();
  return BOILERPLATE_TOKENS.some((token) => normalized.includes(token));
}

const BOILERPLATE_TOKENS = [
  "nav",
  "navbar",
  "menu",
  "breadcrumb",
  "cookie",
  "consent",
  "gdpr",
  "sidebar",
  "social",
  "share",
  "advert",
  "pagination",
  "footer",
  "header",
];
