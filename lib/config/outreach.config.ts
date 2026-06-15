export function getOutreachConfig() {
  return {
    fromEmail: process.env.OUTREACH_FROM_EMAIL ?? "sales@parijat.com",
    fromName: process.env.OUTREACH_FROM_NAME ?? "Parijat Sales",
    sendRatePerMinute: Number(process.env.OUTREACH_SEND_RATE_PER_MINUTE ?? "50"),
    emailRatePerMinute: Number(
      process.env.OUTREACH_EMAIL_RATE_PER_MINUTE ??
        process.env.OUTREACH_SEND_RATE_PER_MINUTE ??
        "50",
    ),
    whatsappRatePerMinute: Number(process.env.OUTREACH_WHATSAPP_RATE_PER_MINUTE ?? "20"),
    linkedInRatePerMinute: Number(process.env.OUTREACH_LINKEDIN_RATE_PER_MINUTE ?? "10"),
    resendApiKey: process.env.RESEND_API_KEY ?? "",
    resendWebhookSecret: process.env.RESEND_WEBHOOK_SECRET ?? "",
    whatsappProvider: process.env.WHATSAPP_PROVIDER ?? "meta_cloud",
    whatsappAccessToken: process.env.WHATSAPP_ACCESS_TOKEN ?? "",
    whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? "",
    whatsappBusinessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID ?? "",
    whatsappWebhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ?? "",
    whatsappAppSecret: process.env.WHATSAPP_APP_SECRET ?? "",
    whatsappDefaultTemplate: process.env.WHATSAPP_DEFAULT_TEMPLATE ?? "",
    whatsappTemplateLanguage: process.env.WHATSAPP_TEMPLATE_LANGUAGE ?? "en_US",
    linkedInProvider: process.env.LINKEDIN_PROVIDER ?? "unipile",
    unipileApiKey: process.env.UNIPILE_API_KEY ?? "",
    unipileAccountId: process.env.UNIPILE_ACCOUNT_ID ?? "",
    unipileWebhookSecret: process.env.UNIPILE_WEBHOOK_SECRET ?? "",
    cronSecret: process.env.CRON_SECRET ?? "",
    refreshBatchSize: Number(process.env.REFRESH_BATCH_SIZE ?? "10"),
    refreshConcurrency: Number(process.env.REFRESH_CONCURRENCY ?? "2"),
  };
}

export type OutreachConfig = ReturnType<typeof getOutreachConfig>;

export function isChannelConfigured(
  channel: "EMAIL" | "WHATSAPP" | "LINKEDIN",
  config = getOutreachConfig(),
): boolean {
  switch (channel) {
    case "EMAIL":
      return config.resendApiKey.trim().length > 0;
    case "WHATSAPP":
      return (
        config.whatsappAccessToken.trim().length > 0 &&
        config.whatsappPhoneNumberId.trim().length > 0
      );
    case "LINKEDIN":
      return config.unipileApiKey.trim().length > 0 && config.unipileAccountId.trim().length > 0;
    default:
      return false;
  }
}

export function getChannelRatePerMinute(
  channel: "EMAIL" | "WHATSAPP" | "LINKEDIN",
  config = getOutreachConfig(),
): number {
  switch (channel) {
    case "EMAIL":
      return config.emailRatePerMinute;
    case "WHATSAPP":
      return config.whatsappRatePerMinute;
    case "LINKEDIN":
      return config.linkedInRatePerMinute;
    default:
      return config.sendRatePerMinute;
  }
}

export function getChannelConfigError(
  channel: "EMAIL" | "WHATSAPP" | "LINKEDIN",
): string {
  switch (channel) {
    case "EMAIL":
      return "Email delivery is not configured. Set RESEND_API_KEY to send campaigns.";
    case "WHATSAPP":
      return "WhatsApp delivery is not configured. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID.";
    case "LINKEDIN":
      return "LinkedIn delivery is not configured. Set UNIPILE_API_KEY and UNIPILE_ACCOUNT_ID.";
    default:
      return "Outreach channel is not configured.";
  }
}
