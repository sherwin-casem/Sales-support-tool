import { describe, expect, it } from "vitest";
import {
  getDefaultPipelineConfig,
  getPipelineConfig,
  resetPipelineConfigCache,
} from "@/lib/config/pipeline.config.js";

describe("pipeline.config", () => {
  it("provides defaults for search pipeline concurrency", () => {
    const config = getDefaultPipelineConfig();

    expect(config.SEARCH_EXTRACTION_CONCURRENCY).toBe(3);
    expect(config.SEARCH_ENRICHMENT_CONCURRENCY).toBe(3);
    expect(config.DISCOVERY_UNLIMITED_MAX_ROUNDS).toBe(5);
  });

  it("reads overrides from environment", () => {
    process.env.SEARCH_EXTRACTION_CONCURRENCY = "5";
    process.env.SEARCH_ENRICHMENT_CONCURRENCY = "2";
    resetPipelineConfigCache();

    const config = getPipelineConfig();

    expect(config.SEARCH_EXTRACTION_CONCURRENCY).toBe(5);
    expect(config.SEARCH_ENRICHMENT_CONCURRENCY).toBe(2);

    delete process.env.SEARCH_EXTRACTION_CONCURRENCY;
    delete process.env.SEARCH_ENRICHMENT_CONCURRENCY;
    resetPipelineConfigCache();
  });
});
