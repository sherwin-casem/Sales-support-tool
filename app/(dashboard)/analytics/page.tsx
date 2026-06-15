"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api/browser-client";
import { channelLabel, engagementLabel } from "@/lib/outreach/channel-labels";
import { CampaignStats } from "@/components/analytics/CampaignStats";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
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
    replied: number;
  };
  byChannel: Array<{
    channel: string;
    label: string;
    campaignCount: number;
    funnel: {
      total: number;
      sent: number;
      opened: number;
      replied: number;
    };
  }>;
  campaigns: Array<{
    id: string;
    name: string;
    channel: string;
    recipients: number;
    funnel: { total: number; sent: number; opened: number; clicked: number; replied: number };
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
          description="Org-wide multi-channel outreach performance and engagement metrics."
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
                PENDING: Math.max(0, data.funnel.total - data.funnel.sent),
                SENT: data.funnel.sent,
                OPENED: data.funnel.opened,
                CLICKED: data.funnel.clicked,
                REPLIED: data.funnel.replied,
              }}
            />

            <div className="grid gap-4 md:grid-cols-3">
              {data.byChannel.map((entry) => (
                <Card key={entry.channel}>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold text-slate-900">{entry.label}</h2>
                    <Badge variant="default">{entry.campaignCount} campaigns</Badge>
                  </div>
                  <dl className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-slate-500">Recipients</dt>
                      <dd className="font-semibold text-slate-900">{entry.funnel.total}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Sent</dt>
                      <dd className="font-semibold text-slate-900">{entry.funnel.sent}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">{engagementLabel(entry.channel)}</dt>
                      <dd className="font-semibold text-slate-900">{entry.funnel.opened}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Replied</dt>
                      <dd className="font-semibold text-slate-900">{entry.funnel.replied}</dd>
                    </div>
                  </dl>
                </Card>
              ))}
            </div>

            <Card padding="none">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="text-sm font-semibold text-slate-900">Campaign breakdown</h2>
              </div>
              <DataTable className="rounded-none border-0">
                <DataTableHead>
                  <DataTableHeaderCell>Campaign</DataTableHeaderCell>
                  <DataTableHeaderCell>Channel</DataTableHeaderCell>
                  <DataTableHeaderCell>Recipients</DataTableHeaderCell>
                  <DataTableHeaderCell>Sent</DataTableHeaderCell>
                  <DataTableHeaderCell>Engaged</DataTableHeaderCell>
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
                      <DataTableCell>{channelLabel(campaign.channel)}</DataTableCell>
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
