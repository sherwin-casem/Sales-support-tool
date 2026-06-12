import type {
  EmailDeliveryPort,
  SendEmailInput,
  SendEmailResult,
} from "@/services/infrastructure/email/email-delivery.port.js";

/** Phase 2 stub — LinkedIn automation adapter (manual copy in UI for now). */
export class LinkedInOutreachAdapter implements EmailDeliveryPort {
  async send(_input: SendEmailInput): Promise<SendEmailResult> {
    throw new Error(
      "LinkedIn automation is deferred to Phase 2. Use copy-to-clipboard in the UI.",
    );
  }
}
