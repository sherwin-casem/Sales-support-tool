import { hash } from "bcryptjs";
import {
  Prisma,
  PrismaClient,
  SearchJobStatus,
  SearchResultStage,
  UserRole,
} from "@prisma/client";
import {
  DEFAULT_PARIJAT_SERVICES_CATALOG,
  PARIJAT_ORG_NAME,
  PARIJAT_ORG_SLUG,
} from "../lib/config/parijat.config.js";

const prisma = new PrismaClient();

const ADMIN_USER_ID = "00000000-0000-4000-8000-000000000001";
const PARIJAT_ORG_ID = "00000000-0000-4000-8000-000000000010";

async function main() {
  const organization = await prisma.organization.upsert({
    where: { slug: PARIJAT_ORG_SLUG },
    update: {
      servicesCatalog: DEFAULT_PARIJAT_SERVICES_CATALOG as unknown as Prisma.InputJsonValue,
    },
    create: {
      id: PARIJAT_ORG_ID,
      name: PARIJAT_ORG_NAME,
      slug: PARIJAT_ORG_SLUG,
      servicesCatalog: DEFAULT_PARIJAT_SERVICES_CATALOG as unknown as Prisma.InputJsonValue,
    },
  });

  const passwordHash = await hash("parijat-admin", 12);

  await prisma.user.upsert({
    where: { email: "admin@parijat.com" },
    update: {
      passwordHash,
      isActive: true,
      role: UserRole.ADMIN,
    },
    create: {
      id: ADMIN_USER_ID,
      organizationId: organization.id,
      email: "admin@parijat.com",
      passwordHash,
      name: "Parijat Admin",
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  const company = await prisma.company.upsert({
    where: { normalizedDomain: "acme.com" },
    update: {},
    create: {
      domain: "acme.com",
      normalizedDomain: "acme.com",
      name: "Acme Payments",
      websiteUrl: "https://acme.com",
    },
  });

  await prisma.companyProfile.upsert({
    where: {
      companyId_version: {
        companyId: company.id,
        version: 1,
      },
    },
    update: {},
    create: {
      companyId: company.id,
      version: 1,
      structuredData: {
        industry: "Fintech",
        description: "B2B payment infrastructure for mid-market SaaS.",
        products: ["Payment API", "Billing Platform"],
      },
      completeness: 0.75,
      modelUsed: "seed",
      promptVersion: "seed-v1",
    },
  });

  const searchJob = await prisma.searchJob.create({
    data: {
      userId: ADMIN_USER_ID,
      query: "B2B fintech SaaS companies in the US",
      criteria: {
        industries: ["fintech"],
        geographies: ["US"],
      },
      status: SearchJobStatus.COMPLETED,
      companyLimit: 25,
      startedAt: new Date(),
      completedAt: new Date(),
    },
  });

  await prisma.searchResult.create({
    data: {
      searchJobId: searchJob.id,
      companyId: company.id,
      stage: SearchResultStage.ENRICHED,
      rank: 1,
      discoverySource: "seed",
      completedAt: new Date(),
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
