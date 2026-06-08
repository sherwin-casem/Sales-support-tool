import type { CompanyProfileDetailResponse } from "@/types/api/company.api.types";
import { formatCompleteness, formatDateTime } from "@/lib/utils/format-display";

interface CompanyProfilePanelProps {
  profile: CompanyProfileDetailResponse;
}

export function CompanyProfilePanel({ profile }: CompanyProfilePanelProps) {
  const data = profile.data;

  return (
    <section
      aria-labelledby="company-profile-heading"
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="company-profile-heading" className="text-lg font-semibold text-slate-900">
            Company profile
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Version {profile.version} · extracted {formatDateTime(profile.extractedAt)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-sm text-slate-600">
          <Badge label="Completeness" value={formatCompleteness(profile.completeness)} />
          {profile.modelUsed ? <Badge label="Model" value={profile.modelUsed} /> : null}
        </div>
      </div>

      <p className="mt-4 text-sm leading-7 text-slate-700">{data.description}</p>

      <dl className="mt-6 grid gap-4 sm:grid-cols-2">
        <DetailItem label="Industry" value={data.industry} />
        <DetailItem label="Estimated size" value={data.estimatedCompanySize} />
        <DetailItem label="Legal / display name" value={data.companyName} />
      </dl>
    </section>
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

function Badge({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1">
      <span className="font-medium text-slate-700">{label}:</span>&nbsp;{value}
    </span>
  );
}
