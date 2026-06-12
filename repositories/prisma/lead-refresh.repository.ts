import { getPrismaClient } from "@/lib/db/prisma.client.js";

export interface LeadRefreshScheduleRecord {
  id: string;
  userId: string;
  companyId: string;
  intervalDays: number;
  nextRunAt: Date;
  lastRunAt: Date | null;
  enabled: boolean;
}

export class LeadRefreshRepository {
  async upsertSchedule(input: {
    userId: string;
    companyId: string;
    intervalDays: number;
    enabled: boolean;
  }): Promise<LeadRefreshScheduleRecord> {
    const nextRunAt = new Date();
    nextRunAt.setDate(nextRunAt.getDate() + input.intervalDays);

    const row = await getPrismaClient().leadRefreshSchedule.upsert({
      where: {
        userId_companyId: {
          userId: input.userId,
          companyId: input.companyId,
        },
      },
      create: {
        userId: input.userId,
        companyId: input.companyId,
        intervalDays: input.intervalDays,
        enabled: input.enabled,
        nextRunAt,
      },
      update: {
        intervalDays: input.intervalDays,
        enabled: input.enabled,
        ...(input.enabled ? { nextRunAt } : {}),
      },
    });

    return mapSchedule(row);
  }

  async findByUserAndCompany(
    userId: string,
    companyId: string,
  ): Promise<LeadRefreshScheduleRecord | null> {
    const row = await getPrismaClient().leadRefreshSchedule.findUnique({
      where: { userId_companyId: { userId, companyId } },
    });
    return row ? mapSchedule(row) : null;
  }

  async listDueSchedules(limit: number): Promise<LeadRefreshScheduleRecord[]> {
    const rows = await getPrismaClient().leadRefreshSchedule.findMany({
      where: {
        enabled: true,
        nextRunAt: { lte: new Date() },
      },
      orderBy: { nextRunAt: "asc" },
      take: limit,
    });
    return rows.map(mapSchedule);
  }

  async markRunComplete(
    id: string,
    intervalDays: number,
  ): Promise<void> {
    const nextRunAt = new Date();
    nextRunAt.setDate(nextRunAt.getDate() + intervalDays);

    await getPrismaClient().leadRefreshSchedule.update({
      where: { id },
      data: {
        lastRunAt: new Date(),
        nextRunAt,
      },
    });
  }
}

function mapSchedule(row: {
  id: string;
  userId: string;
  companyId: string;
  intervalDays: number;
  nextRunAt: Date;
  lastRunAt: Date | null;
  enabled: boolean;
}): LeadRefreshScheduleRecord {
  return { ...row };
}

let cachedRepository: LeadRefreshRepository | undefined;

export function getLeadRefreshRepository(): LeadRefreshRepository {
  if (!cachedRepository) {
    cachedRepository = new LeadRefreshRepository();
  }

  return cachedRepository;
}
