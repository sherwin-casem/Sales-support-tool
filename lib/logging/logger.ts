import { getRootPinoLogger } from "@/lib/logging/pino.client.js";
import type { AppLogger, LogDomain } from "@/lib/logging/types.js";

function wrapPinoLogger(pinoLogger: ReturnType<typeof getRootPinoLogger>): AppLogger {
  return {
    debug(message: string, meta?: Record<string, unknown>) {
      pinoLogger.debug(meta ?? {}, message);
    },
    info(message: string, meta?: Record<string, unknown>) {
      pinoLogger.info(meta ?? {}, message);
    },
    warn(message: string, meta?: Record<string, unknown>) {
      pinoLogger.warn(meta ?? {}, message);
    },
    error(message: string, meta?: Record<string, unknown>) {
      pinoLogger.error(meta ?? {}, message);
    },
  };
}

function createDomainLogger(domain: LogDomain): AppLogger {
  const child = getRootPinoLogger().child({ domain });
  return wrapPinoLogger(child);
}

/** Application-level orchestration (search pipeline, cross-domain flows). */
export const logger = wrapPinoLogger(getRootPinoLogger());

export const apiLogger = createDomainLogger("api");
export const aiLogger = createDomainLogger("ai");
export const crawlerLogger = createDomainLogger("crawler");
export const databaseLogger = createDomainLogger("database");

export { createDomainLogger };
