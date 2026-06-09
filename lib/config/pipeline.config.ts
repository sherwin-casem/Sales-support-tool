import { z } from "zod";

const pipelineConfigSchema = z.object({
  SEARCH_EXTRACTION_CONCURRENCY: z.coerce.number().int().min(1).max(10).default(3),
  SEARCH_SCORING_CONCURRENCY: z.coerce.number().int().min(1).max(10).default(3),
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
