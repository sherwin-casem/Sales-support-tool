import type {
  EmailDeliveryPort,
  SendEmailInput,
  SendEmailResult,
} from "@/services/infrastructure/email/email-delivery.port.js";

/** Phase 2 stub — WhatsApp Business API adapter (not yet implemented). */
export class WhatsAppDeliveryAdapter implements EmailDeliveryPort {
  async send(_input: SendEmailInput): Promise<SendEmailResult> {
    throw new Error(
      "WhatsApp outreach is deferred to Phase 2. Use EMAIL channel for now.",
    );
  }
}
