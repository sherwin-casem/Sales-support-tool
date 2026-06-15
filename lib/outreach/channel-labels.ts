export type OutreachChannelValue = "EMAIL" | "WHATSAPP" | "LINKEDIN";

export const OUTREACH_CHANNELS: Array<{ value: OutreachChannelValue; label: string }> = [
  { value: "EMAIL", label: "Email" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "LINKEDIN", label: "LinkedIn" },
];

export function channelLabel(channel: string): string {
  return OUTREACH_CHANNELS.find((item) => item.value === channel)?.label ?? channel;
}

export function engagementLabel(channel: string): string {
  switch (channel) {
    case "WHATSAPP":
      return "Read";
    case "LINKEDIN":
      return "Opened";
    default:
      return "Opened";
  }
}
