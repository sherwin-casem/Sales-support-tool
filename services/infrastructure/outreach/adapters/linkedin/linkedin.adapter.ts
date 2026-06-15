import type {
  OutreachDeliveryPort,
  SendOutreachInput,
  SendOutreachResult,
} from "@/services/infrastructure/outreach/outreach-delivery.port.js";
import { UnipileLinkedInProvider } from "@/services/infrastructure/outreach/adapters/linkedin/unipile.adapter.js";
import type { LinkedInProviderPort } from "@/services/infrastructure/outreach/adapters/linkedin/linkedin-delivery.port.js";

export class LinkedInOutreachAdapter implements OutreachDeliveryPort {
  constructor(private readonly provider: LinkedInProviderPort = new UnipileLinkedInProvider()) {}

  async send(input: SendOutreachInput): Promise<SendOutreachResult> {
    const result = await this.provider.sendMessage({
      profileUrl: input.toAddress,
      bodyText: input.bodyText,
      recipientName: input.toName,
    });

    return {
      providerId: result.messageId,
      metadata: result.metadata,
    };
  }
}

let cachedAdapter: LinkedInOutreachAdapter | undefined;

export function getLinkedInOutreachAdapter(): LinkedInOutreachAdapter {
  if (!cachedAdapter) {
    cachedAdapter = new LinkedInOutreachAdapter();
  }

  return cachedAdapter;
}
