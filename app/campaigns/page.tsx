"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { apiFetch } from "@/lib/api/browser-client";

interface CampaignSummary {
  id: string;
  name: string;
  status: string;
  subject: string;
  createdAt: string;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void apiFetch<{ data: CampaignSummary[] }>("/api/v1/campaigns")
      .then((response) => setCampaigns(response.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Campaigns</h1>
            <p className="mt-1 text-sm text-slate-600">Email outreach and delivery tracking.</p>
          </div>
          <Link
            href="/search"
            className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            Create from search
          </Link>
        </div>

        {loading ? (
          <p className="text-sm text-slate-600">Loading campaigns...</p>
        ) : campaigns.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-600">
            No campaigns yet. Generate outreach from a company detail drawer, then create a campaign via API or bulk action.
          </p>
        ) : (
          <div className="space-y-3">
            {campaigns.map((campaign) => (
              <Link
                key={campaign.id}
                href={`/campaigns/${campaign.id}`}
                className="block rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm hover:border-brand-300"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-slate-900">{campaign.name}</p>
                    <p className="text-sm text-slate-600">{campaign.subject}</p>
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {campaign.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </AppShell>
  );
}
