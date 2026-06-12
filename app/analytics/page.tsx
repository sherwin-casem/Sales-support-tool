"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { apiFetch } from "@/lib/api/browser-client";
import { CampaignStats } from "@/components/analytics/CampaignStats";

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

  useEffect(() => {
    void apiFetch<AnalyticsResponse>("/api/v1/analytics/campaigns")
      .then(setData)
      .catch(() => setError("Analytics are available to managers and admins."));
  }, []);

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold text-slate-900">Campaign analytics</h1>
        <p className="mt-1 text-sm text-slate-600">Org-wide outreach performance.</p>

        {error ? (
          <p className="mt-6 text-sm text-slate-600">{error}</p>
        ) : !data ? (
          <p className="mt-6 text-sm text-slate-600">Loading analytics...</p>
        ) : (
          <div className="mt-6 space-y-6">
            <CampaignStats
              statusCounts={{
                PENDING: data.funnel.total - data.funnel.sent,
                SENT: data.funnel.sent,
                OPENED: data.funnel.opened,
                CLICKED: data.funnel.clicked,
              }}
            />

            <section className="rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-4 py-3">Campaign</th>
                    <th className="px-4 py-3">Recipients</th>
                    <th className="px-4 py-3">Sent</th>
                    <th className="px-4 py-3">Opened</th>
                  </tr>
                </thead>
                <tbody>
                  {data.campaigns.map((campaign) => (
                    <tr key={campaign.id} className="border-b border-slate-100">
                      <td className="px-4 py-3">
                        <Link href={`/campaigns/${campaign.id}`} className="text-brand-700 hover:underline">
                          {campaign.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{campaign.recipients}</td>
                      <td className="px-4 py-3">{campaign.funnel.sent}</td>
                      <td className="px-4 py-3">{campaign.funnel.opened}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        )}
      </main>
    </AppShell>
  );
}
