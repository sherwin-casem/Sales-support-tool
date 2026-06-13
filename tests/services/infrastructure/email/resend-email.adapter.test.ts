import { describe, expect, it, vi } from "vitest";
import { ResendEmailAdapter } from "@/services/infrastructure/email/resend-email.adapter.js";

describe("ResendEmailAdapter", () => {
  it("returns provider id on successful send", async () => {
    const send = vi.fn().mockResolvedValue({
      data: { id: "email_123" },
      error: null,
    });

    vi.spyOn(
      await import("@/lib/config/outreach.config.js"),
      "getOutreachConfig",
    ).mockReturnValue({
      fromEmail: "sales@parijat.com",
      fromName: "Parijat Sales",
      sendRatePerMinute: 50,
      resendApiKey: "re_test",
      resendWebhookSecret: "",
      cronSecret: "",
      refreshBatchSize: 10,
      refreshConcurrency: 2,
    });

    const adapter = new ResendEmailAdapter();
    Object.assign(adapter, {
      client: { emails: { send } },
      fromEmail: "sales@parijat.com",
      fromName: "Parijat Sales",
    });

    const result = await adapter.send({
      to: "lead@acme.fi",
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

    vi.spyOn(
      await import("@/lib/config/outreach.config.js"),
      "getOutreachConfig",
    ).mockReturnValue({
      fromEmail: "sales@parijat.com",
      fromName: "Parijat Sales",
      sendRatePerMinute: 50,
      resendApiKey: "re_test",
      resendWebhookSecret: "",
      cronSecret: "",
      refreshBatchSize: 10,
      refreshConcurrency: 2,
    });

    const adapter = new ResendEmailAdapter();
    Object.assign(adapter, {
      client: { emails: { send } },
      fromEmail: "sales@parijat.com",
      fromName: "Parijat Sales",
    });

    await expect(
      adapter.send({
        to: "lead@acme.fi",
        subject: "Hello",
        bodyHtml: "<p>Hello</p>",
        bodyText: "Hello",
      }),
    ).rejects.toThrow("Invalid API key");
  });
});
