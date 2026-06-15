import type { OutreachChannel } from "@prisma/client";

export interface SendOutreachInput {
  channel: OutreachChannel;
  toAddress: string;
  toName?: string | null;
  subject?: string | null;
  bodyText: string;
  bodyHtml?: string | null;
  tags?: Record<string, string>;
  metadata?: Record<string, string>;
}

export interface SendOutreachResult {
  providerId: string;
  metadata?: Record<string, string>;
}

export interface OutreachDeliveryPort {
  send(input: SendOutreachInput): Promise<SendOutreachResult>;
}
