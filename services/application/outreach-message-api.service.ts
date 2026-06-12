import { ApiError } from "@/lib/api/api-error.js";
import { getEnv } from "@/lib/config/env.js";
import {
  GenerateOutreachMessageSchema,
  type GenerateOutreachMessageInput,
} from "@/lib/validations/outreach-message.schema.js";
import { getIntentRepository } from "@/repositories/prisma/intent.repository.js";
import { getOutreachRepository } from "@/repositories/prisma/outreach.repository.js";
import { getUserRepository } from "@/repositories/prisma/user.repository.js";
import { getCompanyRepository } from "@/repositories/prisma/company.repository.js";
import {
  OutreachMessageAgent,
  getDefaultOutreachMessagePromptVersion,
} from "@/agents/outreach/outreach-message.agent.js";
import { createOpenAIClient } from "@/lib/config/openai.client.js";
import type { AuthenticatedUser } from "@/types/auth/session.types.js";

export class OutreachMessageApiService {
  async generateMessage(user: AuthenticatedUser, input: GenerateOutreachMessageInput) {
    const companyRepository = getCompanyRepository();
    const userRepository = getUserRepository();
    const intentRepository = getIntentRepository();
    const outreachRepository = getOutreachRepository();

    const detail = await companyRepository.findDetailForUser(user.id, input.companyId);

    if (!detail?.profile) {
      throw ApiError.notFound(`Company not found or not enriched: ${input.companyId}`);
    }

    const organization = await userRepository.getOrganization(user.organizationId);

    if (!organization) {
      throw ApiError.internal("Organization not found");
    }

    const signals = await intentRepository.findTopSignalsByCompanyId(input.companyId, 5);
    const env = getEnv();
    const agent = new OutreachMessageAgent(createOpenAIClient(env.OPENAI_API_KEY), {
      model: env.OPENAI_MODEL,
    });

    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const result = await agent.execute({
        salespersonName: user.name,
        tone: input.tone,
        channel: input.channel,
        servicesCatalog: JSON.stringify(organization.servicesCatalog, null, 2),
        searchCriteria: "{}",
        companyProfile: JSON.stringify(detail.profile.structuredData, null, 2),
        intentSignals: JSON.stringify(signals, null, 2),
      });

      if (result.ok) {
        const saved = await outreachRepository.createMessage({
          userId: user.id,
          companyId: input.companyId,
          searchResultId: input.searchResultId,
          channel: input.channel,
          subject: result.value.subject,
          bodyText: result.value.bodyText,
          bodyHtml: result.value.bodyHtml ?? null,
          tone: input.tone,
          promptVersion: getDefaultOutreachMessagePromptVersion(),
          modelUsed: env.OPENAI_MODEL,
          parijatServices: organization.servicesCatalog,
        });

        return {
          id: saved.id,
          companyId: saved.companyId,
          searchResultId: saved.searchResultId,
          channel: saved.channel,
          subject: saved.subject,
          bodyText: saved.bodyText,
          bodyHtml: saved.bodyHtml,
          tone: saved.tone,
          createdAt: saved.createdAt.toISOString(),
        };
      }

      lastError = result.error;
    }

    throw ApiError.internal(lastError?.message ?? "Failed to generate outreach message");
  }

  async listMessages(user: AuthenticatedUser, companyId: string) {
    const messages = await getOutreachRepository().listByCompany(companyId, user.id);
    return messages.map((message) => ({
      id: message.id,
      companyId: message.companyId,
      searchResultId: message.searchResultId,
      channel: message.channel,
      subject: message.subject,
      bodyText: message.bodyText,
      bodyHtml: message.bodyHtml,
      tone: message.tone,
      createdAt: message.createdAt.toISOString(),
    }));
  }
}

let cachedService: OutreachMessageApiService | undefined;

export function getOutreachMessageApiService(): OutreachMessageApiService {
  if (!cachedService) {
    cachedService = new OutreachMessageApiService();
  }

  return cachedService;
}
