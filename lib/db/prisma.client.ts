import { PrismaClient } from "@prisma/client";
import {
  attachPrismaLogging,
  buildPrismaLogConfig,
} from "@/lib/logging/prisma-logging.js";

let cachedClient: PrismaClient | undefined;

export function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: buildPrismaLogConfig(),
  });

  attachPrismaLogging(client);

  return client;
}

export function getPrismaClient(): PrismaClient {
  if (!cachedClient) {
    cachedClient = createPrismaClient();
  }

  return cachedClient;
}

export async function disconnectPrismaClient(): Promise<void> {
  if (cachedClient) {
    await cachedClient.$disconnect();
    cachedClient = undefined;
  }
}

export function resetPrismaClientCache(): void {
  cachedClient = undefined;
}
