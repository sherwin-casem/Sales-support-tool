import type { Prisma, PrismaClient } from "@prisma/client";

export type DbClient = PrismaClient | Prisma.TransactionClient;

export function resolveDbClient(
  prisma: PrismaClient,
  tx?: DbClient,
): DbClient {
  return tx ?? prisma;
}
