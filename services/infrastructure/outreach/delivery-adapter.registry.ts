import type { OutreachChannel } from "@prisma/client";
import { getLinkedInOutreachAdapter } from "@/services/infrastructure/outreach/adapters/linkedin/linkedin.adapter.js";
import { getResendOutreachAdapter } from "@/services/infrastructure/outreach/adapters/resend.adapter.js";
import { getWhatsAppOutreachAdapter } from "@/services/infrastructure/outreach/adapters/whatsapp/whatsapp.adapter.js";
import type { OutreachDeliveryPort } from "@/services/infrastructure/outreach/outreach-delivery.port.js";

export function getDeliveryAdapter(channel: OutreachChannel): OutreachDeliveryPort {
  switch (channel) {
    case "EMAIL":
      return getResendOutreachAdapter();
    case "WHATSAPP":
      return getWhatsAppOutreachAdapter();
    case "LINKEDIN":
      return getLinkedInOutreachAdapter();
    default:
      throw new Error(`Unsupported outreach channel: ${channel}`);
  }
}
