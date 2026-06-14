import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { GetCompanyResponse } from "@/types/api/company.api.types";
import { formatDateTime } from "@/lib/utils/format-display";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";

interface CompanyHeaderProps {
  company: GetCompanyResponse;
}

export function CompanyHeader({ company }: CompanyHeaderProps) {
  const title = company.name ?? company.domain;

  return (
    <header className="space-y-6">
      <PageHeader
        eyebrow="Company profile"
        title={title}
        description={company.domain}
        actions={
          company.websiteUrl ? (
            <Link href={company.websiteUrl} target="_blank" rel="noopener noreferrer">
              <Button
                variant="secondary"
                rightIcon={<ExternalLink className="h-4 w-4" aria-hidden="true" />}
              >
                Visit website
              </Button>
            </Link>
          ) : undefined
        }
      />

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
    <Card padding="sm">
      <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-slate-900">{value}</dd>
    </Card>
  );
}
