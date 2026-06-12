export function getOutreachConfig() {
  return {
    fromEmail: process.env.OUTREACH_FROM_EMAIL ?? "sales@parijat.com",
    fromName: process.env.OUTREACH_FROM_NAME ?? "Parijat Sales",
    sendRatePerMinute: Number(process.env.OUTREACH_SEND_RATE_PER_MINUTE ?? "50"),
    resendApiKey: process.env.RESEND_API_KEY ?? "",
    cronSecret: process.env.CRON_SECRET ?? "",
    refreshBatchSize: Number(process.env.REFRESH_BATCH_SIZE ?? "10"),
    refreshConcurrency: Number(process.env.REFRESH_CONCURRENCY ?? "2"),
  };
}
