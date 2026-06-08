import pino, { type Logger as PinoLogger } from "pino";
import {
  resolveLogLevel,
  shouldUsePrettyLogs,
} from "@/lib/logging/pino.config.js";

let cachedRootLogger: PinoLogger | undefined;

export function getRootPinoLogger(): PinoLogger {
  if (cachedRootLogger) {
    return cachedRootLogger;
  }

  const level = resolveLogLevel();
  const usePretty = shouldUsePrettyLogs();

  cachedRootLogger = usePretty
    ? pino({
        level,
        base: {
          service: "sales-support-tool",
        },
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname,service",
          },
        },
      })
    : pino({
        level,
        base: {
          service: "sales-support-tool",
        },
      });

  return cachedRootLogger;
}

export function resetRootPinoLoggerCache(): void {
  cachedRootLogger = undefined;
}
