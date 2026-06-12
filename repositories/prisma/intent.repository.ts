import type { IntentSignalType, Prisma } from "@prisma/client";
import { getPrismaClient } from "@/lib/db/prisma.client.js";

export interface IntentSignalRecord {
  id: string;
  companyId: string;
  type: IntentSignalType;
  title: string;
  summary: string;
  sourceUrl: string | null;
  confidence: number;
  detectedAt: Date;
  expiresAt: Date | null;
}

export class IntentRepository {
  async replaceSignalsForCompany(
    companyId: string,
    signals: Array<{
      type: IntentSignalType;
      title: string;
      summary: string;
      sourceUrl?: string | null;
      confidence: number;
      expiresAt?: Date | null;
    }>,
  ): Promise<void> {
    const prisma = getPrismaClient();

    await prisma.$transaction([
      prisma.intentSignal.deleteMany({ where: { companyId } }),
      ...(signals.length > 0
        ? [
            prisma.intentSignal.createMany({
              data: signals.map((signal) => ({
                companyId,
                type: signal.type,
                title: signal.title,
                summary: signal.summary,
                sourceUrl: signal.sourceUrl ?? null,
                confidence: signal.confidence,
                expiresAt: signal.expiresAt ?? null,
              })),
            }),
          ]
        : []),
    ]);
  }

  async updateCompanyIntentScore(
    companyId: string,
    intentScore: number,
  ): Promise<void> {
    await getPrismaClient().company.update({
      where: { id: companyId },
      data: {
        intentScore,
        intentUpdatedAt: new Date(),
      },
    });
  }

  async findTopSignalsByCompanyId(
    companyId: string,
    limit = 5,
  ): Promise<IntentSignalRecord[]> {
    const rows = await getPrismaClient().intentSignal.findMany({
      where: { companyId },
      orderBy: { detectedAt: "desc" },
      take: limit,
    });

    return rows.map(mapIntentSignal);
  }

  async findSignalsByCompanyIds(
    companyIds: string[],
    limitPerCompany = 3,
  ): Promise<Map<string, IntentSignalRecord[]>> {
    const result = new Map<string, IntentSignalRecord[]>();

    if (companyIds.length === 0) {
      return result;
    }

    const rows = await getPrismaClient().intentSignal.findMany({
      where: { companyId: { in: companyIds } },
      orderBy: { detectedAt: "desc" },
    });

    for (const row of rows) {
      const existing = result.get(row.companyId) ?? [];

      if (existing.length < limitPerCompany) {
        existing.push(mapIntentSignal(row));
        result.set(row.companyId, existing);
      }
    }

    return result;
  }
}

function mapIntentSignal(row: {
  id: string;
  companyId: string;
  type: IntentSignalType;
  title: string;
  summary: string;
  sourceUrl: string | null;
  confidence: Prisma.Decimal;
  detectedAt: Date;
  expiresAt: Date | null;
}): IntentSignalRecord {
  return {
    id: row.id,
    companyId: row.companyId,
    type: row.type,
    title: row.title,
    summary: row.summary,
    sourceUrl: row.sourceUrl,
    confidence: Number(row.confidence),
    detectedAt: row.detectedAt,
    expiresAt: row.expiresAt,
  };
}

let cachedRepository: IntentRepository | undefined;

export function getIntentRepository(): IntentRepository {
  if (!cachedRepository) {
    cachedRepository = new IntentRepository();
  }

  return cachedRepository;
}
