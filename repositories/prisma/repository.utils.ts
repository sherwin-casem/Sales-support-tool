import type { DbClient } from "@/lib/db/db-client.types.js";
import type {
  SaveCompanyProfileInput,
  UpsertCompanyInput,
} from "@/types/repositories/company.repository.types.js";
import {
  domainBlocklistService,
  domainNormalizerService,
} from "@/services/domain/company/domain-normalizer.service.js";
import { RepositoryError } from "@/types/repositories/repository-error.types.js";

export interface NormalizedCompanyUpsert {
  domain: string;
  normalizedDomain: string;
  websiteUrl: string;
  name: string | null;
}

export function normalizeCompanyUpsertInput(
  input: UpsertCompanyInput,
): NormalizedCompanyUpsert {
  const normalized = domainNormalizerService.normalizeWebsite(input.website);

  if (!normalized) {
    throw new RepositoryError("INVALID_INPUT", `Invalid website: ${input.website}`);
  }

  if (domainBlocklistService.isBlocked(normalized.domain)) {
    throw new RepositoryError(
      "INVALID_INPUT",
      `Blocked domain: ${normalized.domain}`,
    );
  }

  return {
    domain: normalized.domain,
    normalizedDomain: normalized.domain,
    websiteUrl: normalized.website,
    name: input.name?.trim() || null,
  };
}

export function dedupeCompanyUpsertInputs(
  inputs: UpsertCompanyInput[],
): NormalizedCompanyUpsert[] {
  const byDomain = new Map<string, NormalizedCompanyUpsert>();

  for (const input of inputs) {
    const normalized = normalizeCompanyUpsertInput(input);
    const existing = byDomain.get(normalized.normalizedDomain);

    if (!existing || (input.name && !existing.name)) {
      byDomain.set(normalized.normalizedDomain, normalized);
    }
  }

  return Array.from(byDomain.values());
}

export async function findExistingProfileByContentHash(
  client: DbClient,
  companyId: string,
  contentHash?: string,
) {
  if (!contentHash) {
    return null;
  }

  return client.companyProfile.findFirst({
    where: {
      companyId,
      contentHash,
    },
    orderBy: {
      version: "desc",
    },
  });
}

export async function getNextProfileVersion(
  client: DbClient,
  companyId: string,
): Promise<number> {
  const latest = await client.companyProfile.findFirst({
    where: { companyId },
    orderBy: { version: "desc" },
    select: { version: true },
  });

  return (latest?.version ?? 0) + 1;
}

export function assertValidProfileInput(input: SaveCompanyProfileInput): void {
  if (!input.companyId) {
    throw new RepositoryError("INVALID_INPUT", "companyId is required");
  }

  if (!input.structuredData.companyName.trim()) {
    throw new RepositoryError("INVALID_INPUT", "structuredData.companyName is required");
  }
}
