"use client";

import { useRouter } from "next/navigation";
import type { ParsedQuery } from "@/types/agents/query-parser.types.js";
import type { SearchResultItemResponse } from "@/types/api/search.api.types.js";
import type { ResultDetailFocus } from "@/types/results/result-detail.types.js";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { DecisionMakerContactPanel } from "@/components/results/DecisionMakerContactPanel";
import { OutreachComposer } from "@/components/outreach/OutreachComposer";
import {
  EMPTY_LABEL,
  displayValue,
  formatLocation,
  getCompanyDisplayName,
  hasDisplayValue,
} from "@/lib/results/display-fields";
import {
  hasDecisionMakerContactDetails,
  resolveDecisionMakerContact,
} from "@/lib/results/decision-maker-contact";
import { hasCompanyContactDetails } from "@/lib/results/lead-contact-eligibility";
import {
  normalizePhoneHref,
  resolveDisplayEmail,
  resolveDisplayPhone,
} from "@/lib/results/profile-contacts";
import { resolveRecipientForChannel } from "@/services/domain/outreach/recipient-resolver.service";

interface CompanyDetailDrawerProps {
  result: SearchResultItemResponse | null;
  searchCriteria: ParsedQuery | null;
  open: boolean;
  focusSection?: ResultDetailFocus;
  onClose: () => void;
}

export function CompanyDetailDrawer({
  result,
  searchCriteria,
  open,
  focusSection = "overview",
  onClose,
}: CompanyDetailDrawerProps) {
  const router = useRouter();

  if (!result) {
    return null;
  }

  const profile = result.profile;
  const companyLabel = getCompanyDisplayName(
    profile,
    result.company.name,
    result.company.domain,
  );
  const decisionMakerContact = resolveDecisionMakerContact(profile);
  const companyPhone = resolveDisplayPhone(profile?.phone ?? null);
  const companyEmail = resolveDisplayEmail(profile?.email ?? null);
  const drawerTitle =
    focusSection === "decisionMaker"
      ? (decisionMakerContact?.name ?? "Decision maker")
      : companyLabel;

  return (
    <Drawer open={open} onClose={onClose} title={drawerTitle}>
      {focusSection === "decisionMaker" ? (
        <DecisionMakerOnlyContent
          result={result}
          profile={profile}
          contact={decisionMakerContact}
          onCampaignCreated={(campaignId) => router.push(`/campaigns/${campaignId}`)}
        />
      ) : (
        <CompanyOverviewContent
          result={result}
          profile={profile}
          companyPhone={companyPhone}
          companyEmail={companyEmail}
          searchCriteria={searchCriteria}
          onCampaignCreated={(campaignId) => router.push(`/campaigns/${campaignId}`)}
        />
      )}
    </Drawer>
  );
}

function DecisionMakerOnlyContent({
  result,
  profile,
  contact,
  onCampaignCreated,
}: {
  result: SearchResultItemResponse;
  profile: SearchResultItemResponse["profile"];
  contact: ReturnType<typeof resolveDecisionMakerContact>;
  onCampaignCreated?: (campaignId: string) => void;
}) {
  if (!profile) {
    return (
      <section className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center">
        <h3 className="text-base font-medium text-slate-900">Profile not available</h3>
        <p className="mt-2 text-sm text-slate-600">
          Extraction is still pending or failed for this company.
        </p>
      </section>
    );
  }

  if (!contact) {
    return (
      <section className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center">
        <h3 className="text-base font-medium text-slate-900">Decision maker not identified</h3>
        <p className="mt-2 text-sm text-slate-600">
          No decision maker was identified for this company.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <DecisionMakerContactPanel contact={contact} highlighted />
      {!hasDecisionMakerContactDetails(contact) ? (
        <p className="text-sm text-slate-600">
          No personal email, phone, or LinkedIn was found for this decision maker.
        </p>
      ) : null}
      <LeadOutreachSection
        result={result}
        profile={profile}
        onCampaignCreated={onCampaignCreated}
      />
    </div>
  );
}

function CompanyOverviewContent({
  result,
  profile,
  companyPhone,
  companyEmail,
  searchCriteria,
  onCampaignCreated,
}: {
  result: SearchResultItemResponse;
  profile: SearchResultItemResponse["profile"];
  companyPhone: string | null;
  companyEmail: string | null;
  searchCriteria: ParsedQuery | null;
  onCampaignCreated?: (campaignId: string) => void;
}) {
  const hasCompanyContact = profile ? hasCompanyContactDetails(profile) : false;

  const location = formatLocation(profile, searchCriteria);
  const overviewItems = profile
    ? [
        { label: "Industry", value: profile.industry },
        { label: "Company size", value: profile.estimatedCompanySize },
        { label: "Revenue", value: profile.revenue },
        { label: "Location", value: location === EMPTY_LABEL ? null : location },
      ].filter((item) => hasDisplayValue(item.value))
    : [];

  return (
    <div className="space-y-6">
      {result.company.websiteUrl ? (
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => window.open(result.company.websiteUrl!, "_blank", "noopener,noreferrer")}
        >
          Visit website
        </Button>
      ) : null}

      {profile ? (
        <>
          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Overview
            </h3>
            {hasDisplayValue(profile.description) ? (
              <p className="text-sm leading-7 text-slate-700">{profile.description}</p>
            ) : null}
            {overviewItems.length > 0 ? (
              <dl className="grid gap-4 sm:grid-cols-2">
                {overviewItems.map((item) => (
                  <DetailItem
                    key={item.label}
                    label={item.label}
                    value={displayValue(item.value)}
                  />
                ))}
              </dl>
            ) : null}
          </section>

          <TagSection
            title="Technology"
            items={profile.products}
            emptyLabel="No technology identified"
          />

          <TagSection title="Services" items={profile.services} emptyLabel="No services identified" />
          <TagSection
            title="Target customers"
            items={profile.targetCustomers}
            emptyLabel="No target customers identified"
          />

          {hasCompanyContact ? (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Company contact
              </h3>
              <dl className="space-y-3">
                {companyEmail ? (
                  <ContactItem
                    label="Email"
                    href={`mailto:${companyEmail}`}
                    text={companyEmail}
                  />
                ) : null}
                {companyPhone ? (
                  <ContactItem
                    label="Phone"
                    href={`tel:${normalizePhoneHref(companyPhone)}`}
                    text={companyPhone}
                  />
                ) : null}
                {hasDisplayValue(profile.linkedInUrl) ? (
                  <ContactItem label="LinkedIn" href={profile.linkedInUrl} />
                ) : null}
                {hasDisplayValue(profile.xUrl) ? (
                  <ContactItem label="X" href={profile.xUrl} />
                ) : null}
              </dl>
            </section>
          ) : null}

          <LeadOutreachSection
            result={result}
            profile={profile}
            onCampaignCreated={onCampaignCreated}
          />
        </>
      ) : (
        <section className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center">
          <h3 className="text-base font-medium text-slate-900">Profile not available</h3>
          <p className="mt-2 text-sm text-slate-600">
            Extraction is still pending or failed for this company.
          </p>
        </section>
      )}
    </div>
  );
}

function LeadOutreachSection({
  result,
  profile,
  onCampaignCreated,
}: {
  result: SearchResultItemResponse;
  profile: NonNullable<SearchResultItemResponse["profile"]>;
  onCampaignCreated?: (campaignId: string) => void;
}) {
  const companyLabel = getCompanyDisplayName(
    profile,
    result.company.name,
    result.company.domain,
  );

  return (
    <OutreachComposer
      companyId={result.company.id}
      searchResultId={result.searchResultId}
      companyLabel={companyLabel}
      contactPreview={{
        EMAIL: resolveRecipientForChannel(profile, "EMAIL")?.toAddress ?? null,
        WHATSAPP: resolveRecipientForChannel(profile, "WHATSAPP")?.toAddress ?? null,
        LINKEDIN: resolveRecipientForChannel(profile, "LINKEDIN")?.toAddress ?? null,
      }}
      onCampaignCreated={onCampaignCreated}
    />
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
}

function ContactItem({
  label,
  href,
  text,
}: {
  label: string;
  href: string | null;
  text?: string | null;
}) {
  const display = text ?? href;

  if (!href && !hasDisplayValue(display)) {
    return null;
  }

  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-brand-600 hover:text-brand-700"
          >
            {displayValue(display ?? undefined)}
          </a>
        ) : (
          <span className="text-slate-500">{displayValue(display ?? undefined)}</span>
        )}
      </dd>
    </div>
  );
}

function TagSection({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: string[];
  emptyLabel: string;
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      {items.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {items.map((item) => (
            <li
              key={item}
              className="rounded-full bg-brand-50 px-3 py-1 text-sm text-brand-700 ring-1 ring-inset ring-brand-100"
            >
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">{emptyLabel}</p>
      )}
    </section>
  );
}
