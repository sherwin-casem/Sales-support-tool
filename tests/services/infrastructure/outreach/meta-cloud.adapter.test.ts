import { describe, expect, it, vi, beforeEach } from "vitest";
import { MetaCloudWhatsAppProvider } from "@/services/infrastructure/outreach/adapters/whatsapp/meta-cloud.adapter.js";

describe("MetaCloudWhatsAppProvider", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ messages: [{ id: "wamid.test" }] }),
      }),
    );
  });

  it("sends template message via Graph API", async () => {
    const provider = new MetaCloudWhatsAppProvider();

    const result = await provider.sendTemplateMessage({
      toPhoneE164: "+15551234567",
      templateName: "hello_world",
      languageCode: "en_US",
      bodyParameters: ["Hi there"],
    });

    expect(result.messageId).toBe("wamid.test");
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/messages"),
      expect.objectContaining({ method: "POST" }),
    );
  });
});
