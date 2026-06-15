import { Resend } from "resend";
import { getOutreachConfig } from "@/lib/config/outreach.config.js";
import type {
  OutreachDeliveryPort,
  SendOutreachInput,
  SendOutreachResult,
} from "@/services/infrastructure/outreach/outreach-delivery.port.js";

export class ResendOutreachAdapter implements OutreachDeliveryPort {
  private readonly client: Resend;
  private readonly fromEmail: string;
  private readonly fromName: string;

  constructor() {
    const config = getOutreachConfig();
    this.client = new Resend(config.resendApiKey);
    this.fromEmail = config.fromEmail;
    this.fromName = config.fromName;
  }

  async send(input: SendOutreachInput): Promise<SendOutreachResult> {
    const subject = input.subject?.trim() ?? "Outreach";
    const bodyHtml = input.bodyHtml?.trim() ?? input.bodyText;

    const response = await this.client.emails.send({
      from: `${this.fromName} <${this.fromEmail}>`,
      to: input.toName ? `${input.toName} <${input.toAddress}>` : input.toAddress,
      subject,
      html: bodyHtml,
      text: input.bodyText,
      tags: input.tags
        ? Object.entries(input.tags).map(([name, value]) => ({ name, value }))
        : undefined,
    });

    if (response.error || !response.data?.id) {
      throw new Error(response.error?.message ?? "Resend send failed");
    }

    return { providerId: response.data.id };
  }
}

let cachedAdapter: ResendOutreachAdapter | undefined;

export function getResendOutreachAdapter(): ResendOutreachAdapter {
  if (!cachedAdapter) {
    cachedAdapter = new ResendOutreachAdapter();
  }

  return cachedAdapter;
}
