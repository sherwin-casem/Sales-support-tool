import { Resend } from "resend";
import { getOutreachConfig } from "@/lib/config/outreach.config.js";
import type {
  EmailDeliveryPort,
  SendEmailInput,
  SendEmailResult,
} from "@/services/infrastructure/email/email-delivery.port.js";

export class ResendEmailAdapter implements EmailDeliveryPort {
  private readonly client: Resend;
  private readonly fromEmail: string;
  private readonly fromName: string;

  constructor() {
    const config = getOutreachConfig();
    this.client = new Resend(config.resendApiKey);
    this.fromEmail = config.fromEmail;
    this.fromName = config.fromName;
  }

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const response = await this.client.emails.send({
      from: `${this.fromName} <${this.fromEmail}>`,
      to: input.toName ? `${input.toName} <${input.to}>` : input.to,
      subject: input.subject,
      html: input.bodyHtml,
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

let cachedAdapter: ResendEmailAdapter | undefined;

export function getResendEmailAdapter(): ResendEmailAdapter {
  if (!cachedAdapter) {
    cachedAdapter = new ResendEmailAdapter();
  }

  return cachedAdapter;
}
