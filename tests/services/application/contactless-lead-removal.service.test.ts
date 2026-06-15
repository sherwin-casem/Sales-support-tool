import { describe, expect, it, vi } from "vitest";
import { createExtractedCompanyProfile } from "../../helpers/extracted-company.fixture.js";
import { ContactlessLeadRemovalService } from "@/services/application/contactless-lead-removal.service.js";
import type { CompanyRepository } from "@/repositories/interfaces/company.repository.interface.js";

describe("ContactlessLeadRemovalService", () => {
  it("does not delete companies that still have contact details", async () => {
    const companyRepository = {
      deleteCompanyAndSearchResults: vi.fn(),
    } as unknown as CompanyRepository;

    const service = new ContactlessLeadRemovalService(companyRepository);
    const result = await service.removeContactlessLead(
      "company-1",
      createExtractedCompanyProfile({ email: "info@acme.fi" }),
      "test",
    );

    expect(result.removed).toBe(false);
    expect(companyRepository.deleteCompanyAndSearchResults).not.toHaveBeenCalled();
  });

  it("deletes companies without company or decision-maker contact", async () => {
    const companyRepository = {
      deleteCompanyAndSearchResults: vi.fn().mockResolvedValue({ deletedSearchResults: 3 }),
    } as unknown as CompanyRepository;

    const service = new ContactlessLeadRemovalService(companyRepository);
    const result = await service.removeContactlessLead(
      "company-1",
      createExtractedCompanyProfile(),
      "No company or decision-maker contact information found",
    );

    expect(result).toEqual({
      removed: true,
      companyId: "company-1",
      deletedSearchResults: 3,
    });
    expect(companyRepository.deleteCompanyAndSearchResults).toHaveBeenCalledWith("company-1");
  });

  it("deletes companies with no profile", async () => {
    const companyRepository = {
      deleteCompanyAndSearchResults: vi.fn().mockResolvedValue({ deletedSearchResults: 1 }),
    } as unknown as CompanyRepository;

    const service = new ContactlessLeadRemovalService(companyRepository);
    const result = await service.removeContactlessLead("company-1", null, "No profile");

    expect(result.removed).toBe(true);
    expect(companyRepository.deleteCompanyAndSearchResults).toHaveBeenCalledWith("company-1");
  });
});
