import { Resend } from "resend";
import { getOutreachConfig } from "@/lib/config/outreach.config.js";
import type {
  EmailDeliveryPort,
  SendEmailInput,
  SendEmailResult,
} from "@/services/infrastructure/email/email-delivery.port.js";
import { getResendOutreachAdapter } from "@/services/infrastructure/outreach/adapters/resend.adapter.js";

/** @deprecated Use getResendOutreachAdapter from outreach adapters. */
export class ResendEmailAdapter implements EmailDeliveryPort {
  private readonly delegate = getResendOutreachAdapter();

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const result = await this.delegate.send({
      channel: "EMAIL",
      toAddress: input.to,
      toName: input.toName,
      subject: input.subject,
      bodyHtml: input.bodyHtml,
      bodyText: input.bodyText,
      tags: input.tags,
    });

    return { providerId: result.providerId };
  }
}

let cachedAdapter: ResendEmailAdapter | undefined;

export function getResendEmailAdapter(): ResendEmailAdapter {
  if (!cachedAdapter) {
    cachedAdapter = new ResendEmailAdapter();
  }

  return cachedAdapter;
}

export { Resend };
