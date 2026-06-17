import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import {
  DEFAULT_PARIJAT_SERVICES_CATALOG,
  PARIJAT_ORG_NAME,
  PARIJAT_ORG_SLUG,
} from "../lib/config/parijat.config.js";

const prisma = new PrismaClient();

const PARIJAT_ORG_ID = "00000000-0000-4000-8000-000000000010";
const ADMIN_USER_ID = "00000000-0000-4000-8000-000000000001";

async function main() {
  const passwordHash = await hash("parijat-admin", 12);

  await prisma.organization.upsert({
    where: { slug: PARIJAT_ORG_SLUG },
    create: {
      id: PARIJAT_ORG_ID,
      name: PARIJAT_ORG_NAME,
      slug: PARIJAT_ORG_SLUG,
      servicesCatalog: DEFAULT_PARIJAT_SERVICES_CATALOG,
    },
    update: {
      name: PARIJAT_ORG_NAME,
      servicesCatalog: DEFAULT_PARIJAT_SERVICES_CATALOG,
    },
  });

  await prisma.user.upsert({
    where: { email: "admin@parijat.com" },
    create: {
      id: ADMIN_USER_ID,
      organizationId: PARIJAT_ORG_ID,
      email: "admin@parijat.com",
      passwordHash,
      name: "Parijat Admin",
      role: "ADMIN",
      isActive: true,
    },
    update: {
      passwordHash,
      isActive: true,
      name: "Parijat Admin",
      role: "ADMIN",
    },
  });

  const legacyJobs = await prisma.searchJob.findMany({
    select: { userId: true },
    distinct: ["userId"],
  });

  for (const job of legacyJobs) {
    const existing = await prisma.user.findUnique({ where: { id: job.userId } });

    if (existing) {
      continue;
    }

    await prisma.user.create({
      data: {
        id: job.userId,
        organizationId: PARIJAT_ORG_ID,
        email: `${job.userId}@legacy.local`,
        passwordHash,
        name: "Legacy User",
        role: "SALES_REP",
        isActive: true,
      },
    });
  }

  console.log("Parijat org and users seeded");
  console.log("Login: admin@parijat.com / parijat-admin");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
