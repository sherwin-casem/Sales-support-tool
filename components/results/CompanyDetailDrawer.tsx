"use client";

import type { ParsedQuery } from "@/types/agents/query-parser.types.js";
import type { SearchResultItemResponse } from "@/types/api/search.api.types.js";
import type { ResultDetailFocus } from "@/types/results/result-detail.types.js";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { DecisionMakerContactPanel } from "@/components/results/DecisionMakerContactPanel";
import {
  displayValue,
  formatLocation,
  getCompanyDisplayName,
} from "@/lib/results/display-fields";
import {
  hasDecisionMakerContactDetails,
  resolveDecisionMakerContact,
} from "@/lib/results/decision-maker-contact";
import {
  normalizePhoneHref,
  resolveDisplayEmail,
  resolveDisplayPhone,
} from "@/lib/results/profile-contacts";

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

  // #region agent log
  fetch('http://127.0.0.1:7506/ingest/b8df404c-d358-471e-b660-9eb937c3e500',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'0dd8cc'},body:JSON.stringify({sessionId:'0dd8cc',location:'CompanyDetailDrawer.tsx',message:'company contact resolved',data:{emailChanged:Boolean(profile?.email?.trim())&&companyEmail===null,phoneChanged:Boolean(profile?.phone?.trim())&&companyPhone===null},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
  // #endregion
  const drawerTitle =
    focusSection === "decisionMaker"
      ? (decisionMakerContact?.name ?? "Decision maker")
      : companyLabel;

  return (
    <Drawer open={open} onClose={onClose} title={drawerTitle}>
      {focusSection === "decisionMaker" ? (
        <DecisionMakerOnlyContent profile={profile} contact={decisionMakerContact} />
      ) : (
        <CompanyOverviewContent
          result={result}
          profile={profile}
          companyPhone={companyPhone}
          companyEmail={companyEmail}
          searchCriteria={searchCriteria}
        />
      )}
    </Drawer>
  );
}

function DecisionMakerOnlyContent({
  profile,
  contact,
}: {
  profile: SearchResultItemResponse["profile"];
  contact: ReturnType<typeof resolveDecisionMakerContact>;
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
    <div className="space-y-2">
      <DecisionMakerContactPanel contact={contact} highlighted />
      {!hasDecisionMakerContactDetails(contact) ? (
        <p className="text-sm text-slate-600">
          No personal email, phone, or LinkedIn was found for this decision maker.
        </p>
      ) : null}
    </div>
  );
}

function CompanyOverviewContent({
  result,
  profile,
  companyPhone,
  companyEmail,
  searchCriteria,
}: {
  result: SearchResultItemResponse;
  profile: SearchResultItemResponse["profile"];
  companyPhone: string | null;
  companyEmail: string | null;
  searchCriteria: ParsedQuery | null;
}) {
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
            <p className="text-sm leading-7 text-slate-700">{profile.description}</p>
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailItem label="Industry" value={displayValue(profile.industry)} />
              <DetailItem label="Company size" value={displayValue(profile.estimatedCompanySize)} />
              <DetailItem label="Revenue" value={displayValue(profile.revenue)} />
              <DetailItem label="Location" value={formatLocation(profile, searchCriteria)} />
            </dl>
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

          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Company contact
            </h3>
            <dl className="space-y-3">
              <ContactItem label="Email" href={companyEmail ? `mailto:${companyEmail}` : null} text={companyEmail} />
              <ContactItem
                label="Phone"
                href={companyPhone ? `tel:${normalizePhoneHref(companyPhone)}` : null}
                text={companyPhone}
              />
              <ContactItem label="LinkedIn" href={profile.linkedInUrl} />
              <ContactItem label="X" href={profile.xUrl} />
            </dl>
          </section>
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
