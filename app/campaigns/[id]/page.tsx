"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { apiFetch } from "@/lib/api/browser-client";
import { Button } from "@/components/ui/Button";
import { CampaignStats } from "@/components/analytics/CampaignStats";

interface CampaignDetail {
  id: string;
  name: string;
  status: string;
  subject: string;
  statusCounts: Record<string, number>;
  recipients: Array<{
    id: string;
    toEmail: string;
    toName: string | null;
    status: string;
    errorMessage: string | null;
  }>;
}

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadCampaign() {
    setLoading(true);
    try {
      const detail = await apiFetch<CampaignDetail>(`/api/v1/campaigns/${params.id}`);
      setCampaign(detail);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCampaign();
  }, [params.id]);

  async function handleSend() {
    await apiFetch(`/api/v1/campaigns/${params.id}/send`, { method: "POST" });
    await loadCampaign();
  }

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        {loading || !campaign ? (
          <p className="text-sm text-slate-600">Loading campaign...</p>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">{campaign.name}</h1>
                <p className="text-sm text-slate-600">{campaign.subject}</p>
              </div>
              {campaign.status === "DRAFT" || campaign.status === "SCHEDULED" ? (
                <Button type="button" onClick={() => void handleSend()}>
                  Send now
                </Button>
              ) : null}
            </div>

            <CampaignStats statusCounts={campaign.statusCounts} />

            <section className="rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-4 py-3">Recipient</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {campaign.recipients.map((recipient) => (
                    <tr key={recipient.id} className="border-b border-slate-100">
                      <td className="px-4 py-3">
                        {recipient.toName ? `${recipient.toName} ` : ""}
                        {recipient.toEmail}
                      </td>
                      <td className="px-4 py-3">{recipient.status}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {recipient.errorMessage ?? "—"}
                      </td>
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
