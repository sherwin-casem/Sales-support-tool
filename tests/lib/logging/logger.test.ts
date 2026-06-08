import { afterEach, describe, expect, it } from "vitest";
import {
  resolveLogLevel,
  shouldLogDatabaseQueries,
  shouldUsePrettyLogs,
} from "@/lib/logging/pino.config.js";
import { buildPrismaLogConfig } from "@/lib/logging/prisma-logging.js";
import {
  apiLogger,
  aiLogger,
  crawlerLogger,
  databaseLogger,
  logger,
} from "@/lib/logging/logger.js";
import { resetRootPinoLoggerCache } from "@/lib/logging/pino.client.js";

describe("logging/pino.config", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    resetRootPinoLoggerCache();
  });

  it("defaults to error level in test environment", () => {
    delete process.env.LOG_LEVEL;
    process.env.NODE_ENV = "test";

    expect(resolveLogLevel()).toBe("error");
  });

  it("respects LOG_LEVEL override", () => {
    process.env.LOG_LEVEL = "warn";

    expect(resolveLogLevel()).toBe("warn");
  });

  it("enables database query logging when LOG_DB_QUERIES is true", () => {
    process.env.LOG_DB_QUERIES = "true";
    process.env.LOG_LEVEL = "info";

    expect(shouldLogDatabaseQueries()).toBe(true);
  });

  it("disables database query logging when LOG_DB_QUERIES is false", () => {
    process.env.LOG_DB_QUERIES = "false";
    process.env.LOG_LEVEL = "debug";

    expect(shouldLogDatabaseQueries()).toBe(false);
  });

  it("uses pretty logs in development by default", () => {
    process.env.NODE_ENV = "development";
    delete process.env.LOG_PRETTY;

    expect(shouldUsePrettyLogs()).toBe(true);
  });

  it("disables pretty logs when LOG_PRETTY is false", () => {
    process.env.NODE_ENV = "development";
    process.env.LOG_PRETTY = "false";

    expect(shouldUsePrettyLogs()).toBe(false);
  });
});

describe("logging/logger", () => {
  it("exposes domain loggers with the expected interface", () => {
    for (const domainLogger of [
      logger,
      apiLogger,
      aiLogger,
      crawlerLogger,
      databaseLogger,
    ]) {
      expect(typeof domainLogger.debug).toBe("function");
      expect(typeof domainLogger.info).toBe("function");
      expect(typeof domainLogger.warn).toBe("function");
      expect(typeof domainLogger.error).toBe("function");
    }
  });
});

describe("logging/prisma-logging", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("includes query events when database query logging is enabled", () => {
    process.env.LOG_DB_QUERIES = "true";

    const config = buildPrismaLogConfig();

    expect(config).toEqual(
      expect.arrayContaining([
        { emit: "event", level: "error" },
        { emit: "event", level: "warn" },
        { emit: "event", level: "query" },
      ]),
    );
  });

  it("omits query events when database query logging is disabled", () => {
    process.env.LOG_DB_QUERIES = "false";
    process.env.LOG_LEVEL = "info";

    const config = buildPrismaLogConfig();

    expect(config.some((entry) => entry.level === "query")).toBe(false);
  });
});
