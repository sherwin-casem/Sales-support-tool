import { logger } from "@/lib/logging/logger.js";
import { hasAnyLeadContactDetails } from "@/services/domain/enrichment/lead-contact-eligibility.js";
import type { CompanyRepository } from "@/repositories/interfaces/company.repository.interface.js";
import { getCompanyRepository } from "@/repositories/prisma/company.repository.js";
import type { ExtractedCompany } from "@/types/agents/company-extraction.types.js";

export interface ContactlessLeadRemovalResult {
  removed: boolean;
  companyId: string;
  deletedSearchResults: number;
}

export class ContactlessLeadRemovalService {
  constructor(private readonly companyRepository: CompanyRepository) {}

  async removeContactlessLead(
    companyId: string,
    profile: ExtractedCompany | null,
    reason: string,
  ): Promise<ContactlessLeadRemovalResult> {
    if (hasAnyLeadContactDetails(profile)) {
      return {
        removed: false,
        companyId,
        deletedSearchResults: 0,
      };
    }

    const { deletedSearchResults } =
      await this.companyRepository.deleteCompanyAndSearchResults(companyId);

    logger.info("Contactless lead removed", {
      companyId,
      reason,
      deletedSearchResults,
    });

    return {
      removed: true,
      companyId,
      deletedSearchResults,
    };
  }
}

let cachedService: ContactlessLeadRemovalService | undefined;

export function createContactlessLeadRemovalService(
  companyRepository: CompanyRepository,
): ContactlessLeadRemovalService {
  return new ContactlessLeadRemovalService(companyRepository);
}

export function getContactlessLeadRemovalService(): ContactlessLeadRemovalService {
  if (!cachedService) {
    cachedService = createContactlessLeadRemovalService(getCompanyRepository());
  }

  return cachedService;
}

export function resetContactlessLeadRemovalServiceCache(): void {
  cachedService = undefined;
}
