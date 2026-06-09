import { z } from "zod";

const searchJobConfigSchema = z.object({
  SEARCH_JOB_PENDING_STALE_MS: z.coerce
    .number()
    .int()
    .min(60_000)
    .default(5 * 60_000),
  SEARCH_JOB_ACTIVE_STALE_MS: z.coerce
    .number()
    .int()
    .min(60_000)
    .default(20 * 60_000),
});

export type SearchJobConfig = z.infer<typeof searchJobConfigSchema>;

let cachedConfig: SearchJobConfig | undefined;

export function getSearchJobConfig(): SearchJobConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  cachedConfig = searchJobConfigSchema.parse(process.env);
  return cachedConfig;
}

export function resetSearchJobConfigCache(): void {
  cachedConfig = undefined;
}
