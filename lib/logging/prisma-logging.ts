import type { Prisma, PrismaClient } from "@prisma/client";
import {
  isLogLevelEnabled,
  shouldLogDatabaseQueries,
} from "@/lib/logging/pino.config.js";
import { databaseLogger } from "@/lib/logging/logger.js";

type EventfulPrismaClient = PrismaClient<{
  log: [
    { emit: "event"; level: "query" },
    { emit: "event"; level: "info" },
    { emit: "event"; level: "warn" },
    { emit: "event"; level: "error" },
  ];
}>;

export function buildPrismaLogConfig(): Prisma.LogDefinition[] {
  const config: Prisma.LogDefinition[] = [
    { emit: "event", level: "error" },
    { emit: "event", level: "warn" },
  ];

  if (shouldLogDatabaseQueries()) {
    config.push({ emit: "event", level: "query" });
  }

  if (isLogLevelEnabled("debug")) {
    config.push({ emit: "event", level: "info" });
  }

  return config;
}

export function attachPrismaLogging(client: PrismaClient): void {
  const eventClient = client as EventfulPrismaClient;

  eventClient.$on("query", (event) => {
    if (!shouldLogDatabaseQueries()) {
      return;
    }

    databaseLogger.debug("Prisma query executed", {
      query: event.query,
      params: event.params,
      durationMs: event.duration,
      target: event.target,
    });
  });

  eventClient.$on("info", (event) => {
    databaseLogger.debug("Prisma info", {
      message: event.message,
      target: event.target,
    });
  });

  eventClient.$on("warn", (event) => {
    databaseLogger.warn("Prisma warning", {
      message: event.message,
      target: event.target,
    });
  });

  eventClient.$on("error", (event) => {
    databaseLogger.error("Prisma error", {
      message: event.message,
      target: event.target,
    });
  });
}
