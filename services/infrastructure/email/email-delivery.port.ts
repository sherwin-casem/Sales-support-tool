export interface SendEmailInput {
  to: string;
  toName?: string | null;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  tags?: Record<string, string>;
}

export interface SendEmailResult {
  providerId: string;
}

export interface EmailDeliveryPort {
  send(input: SendEmailInput): Promise<SendEmailResult>;
}
