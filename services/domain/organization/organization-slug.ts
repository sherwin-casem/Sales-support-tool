import { DomainError } from "@/types/domain/domain-error.types.js";

const SLUG_MAX_LENGTH = 100;

export function slugifyOrganizationName(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX_LENGTH);

  return slug || "organization";
}

export function buildOrganizationSlugCandidates(baseSlug: string): string[] {
  const candidates = [baseSlug];

  for (let index = 2; index <= 50; index += 1) {
    const suffix = `-${index}`;
    const trimmedBase = baseSlug.slice(0, Math.max(1, SLUG_MAX_LENGTH - suffix.length));
    candidates.push(`${trimmedBase}${suffix}`);
  }

  return candidates;
}

export async function resolveUniqueOrganizationSlug(
  orgName: string,
  slugExists: (slug: string) => Promise<boolean>,
): Promise<string> {
  const baseSlug = slugifyOrganizationName(orgName);

  for (const candidate of buildOrganizationSlugCandidates(baseSlug)) {
    const exists = await slugExists(candidate);

    if (!exists) {
      return candidate;
    }
  }

  throw new DomainError("CONFLICT", "Unable to generate a unique organization slug");
}
