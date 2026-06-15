export interface LinkedInProviderPort {
  sendMessage(input: {
    profileUrl: string;
    bodyText: string;
    recipientName?: string | null;
  }): Promise<{ messageId: string; metadata?: Record<string, string> }>;
}
