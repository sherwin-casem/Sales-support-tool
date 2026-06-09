"use client";

import type { ParsedQuery } from "@/types/agents/query-parser.types.js";
import type { SearchResultItemResponse } from "@/types/api/search.api.types.js";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import {
  displayValue,
  formatLocation,
  getCompanyDisplayName,
} from "@/lib/results/display-fields";

interface CompanyDetailDrawerProps {
  result: SearchResultItemResponse | null;
  searchCriteria: ParsedQuery | null;
  open: boolean;
  onClose: () => void;
}

export function CompanyDetailDrawer({
  result,
  searchCriteria,
  open,
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

  return (
    <Drawer open={open} onClose={onClose} title={companyLabel}>
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
                <DetailItem
                  label="Location"
                  value={formatLocation(profile, searchCriteria)}
                />
              </dl>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Decision maker
              </h3>
              <p className="text-sm text-slate-700">{displayValue(profile.decisionMaker)}</p>
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Contact
              </h3>
              <dl className="space-y-3">
                <ContactItem label="LinkedIn" href={profile.linkedInUrl} />
                <ContactItem label="X" href={profile.xUrl} />
                <ContactItem label="Email" href={profile.email ? `mailto:${profile.email}` : null} text={profile.email} />
              </dl>
            </section>

            <TagSection title="Services" items={profile.services} emptyLabel="No services identified" />
            <TagSection
              title="Target customers"
              items={profile.targetCustomers}
              emptyLabel="No target customers identified"
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
    </Drawer>
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
