import { describe, expect, it } from "vitest";
import type { ExtractedCompany } from "@/types/agents/company-extraction.types.js";
import {
  getRecipientMissingContactMessage,
  resolveRecipientForChannel,
} from "@/services/domain/outreach/recipient-resolver.service.js";

const baseProfile: ExtractedCompany = {
  companyName: "Acme",
  website: "https://acme.com",
  industry: "SaaS",
  description: "Test",
  products: [],
  services: [],
  targetCustomers: [],
  estimatedCompanySize: "50",
  revenue: null,
  location: "US",
  decisionMaker: "Jane Doe",
  decisionMakerEmail: "jane@acme.com",
  decisionMakerPhone: "+15551234567",
  decisionMakerLinkedInUrl: "https://linkedin.com/in/janedoe",
  linkedInUrl: "https://linkedin.com/company/acme",
  xUrl: null,
  email: "info@acme.com",
  phone: "+15559876543",
};

describe("resolveRecipientForChannel", () => {
  it("resolves email from decision maker first", () => {
    const resolved = resolveRecipientForChannel(baseProfile, "EMAIL");
    expect(resolved?.toAddress).toBe("jane@acme.com");
  });

  it("resolves WhatsApp phone in E.164", () => {
    const resolved = resolveRecipientForChannel(baseProfile, "WHATSAPP");
    expect(resolved?.toAddress).toBe("+15551234567");
  });

  it("resolves LinkedIn personal profile only", () => {
    const resolved = resolveRecipientForChannel(baseProfile, "LINKEDIN");
    expect(resolved?.toAddress).toBe("https://linkedin.com/in/janedoe");
  });

  it("returns null when channel contact is missing", () => {
    const profile = {
      ...baseProfile,
      decisionMakerLinkedInUrl: null,
    };
    expect(resolveRecipientForChannel(profile, "LINKEDIN")).toBeNull();
  });

  it("builds channel-specific error messages", () => {
    expect(getRecipientMissingContactMessage("WHATSAPP", "acme.com")).toContain("phone");
  });
});
