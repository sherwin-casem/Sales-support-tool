import { z } from "zod";

const DEFAULT_DDG_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const discoveryConfigSchema = z.object({
  DISCOVERY_DDG_MODE: z.enum(["http", "playwright", "auto"]).default("auto"),
  DISCOVERY_DDG_USER_AGENT: z.string().min(1).default(DEFAULT_DDG_USER_AGENT),
  DISCOVERY_HTTP_PROXY: z.preprocess(
    (value) => {
      if (typeof value !== "string" || value.trim() === "") {
        return undefined;
      }

      return value.trim();
    },
    z.string().url().optional(),
  ),
  DISCOVERY_DDG_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120_000).default(15_000),
});

export type DiscoveryConfig = z.infer<typeof discoveryConfigSchema>;

let cachedConfig: DiscoveryConfig | undefined;

export function getDiscoveryConfig(): DiscoveryConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  cachedConfig = discoveryConfigSchema.parse(process.env);
  return cachedConfig;
}

export function resetDiscoveryConfigCache(): void {
  cachedConfig = undefined;
}

export function getDefaultDiscoveryConfig(): DiscoveryConfig {
  return discoveryConfigSchema.parse({});
}
