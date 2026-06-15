export interface WhatsAppTemplateComponent {
  type: "body";
  parameters: Array<{ type: "text"; text: string }>;
}

export interface WhatsAppProviderPort {
  sendTemplateMessage(input: {
    toPhoneE164: string;
    templateName: string;
    languageCode: string;
    bodyParameters: string[];
  }): Promise<{ messageId: string; metadata?: Record<string, string> }>;

  sendSessionMessage(input: {
    toPhoneE164: string;
    bodyText: string;
  }): Promise<{ messageId: string; metadata?: Record<string, string> }>;
}
