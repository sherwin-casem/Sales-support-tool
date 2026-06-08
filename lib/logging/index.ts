export {
  logger,
  apiLogger,
  aiLogger,
  crawlerLogger,
  databaseLogger,
  createDomainLogger,
} from "@/lib/logging/logger.js";
export type { AppLogger, LogDomain, LogLevel } from "@/lib/logging/types.js";
export {
  resolveLogLevel,
  shouldLogDatabaseQueries,
  shouldUsePrettyLogs,
} from "@/lib/logging/pino.config.js";
export {
  buildPrismaLogConfig,
  attachPrismaLogging,
} from "@/lib/logging/prisma-logging.js";
