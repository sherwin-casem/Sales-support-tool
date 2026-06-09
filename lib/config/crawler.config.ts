import { z } from "zod";

const crawlerConfigSchema = z.object({
  CRAWLER_MAX_CONTEXTS: z.coerce.number().int().min(1).max(10).default(3),
  CRAWLER_GLOBAL_CONCURRENCY: z.coerce.number().int().min(1).max(20).default(3),
  CRAWLER_SEARCH_CONCURRENCY: z.coerce.number().int().min(1).max(10).default(3),
  CRAWLER_INTER_PAGE_DELAY_MS: z.coerce.number().int().min(0).default(1000),
  CRAWLER_DOMAIN_DELAY_MS: z.coerce.number().int().min(0).default(2000),
  CRAWLER_NAVIGATION_TIMEOUT_MS: z.coerce.number().int().min(1000).default(30_000),
  CRAWLER_PAGE_ACTION_TIMEOUT_MS: z.coerce.number().int().min(1000).default(10_000),
  CRAWLER_COMPANY_TIMEOUT_MS: z.coerce.number().int().min(5000).default(120_000),
  CRAWLER_POOL_ACQUIRE_TIMEOUT_MS: z.coerce.number().int().min(1000).default(15_000),
  CRAWLER_RESPECT_ROBOTS: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  CRAWLER_PAGE_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(5).default(3),
  CRAWLER_USER_AGENT: z
    .string()
    .min(1)
    .default("SalesIntelligenceBot/1.0 (+https://example.com/bot)"),
});

export type CrawlerConfig = z.infer<typeof crawlerConfigSchema>;

let cachedConfig: CrawlerConfig | undefined;

export function getCrawlerConfig(): CrawlerConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  cachedConfig = crawlerConfigSchema.parse(process.env);
  return cachedConfig;
}

export function resetCrawlerConfigCache(): void {
  cachedConfig = undefined;
}

export function getDefaultCrawlerConfig(): CrawlerConfig {
  return crawlerConfigSchema.parse({});
}
