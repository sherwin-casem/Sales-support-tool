import type { GetCompanyResponse } from "@/types/api/company.api.types";
import { formatDateTime } from "@/lib/utils/format-display";

interface CompanyHeaderProps {
  company: GetCompanyResponse;
}

export function CompanyHeader({ company }: CompanyHeaderProps) {
  const title = company.name ?? company.domain;

  return (
    <header className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-wide text-brand-600">
            Company profile
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            {title}
          </h1>
          <p className="text-sm text-slate-600">{company.domain}</p>
        </div>

        {company.websiteUrl ? (
          <a
            href={company.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Visit ${company.domain} (opens in new tab)`}
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Visit website
          </a>
        ) : null}
      </div>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MetaItem label="First seen" value={formatDateTime(company.firstSeenAt)} />
        <MetaItem label="Last crawled" value={formatDateTime(company.lastCrawledAt)} />
        <MetaItem label="Last updated" value={formatDateTime(company.updatedAt)} />
      </dl>
    </header>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
}
