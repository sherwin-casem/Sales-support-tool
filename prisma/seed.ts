import { PrismaClient, SearchJobStatus, SearchResultStage } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const userId = "00000000-0000-4000-8000-000000000001";

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
      userId,
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

  const searchResult = await prisma.searchResult.create({
    data: {
      searchJobId: searchJob.id,
      companyId: company.id,
      stage: SearchResultStage.SCORED,
      rank: 1,
      discoverySource: "seed",
      completedAt: new Date(),
    },
  });

  await prisma.leadScore.create({
    data: {
      searchResultId: searchResult.id,
      searchJobId: searchJob.id,
      totalScore: 87.5,
      confidence: 0.91,
      breakdown: {
        industryFit: 90,
        keywordFit: 85,
        sizeFit: 88,
        semanticFit: 87,
      },
      rationale: "Strong fintech SaaS signals aligned with search criteria.",
      modelUsed: "seed",
      promptVersion: "seed-v1",
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
