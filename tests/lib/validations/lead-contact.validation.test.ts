import { describe, expect, it } from "vitest";
import {
  formatPhoneForDisplay,
  normalizePhoneDigits,
  normalizePhoneHref,
  validateEmail,
  validatePersonalEmail,
  validatePhone,
} from "@/lib/validations/lead-contact.validation.js";

describe("lead-contact.validation", () => {
  describe("validateEmail", () => {
    it("accepts valid company and personal emails", () => {
      expect(validateEmail("info@acme.fi")).toBe("info@acme.fi");
      expect(validateEmail(" Jane.Doe@Acme.FI ")).toBe("jane.doe@acme.fi");
    });

    it("rejects malformed and placeholder emails", () => {
      expect(validateEmail("not-an-email")).toBeNull();
      expect(validateEmail("@missing.com")).toBeNull();
      expect(validateEmail("user@")).toBeNull();
      expect(validateEmail("user@example.com")).toBeNull();
      expect(validateEmail("user@test.com")).toBeNull();
      expect(validateEmail(null)).toBeNull();
      expect(validateEmail("")).toBeNull();
    });
  });

  describe("validatePersonalEmail", () => {
    it("rejects generic inboxes and company duplicates", () => {
      expect(validatePersonalEmail("info@acme.fi")).toBeNull();
      expect(validatePersonalEmail("jane.doe@acme.fi", "info@acme.fi")).toBe(
        "jane.doe@acme.fi",
      );
      expect(validatePersonalEmail("info@acme.fi", "info@acme.fi")).toBeNull();
    });
  });

  describe("validatePhone", () => {
    it("accepts valid international phone numbers", () => {
      expect(validatePhone("+358 9 123 4567")).toBe("+358 9 123 4567");
      expect(validatePhone("(555) 123-4567")).toBe("(555) 123-4567");
    });

    it("formats compact E.164 numbers for display", () => {
      expect(formatPhoneForDisplay("+358401234567")).toBe("+358 40 123 4567");
      expect(validatePhone("+358401234567")).toBe("+358 40 123 4567");
      expect(validatePhone("+358912345678")).toBe("+358 91 234 5678");
    });

    it("rejects too-short, too-long, and junk phone values", () => {
      expect(validatePhone("12345")).toBeNull();
      expect(validatePhone("0000000")).toBeNull();
      expect(validatePhone("1111111111")).toBeNull();
      expect(validatePhone("call us today")).toBeNull();
      expect(validatePhone(null)).toBeNull();
      expect(validatePhone("")).toBeNull();
    });

    it("rejects placeholder and sequential phone patterns", () => {
      expect(validatePhone("1234567890")).toBeNull();
      expect(validatePhone("123 456 7890")).toBeNull();
      expect(validatePhone("0123456789")).toBeNull();
      expect(validatePhone("9876543210")).toBeNull();
      expect(validatePhone("1212121212")).toBeNull();
      expect(validatePhone("555-0100")).toBeNull();
      expect(validatePhone("+15550100")).toBeNull();
    });

    it("rejects international numbers with invalid country/national split", () => {
      expect(validatePhone("+1234")).toBeNull();
      expect(validatePhone("+1234567890123456")).toBeNull();
    });
  });

  describe("normalizePhoneDigits", () => {
    it("strips formatting characters", () => {
      expect(normalizePhoneDigits("+358 (9) 123-4567")).toBe("+35891234567");
    });
  });

  describe("normalizePhoneHref", () => {
    it("produces tel-safe href values", () => {
      expect(normalizePhoneHref("+358 40 123 4567")).toBe("+358401234567");
    });
  });
});
