import pino, { type Logger as PinoLogger } from "pino";
import pinoPretty from "pino-pretty";
import {
  resolveLogLevel,
  shouldUsePrettyLogs,
} from "@/lib/logging/pino.config.js";

let cachedRootLogger: PinoLogger | undefined;

const baseLoggerOptions = {
  base: {
    service: "sales-support-tool",
  },
} as const;

function createPrettyStream() {
  // Use a direct stream instead of pino's worker-thread transport. Next.js
  // webpack bundles break worker.js resolution under .next/server/vendor-chunks.
  return pinoPretty({
    colorize: true,
    translateTime: "SYS:standard",
    ignore: "pid,hostname,service",
    sync: true,
  });
}

export function getRootPinoLogger(): PinoLogger {
  if (cachedRootLogger) {
    return cachedRootLogger;
  }

  const level = resolveLogLevel();
  const usePretty = shouldUsePrettyLogs();

  cachedRootLogger = usePretty
    ? pino({ ...baseLoggerOptions, level }, createPrettyStream())
    : pino({ ...baseLoggerOptions, level });

  return cachedRootLogger;
}

export function resetRootPinoLoggerCache(): void {
  cachedRootLogger = undefined;
}
