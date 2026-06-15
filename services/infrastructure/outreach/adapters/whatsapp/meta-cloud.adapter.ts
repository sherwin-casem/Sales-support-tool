import { getOutreachConfig } from "@/lib/config/outreach.config.js";
import type { WhatsAppProviderPort } from "@/services/infrastructure/outreach/adapters/whatsapp/whatsapp-delivery.port.js";

const GRAPH_API_VERSION = "v21.0";

export class MetaCloudWhatsAppProvider implements WhatsAppProviderPort {
  private readonly accessToken: string;
  private readonly phoneNumberId: string;

  constructor() {
    const config = getOutreachConfig();
    this.accessToken = config.whatsappAccessToken;
    this.phoneNumberId = config.whatsappPhoneNumberId;
  }

  async sendTemplateMessage(input: {
    toPhoneE164: string;
    templateName: string;
    languageCode: string;
    bodyParameters: string[];
  }): Promise<{ messageId: string; metadata?: Record<string, string> }> {
    const to = input.toPhoneE164.replace(/^\+/, "");

    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${this.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "template",
          template: {
            name: input.templateName,
            language: { code: input.languageCode },
            components: [
              {
                type: "body",
                parameters: input.bodyParameters.map((text) => ({ type: "text", text })),
              },
            ],
          },
        }),
      },
    );

    const payload = (await response.json()) as {
      messages?: Array<{ id: string }>;
      error?: { message?: string };
    };

    if (!response.ok || !payload.messages?.[0]?.id) {
      throw new Error(payload.error?.message ?? "WhatsApp template send failed");
    }

    return {
      messageId: payload.messages[0].id,
      metadata: { templateName: input.templateName },
    };
  }

  async sendSessionMessage(input: {
    toPhoneE164: string;
    bodyText: string;
  }): Promise<{ messageId: string; metadata?: Record<string, string> }> {
    const to = input.toPhoneE164.replace(/^\+/, "");

    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${this.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { body: input.bodyText },
        }),
      },
    );

    const payload = (await response.json()) as {
      messages?: Array<{ id: string }>;
      error?: { message?: string };
    };

    if (!response.ok || !payload.messages?.[0]?.id) {
      throw new Error(payload.error?.message ?? "WhatsApp session send failed");
    }

    return { messageId: payload.messages[0].id };
  }
}
