import { z } from "zod";

const pipelineConfigSchema = z.object({
  SEARCH_ENRICHMENT_CONCURRENCY: z.coerce.number().int().min(1).max(10).default(3),
  DISCOVERY_UNLIMITED_MAX_ROUNDS: z.coerce.number().int().min(1).max(10).default(5),
  /** Minimum profile completeness (0–1) required to keep a lead in search results. */
  SEARCH_MIN_PROFILE_COMPLETENESS: z.coerce.number().min(0).max(1).default(0.35),
});

export type PipelineConfig = z.infer<typeof pipelineConfigSchema>;

let cachedConfig: PipelineConfig | undefined;

export function getPipelineConfig(): PipelineConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  cachedConfig = pipelineConfigSchema.parse(process.env);
  return cachedConfig;
}

export function resetPipelineConfigCache(): void {
  cachedConfig = undefined;
}

export function getDefaultPipelineConfig(): PipelineConfig {
  return pipelineConfigSchema.parse({});
}
