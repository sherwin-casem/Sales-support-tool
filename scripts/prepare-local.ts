import { PrismaClient } from "@prisma/client";

const checks: Array<{ label: string; ok: boolean; detail: string }> = [];

function record(label: string, ok: boolean, detail: string) {
  checks.push({ label, ok, detail });
  const prefix = ok ? "[ok]" : "[fail]";
  console.log(`${prefix} ${label}: ${detail}`);
}

async function main() {
  console.log("Preparing local environment...\n");

  const requiredEnv = [
    "DATABASE_URL",
    "OPENAI_API_KEY",
    "AUTH_SECRET",
    "NODE_ENV",
  ] as const;

  for (const key of requiredEnv) {
    const value = process.env[key]?.trim();
    record(key, Boolean(value), value ? "set" : "missing");
  }

  const authSecret = process.env.AUTH_SECRET?.trim() ?? "";
  if (authSecret === "change-me-to-a-long-random-secret" || authSecret.length < 16) {
    record(
      "AUTH_SECRET strength",
      false,
      "Use a random secret with at least 16 characters",
    );
  } else {
    record("AUTH_SECRET strength", true, "looks configured");
  }

  const prisma = new PrismaClient();

  try {
    await prisma.$queryRaw`SELECT 1`;
    record("Database connection", true, "connected");
  } catch (error) {
    record(
      "Database connection",
      false,
      error instanceof Error ? error.message : "connection failed",
    );
  }

  try {
    const userCount = await prisma.user.count();
    record("Users table", true, `${userCount} user(s)`);

    const admin = await prisma.user.findUnique({
      where: { email: "admin@parijat.com" },
      select: { id: true, isActive: true },
    });

    record(
      "Admin login user",
      Boolean(admin?.isActive),
      admin ? "admin@parijat.com ready" : "run npm run db:prepare-users",
    );
  } catch (error) {
    record(
      "Users table",
      false,
      error instanceof Error ? error.message : "query failed",
    );
  } finally {
    await prisma.$disconnect();
  }

  const resendConfigured = Boolean(process.env.RESEND_API_KEY?.trim());
  record(
    "Campaign email (RESEND_API_KEY)",
    resendConfigured,
    resendConfigured
      ? "configured — campaign send enabled"
      : "not set — campaign send will return 503",
  );

  const failed = checks.filter((check) => !check.ok);

  console.log("\nNext steps:");
  console.log("1. npm run dev");
  console.log("2. Open http://localhost:3000/login");
  console.log("3. Sign in with admin@parijat.com / parijat-admin");
  console.log("4. Run a search, open a result, and test Generate with AI");

  if (failed.length > 0) {
    console.log("\nFix the failed checks above before relying on outreach/campaign flows.");
    process.exitCode = 1;
  } else {
    console.log("\nEnvironment is ready for local development.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
