import type { LogLevel } from "@/lib/logging/types.js";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export function resolveLogLevel(): LogLevel {
  const level = process.env.LOG_LEVEL;

  if (level === "debug" || level === "info" || level === "warn" || level === "error") {
    return level;
  }

  if (process.env.NODE_ENV === "test") {
    return "error";
  }

  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

export function shouldUsePrettyLogs(): boolean {
  if (process.env.LOG_PRETTY === "false") {
    return false;
  }

  if (process.env.LOG_PRETTY === "true") {
    return true;
  }

  return process.env.NODE_ENV === "development";
}

export function shouldLogDatabaseQueries(): boolean {
  if (process.env.LOG_DB_QUERIES === "true") {
    return true;
  }

  if (process.env.LOG_DB_QUERIES === "false") {
    return false;
  }

  return resolveLogLevel() === "debug";
}

export function isLogLevelEnabled(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[resolveLogLevel()];
}
