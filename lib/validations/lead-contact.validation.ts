import { z } from "zod";

const PLACEHOLDER_EMAIL_DOMAINS = new Set([
  "example.com",
  "example.org",
  "example.net",
  "test.com",
  "domain.com",
  "email.com",
  "sample.com",
  "localhost",
  "invalid.com",
  "test.test",
]);

const GENERIC_EMAIL_LOCAL_PARTS = new Set([
  "info",
  "sales",
  "contact",
  "hello",
  "support",
  "admin",
  "office",
  "team",
  "marketing",
  "hr",
  "careers",
  "press",
  "media",
  "billing",
  "service",
  "customerservice",
  "enquiries",
  "inquiries",
  "noreply",
  "no-reply",
  "donotreply",
  "postmaster",
  "webmaster",
]);

const PHONE_ALLOWED_CHARS = /^[+()\d\s.-]+$/;
const MIN_PHONE_DIGITS = 7;
const MAX_PHONE_DIGITS = 15;
const MIN_NATIONAL_DIGITS = 6;
const MAX_NATIONAL_DIGITS = 12;

const PLACEHOLDER_PHONE_DIGITS = new Set([
  "1234567",
  "12345678",
  "123456789",
  "1234567890",
  "0123456789",
  "9876543210",
  "1111111",
  "2222222",
  "9999999",
  "0000000",
]);

/** Longest-prefix match first for E.164 splitting. */
const DIAL_CODES = [
  "358",
  "351",
  "352",
  "353",
  "354",
  "355",
  "356",
  "357",
  "359",
  "370",
  "371",
  "372",
  "373",
  "374",
  "375",
  "376",
  "377",
  "378",
  "380",
  "381",
  "382",
  "383",
  "385",
  "386",
  "387",
  "389",
  "420",
  "421",
  "423",
  "44",
  "45",
  "46",
  "47",
  "48",
  "49",
  "33",
  "34",
  "36",
  "39",
  "40",
  "41",
  "43",
  "30",
  "31",
  "32",
  "20",
  "27",
  "51",
  "52",
  "53",
  "54",
  "55",
  "56",
  "57",
  "58",
  "60",
  "61",
  "62",
  "63",
  "64",
  "65",
  "66",
  "81",
  "82",
  "84",
  "86",
  "90",
  "91",
  "92",
  "93",
  "94",
  "95",
  "98",
  "1",
  "7",
] as const;

export function normalizePhoneDigits(value: string): string {
  const trimmed = value.trim();

  if (trimmed.startsWith("+")) {
    return `+${trimmed.slice(1).replace(/\D/g, "")}`;
  }

  return trimmed.replace(/\D/g, "");
}

function countPhoneDigits(value: string): number {
  return value.replace(/\D/g, "").length;
}

function hasAllIdenticalDigits(digits: string): boolean {
  const normalized = digits.replace(/\D/g, "");

  if (normalized.length === 0) {
    return false;
  }

  return normalized.split("").every((digit) => digit === normalized[0]);
}

function isSequentialDigits(digits: string): boolean {
  if (digits.length < MIN_PHONE_DIGITS) {
    return false;
  }

  let ascending = true;
  let descending = true;

  for (let index = 1; index < digits.length; index += 1) {
    const diff = Number(digits[index]) - Number(digits[index - 1]);

    if (diff !== 1) {
      ascending = false;
    }

    if (diff !== -1) {
      descending = false;
    }
  }

  return ascending || descending;
}

function isRepeatingPairPattern(digits: string): boolean {
  if (digits.length < 8 || digits.length % 2 !== 0) {
    return false;
  }

  const pair = digits.slice(0, 2);

  for (let index = 2; index < digits.length; index += 2) {
    if (digits.slice(index, index + 2) !== pair) {
      return false;
    }
  }

  return true;
}

function isUsFictional555(digits: string): boolean {
  const normalized = digits.replace(/\D/g, "");

  if (normalized.startsWith("55501")) {
    return true;
  }

  if (normalized.startsWith("155501")) {
    return true;
  }

  return false;
}

function isPlaceholderPhoneDigits(digits: string): boolean {
  const normalized = digits.replace(/\D/g, "");

  if (!normalized) {
    return true;
  }

  if (PLACEHOLDER_PHONE_DIGITS.has(normalized)) {
    return true;
  }

  if (hasAllIdenticalDigits(normalized)) {
    return true;
  }

  if (isSequentialDigits(normalized)) {
    return true;
  }

  if (isRepeatingPairPattern(normalized)) {
    return true;
  }

  if (isUsFictional555(normalized)) {
    return true;
  }

  return false;
}

function splitE164Digits(digits: string): { countryCode: string; national: string } | null {
  const normalized = digits.replace(/\D/g, "");

  if (!normalized) {
    return null;
  }

  for (const dialCode of DIAL_CODES) {
    if (normalized.startsWith(dialCode)) {
      const national = normalized.slice(dialCode.length);

      if (
        national.length >= MIN_NATIONAL_DIGITS &&
        national.length <= MAX_NATIONAL_DIGITS
      ) {
        return { countryCode: dialCode, national };
      }
    }
  }

  return null;
}

function formatNationalNumber(countryCode: string, national: string): string {
  if (countryCode === "358" && national.length === 9) {
    return `${national.slice(0, 2)} ${national.slice(2, 5)} ${national.slice(5)}`;
  }

  if (countryCode === "1" && national.length === 10) {
    return `(${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6)}`;
  }

  const groups = national.match(/.{1,3}/g) ?? [national];
  return groups.join(" ");
}

/** Formats compact E.164 numbers for readable display; preserves existing formatting. */
export function formatPhoneForDisplay(value: string): string {
  const trimmed = value.trim();

  if (/[\s().-]/.test(trimmed)) {
    return trimmed.replace(/\s+/g, " ");
  }

  const digits = trimmed.replace(/\D/g, "");

  if (digits.length < MIN_PHONE_DIGITS) {
    return trimmed;
  }

  const e164 = splitE164Digits(digits);

  if (e164) {
    return `+${e164.countryCode} ${formatNationalNumber(e164.countryCode, e164.national)}`;
  }

  if (trimmed.startsWith("+")) {
    return trimmed;
  }

  const groups = digits.match(/.{1,3}/g) ?? [digits];
  return groups.join(" ");
}

export function normalizePhoneHref(phone: string): string {
  return normalizePhoneDigits(phone);
}

export function isGenericEmailLocalPart(email: string): boolean {
  const localPart = email.split("@")[0]?.trim().toLowerCase() ?? "";
  return GENERIC_EMAIL_LOCAL_PARTS.has(localPart);
}

export function validateEmail(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const atCount = (trimmed.match(/@/g) ?? []).length;

  if (atCount !== 1) {
    return null;
  }

  const [localPart, domainPart] = trimmed.split("@");

  if (!localPart?.trim() || !domainPart?.trim()) {
    return null;
  }

  const normalized = `${localPart.trim().toLowerCase()}@${domainPart.trim().toLowerCase()}`;
  const parsed = z.string().email().safeParse(normalized);

  if (!parsed.success) {
    return null;
  }

  const domain = normalized.split("@")[1] ?? "";

  if (PLACEHOLDER_EMAIL_DOMAINS.has(domain)) {
    return null;
  }

  return normalized;
}

/** Validates a decision-maker personal email; rejects generic inboxes and company duplicates. */
export function validatePersonalEmail(
  value: string | null | undefined,
  companyEmail?: string | null,
): string | null {
  const validated = validateEmail(value);

  if (!validated) {
    return null;
  }

  if (isGenericEmailLocalPart(validated)) {
    return null;
  }

  const normalizedCompanyEmail = validateEmail(companyEmail);

  if (normalizedCompanyEmail && validated === normalizedCompanyEmail) {
    return null;
  }

  return validated;
}

export function validatePhone(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (!PHONE_ALLOWED_CHARS.test(trimmed)) {
    return null;
  }

  const digitCount = countPhoneDigits(trimmed);

  if (digitCount < MIN_PHONE_DIGITS || digitCount > MAX_PHONE_DIGITS) {
    return null;
  }

  const digitsOnly = trimmed.replace(/\D/g, "");

  if (isPlaceholderPhoneDigits(digitsOnly)) {
    return null;
  }

  const compactInternational = trimmed.startsWith("+") ? splitE164Digits(digitsOnly) : null;

  if (trimmed.startsWith("+") && !compactInternational) {
    return null;
  }

  if (!trimmed.startsWith("+") && digitCount > 11) {
    return null;
  }

  return formatPhoneForDisplay(trimmed);
}

/** Normalizes a validated phone to compact E.164 (+digits) for WhatsApp/API delivery. */
export function normalizeToE164Phone(value: string | null | undefined): string | null {
  const validated = validatePhone(value);

  if (!validated) {
    return null;
  }

  const digits = normalizePhoneDigits(validated);

  if (!digits) {
    return null;
  }

  return digits.startsWith("+") ? digits : `+${digits}`;
}
