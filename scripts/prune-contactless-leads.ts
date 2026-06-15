import { PrismaClient } from "@prisma/client";
import { hasAnyLeadContactDetails } from "@/lib/results/lead-contact-eligibility.js";
import { mapCompanyProfile } from "@/repositories/prisma/mappers.js";
import { findLatestProfilesByCompanyIds } from "@/repositories/prisma/repository.utils.js";
import { getContactlessLeadRemovalService } from "@/services/application/contactless-lead-removal.service.js";
import type { ExtractedCompany } from "@/types/agents/company-extraction.types.js";

const prisma = new PrismaClient();

async function main() {
  const searchResultCompanies = await prisma.searchResult.findMany({
    select: { companyId: true },
    distinct: ["companyId"],
  });

  const companyIds = searchResultCompanies.map((entry) => entry.companyId);

  if (companyIds.length === 0) {
    console.log("No search-result companies found. Nothing to prune.");
    return;
  }

  const profiles = await findLatestProfilesByCompanyIds(prisma, companyIds);
  const latestProfileByCompany = new Map(
    profiles.map((profile) => [profile.companyId, mapCompanyProfile(profile)]),
  );

  const removalService = getContactlessLeadRemovalService();

  let deletedCompanies = 0;
  let deletedSearchResults = 0;

  for (const companyId of companyIds) {
    const latestProfile = latestProfileByCompany.get(companyId);
    const structuredData = (latestProfile?.structuredData ?? null) as ExtractedCompany | null;

    if (hasAnyLeadContactDetails(structuredData)) {
      continue;
    }

    const result = await removalService.removeContactlessLead(
      companyId,
      structuredData,
      "Retroactive cleanup of contactless lead",
    );

    if (result.removed) {
      deletedCompanies += 1;
      deletedSearchResults += result.deletedSearchResults;
    }
  }

  console.log("Contactless lead cleanup complete");
  console.log(`Scanned companies: ${companyIds.length}`);
  console.log(`Deleted companies: ${deletedCompanies}`);
  console.log(`Deleted search results: ${deletedSearchResults}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
