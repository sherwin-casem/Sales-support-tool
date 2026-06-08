import { z } from "zod";

const securityConfigSchema = z.object({
  API_AUTH_SECRET: z.preprocess(
    (value) => {
      if (typeof value !== "string" || value.trim() === "") {
        return undefined;
      }

      return value.trim();
    },
    z.string().min(32).optional(),
  ),
  ALLOW_DEV_UUID_AUTH: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
  API_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1_000).default(60_000),
  API_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().min(1).default(60),
  API_SEARCH_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(5),
  API_MAX_CONCURRENT_SEARCHES: z.coerce.number().int().min(1).default(2),
  API_MAX_JSON_BODY_BYTES: z.coerce.number().int().min(1_024).default(16_384),
});

export type SecurityConfig = z.infer<typeof securityConfigSchema>;

let cachedConfig: SecurityConfig | undefined;

export function getSecurityConfig(): SecurityConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  cachedConfig = securityConfigSchema.parse(process.env);
  return cachedConfig;
}

export function resetSecurityConfigCache(): void {
  cachedConfig = undefined;
}

export function isProductionAuthRequired(): boolean {
  return process.env.NODE_ENV === "production";
}
