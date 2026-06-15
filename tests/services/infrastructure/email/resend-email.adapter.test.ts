import { describe, expect, it, vi } from "vitest";
import { ResendOutreachAdapter } from "@/services/infrastructure/outreach/adapters/resend.adapter.js";

const baseConfig = {
  fromEmail: "sales@parijat.com",
  fromName: "Parijat Sales",
  sendRatePerMinute: 50,
  emailRatePerMinute: 50,
  whatsappRatePerMinute: 20,
  linkedInRatePerMinute: 10,
  resendApiKey: "re_test",
  resendWebhookSecret: "",
  whatsappAccessToken: "",
  whatsappPhoneNumberId: "",
  unipileApiKey: "",
  unipileAccountId: "",
  cronSecret: "",
  refreshBatchSize: 10,
  refreshConcurrency: 2,
};

describe("ResendOutreachAdapter", () => {
  it("returns provider id on successful send", async () => {
    const send = vi.fn().mockResolvedValue({
      data: { id: "email_123" },
      error: null,
    });

    vi.spyOn(await import("@/lib/config/outreach.config.js"), "getOutreachConfig").mockReturnValue(
      baseConfig,
    );

    const adapter = new ResendOutreachAdapter();
    Object.assign(adapter, {
      client: { emails: { send } },
      fromEmail: "sales@parijat.com",
      fromName: "Parijat Sales",
    });

    const result = await adapter.send({
      channel: "EMAIL",
      toAddress: "lead@acme.fi",
      toName: "Lead",
      subject: "Hello",
      bodyHtml: "<p>Hello</p>",
      bodyText: "Hello",
    });

    expect(result.providerId).toBe("email_123");
    expect(send).toHaveBeenCalled();
  });

  it("throws when Resend returns an error", async () => {
    const send = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "Invalid API key" },
    });

    vi.spyOn(await import("@/lib/config/outreach.config.js"), "getOutreachConfig").mockReturnValue(
      baseConfig,
    );

    const adapter = new ResendOutreachAdapter();
    Object.assign(adapter, {
      client: { emails: { send } },
      fromEmail: "sales@parijat.com",
      fromName: "Parijat Sales",
    });

    await expect(
      adapter.send({
        channel: "EMAIL",
        toAddress: "lead@acme.fi",
        subject: "Hello",
        bodyHtml: "<p>Hello</p>",
        bodyText: "Hello",
      }),
    ).rejects.toThrow("Invalid API key");
  });
});
