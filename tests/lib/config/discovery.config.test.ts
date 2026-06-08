import { describe, expect, it } from "vitest";
import {
  getDefaultDiscoveryConfig,
  getDiscoveryConfig,
  resetDiscoveryConfigCache,
} from "@/lib/config/discovery.config.js";

describe("discovery.config", () => {
  it("provides defaults for DuckDuckGo discovery settings", () => {
    const config = getDefaultDiscoveryConfig();

    expect(config.DISCOVERY_DDG_MODE).toBe("auto");
    expect(config.DISCOVERY_DDG_TIMEOUT_MS).toBe(15_000);
    expect(config.DISCOVERY_DDG_USER_AGENT).toContain("Mozilla");
    expect(config.DISCOVERY_HTTP_PROXY).toBeUndefined();
  });

  it("reads overrides from environment", () => {
    process.env.DISCOVERY_DDG_MODE = "playwright";
    process.env.DISCOVERY_HTTP_PROXY = "http://proxy.example:8080";
    resetDiscoveryConfigCache();

    const config = getDiscoveryConfig();

    expect(config.DISCOVERY_DDG_MODE).toBe("playwright");
    expect(config.DISCOVERY_HTTP_PROXY).toBe("http://proxy.example:8080");

    delete process.env.DISCOVERY_DDG_MODE;
    delete process.env.DISCOVERY_HTTP_PROXY;
    resetDiscoveryConfigCache();
  });
});
