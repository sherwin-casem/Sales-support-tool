import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PARIJAT_ORG_ID = "00000000-0000-4000-8000-000000000010";
const ADMIN_USER_ID = "00000000-0000-4000-8000-000000000001";

async function main() {
  const passwordHash = await hash("parijat-admin", 12);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "organizations" (
      "id" UUID NOT NULL PRIMARY KEY,
      "name" VARCHAR(200) NOT NULL,
      "slug" VARCHAR(100) NOT NULL UNIQUE,
      "servicesCatalog" JSONB NOT NULL DEFAULT '[]',
      "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "users" (
      "id" UUID NOT NULL PRIMARY KEY,
      "organizationId" UUID NOT NULL,
      "email" VARCHAR(320) NOT NULL UNIQUE,
      "passwordHash" VARCHAR(255) NOT NULL,
      "name" VARCHAR(200) NOT NULL,
      "role" TEXT NOT NULL DEFAULT 'SALES_REP',
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(
    `INSERT INTO "organizations" ("id", "name", "slug", "servicesCatalog", "createdAt", "updatedAt")
     VALUES ($1::uuid, 'Parijat', 'parijat', '[]'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT ("slug") DO NOTHING`,
    PARIJAT_ORG_ID,
  );

  await prisma.$executeRawUnsafe(
    `INSERT INTO "users" ("id", "organizationId", "email", "passwordHash", "name", "role", "isActive", "createdAt", "updatedAt")
     VALUES ($1::uuid, $2::uuid, 'admin@parijat.com', $3, 'Parijat Admin', 'ADMIN', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON CONFLICT ("email") DO UPDATE SET "passwordHash" = EXCLUDED."passwordHash", "isActive" = true`,
    ADMIN_USER_ID,
    PARIJAT_ORG_ID,
    passwordHash,
  );

  await prisma.$executeRawUnsafe(`
    INSERT INTO "users" ("id", "organizationId", "email", "passwordHash", "name", "role", "isActive", "createdAt", "updatedAt")
    SELECT DISTINCT sj."userId", $1::uuid, sj."userId"::text || '@legacy.local', $2, 'Legacy User', 'SALES_REP', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    FROM "search_jobs" sj
    WHERE NOT EXISTS (SELECT 1 FROM "users" u WHERE u."id" = sj."userId")
    ON CONFLICT ("email") DO NOTHING
  `, PARIJAT_ORG_ID, passwordHash);

  console.log("Parijat org and users seeded for FK migration");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
