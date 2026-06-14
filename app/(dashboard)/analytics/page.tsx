"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api/browser-client";
import { CampaignStats } from "@/components/analytics/CampaignStats";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { SkeletonCard, SkeletonTable } from "@/components/ui/Skeleton";

interface AnalyticsResponse {
  campaignCount: number;
  funnel: {
    total: number;
    sent: number;
    opened: number;
    clicked: number;
  };
  campaigns: Array<{
    id: string;
    name: string;
    recipients: number;
    funnel: { total: number; sent: number; opened: number; clicked: number };
  }>;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void apiFetch<AnalyticsResponse>("/api/v1/analytics/campaigns")
      .then(setData)
      .catch(() => setError("Analytics are available to managers and admins."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <PageHeader
          eyebrow="Performance"
          title="Campaign analytics"
          description="Org-wide outreach performance and engagement metrics."
        />

        {error ? (
          <Alert variant="warning">{error}</Alert>
        ) : loading || !data ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
            <SkeletonTable rows={4} />
          </>
        ) : (
          <>
            <CampaignStats
              statusCounts={{
                PENDING: data.funnel.total - data.funnel.sent,
                SENT: data.funnel.sent,
                OPENED: data.funnel.opened,
                CLICKED: data.funnel.clicked,
              }}
            />

            <Card padding="none">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="text-sm font-semibold text-slate-900">Campaign breakdown</h2>
              </div>
              <DataTable className="rounded-none border-0">
                <DataTableHead>
                  <DataTableHeaderCell>Campaign</DataTableHeaderCell>
                  <DataTableHeaderCell>Recipients</DataTableHeaderCell>
                  <DataTableHeaderCell>Sent</DataTableHeaderCell>
                  <DataTableHeaderCell>Opened</DataTableHeaderCell>
                </DataTableHead>
                <DataTableBody>
                  {data.campaigns.map((campaign) => (
                    <DataTableRow key={campaign.id}>
                      <DataTableCell>
                        <Link
                          href={`/campaigns/${campaign.id}`}
                          className="font-medium text-brand-700 hover:text-brand-800 hover:underline"
                        >
                          {campaign.name}
                        </Link>
                      </DataTableCell>
                      <DataTableCell>{campaign.recipients}</DataTableCell>
                      <DataTableCell>{campaign.funnel.sent}</DataTableCell>
                      <DataTableCell>{campaign.funnel.opened}</DataTableCell>
                    </DataTableRow>
                  ))}
                </DataTableBody>
              </DataTable>
            </Card>
          </>
        )}
      </div>
    </main>
  );
}
