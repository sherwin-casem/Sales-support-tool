import type { OutreachChannel, Prisma } from "@prisma/client";
import { getPrismaClient } from "@/lib/db/prisma.client.js";

export interface OutreachMessageRecord {
  id: string;
  userId: string;
  companyId: string;
  searchResultId: string | null;
  channel: OutreachChannel;
  subject: string;
  bodyText: string;
  bodyHtml: string | null;
  tone: string | null;
  promptVersion: string;
  modelUsed: string;
  parijatServices: unknown;
  createdAt: Date;
}

export class OutreachRepository {
  async createMessage(input: {
    userId: string;
    companyId: string;
    searchResultId?: string | null;
    channel: OutreachChannel;
    subject: string;
    bodyText: string;
    bodyHtml?: string | null;
    tone?: string | null;
    promptVersion: string;
    modelUsed: string;
    parijatServices: unknown;
  }): Promise<OutreachMessageRecord> {
    const row = await getPrismaClient().outreachMessage.create({
      data: {
        userId: input.userId,
        companyId: input.companyId,
        searchResultId: input.searchResultId ?? null,
        channel: input.channel,
        subject: input.subject,
        bodyText: input.bodyText,
        bodyHtml: input.bodyHtml ?? null,
        tone: input.tone ?? null,
        promptVersion: input.promptVersion,
        modelUsed: input.modelUsed,
        parijatServices: input.parijatServices as Prisma.InputJsonValue,
      },
    });
    return mapMessage(row);
  }

  async listByCompany(companyId: string, userId?: string): Promise<OutreachMessageRecord[]> {
    const rows = await getPrismaClient().outreachMessage.findMany({
      where: {
        companyId,
        ...(userId ? { userId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return rows.map(mapMessage);
  }
}

function mapMessage(row: {
  id: string;
  userId: string;
  companyId: string;
  searchResultId: string | null;
  channel: OutreachChannel;
  subject: string;
  bodyText: string;
  bodyHtml: string | null;
  tone: string | null;
  promptVersion: string;
  modelUsed: string;
  parijatServices: Prisma.JsonValue;
  createdAt: Date;
}): OutreachMessageRecord {
  return {
    id: row.id,
    userId: row.userId,
    companyId: row.companyId,
    searchResultId: row.searchResultId,
    channel: row.channel,
    subject: row.subject,
    bodyText: row.bodyText,
    bodyHtml: row.bodyHtml,
    tone: row.tone,
    promptVersion: row.promptVersion,
    modelUsed: row.modelUsed,
    parijatServices: row.parijatServices,
    createdAt: row.createdAt,
  };
}

let cachedRepository: OutreachRepository | undefined;

export function getOutreachRepository(): OutreachRepository {
  if (!cachedRepository) {
    cachedRepository = new OutreachRepository();
  }

  return cachedRepository;
}
