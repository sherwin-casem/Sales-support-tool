import { getOutreachConfig } from "@/lib/config/outreach.config.js";
import type {
  OutreachDeliveryPort,
  SendOutreachInput,
  SendOutreachResult,
} from "@/services/infrastructure/outreach/outreach-delivery.port.js";
import { MetaCloudWhatsAppProvider } from "@/services/infrastructure/outreach/adapters/whatsapp/meta-cloud.adapter.js";
import type { WhatsAppProviderPort } from "@/services/infrastructure/outreach/adapters/whatsapp/whatsapp-delivery.port.js";

export class WhatsAppOutreachAdapter implements OutreachDeliveryPort {
  constructor(private readonly provider: WhatsAppProviderPort = new MetaCloudWhatsAppProvider()) {}

  async send(input: SendOutreachInput): Promise<SendOutreachResult> {
    const config = getOutreachConfig();
    const toPhoneE164 = input.toAddress.startsWith("+")
      ? input.toAddress
      : `+${input.toAddress.replace(/\D/g, "")}`;

    const templateName =
      input.metadata?.templateName?.trim() || config.whatsappDefaultTemplate.trim();

    if (templateName) {
      const result = await this.provider.sendTemplateMessage({
        toPhoneE164,
        templateName,
        languageCode: config.whatsappTemplateLanguage,
        bodyParameters: [input.bodyText],
      });

      return {
        providerId: result.messageId,
        metadata: result.metadata,
      };
    }

    const result = await this.provider.sendSessionMessage({
      toPhoneE164,
      bodyText: input.bodyText,
    });

    return { providerId: result.messageId };
  }
}

let cachedAdapter: WhatsAppOutreachAdapter | undefined;

export function getWhatsAppOutreachAdapter(): WhatsAppOutreachAdapter {
  if (!cachedAdapter) {
    cachedAdapter = new WhatsAppOutreachAdapter();
  }

  return cachedAdapter;
}
