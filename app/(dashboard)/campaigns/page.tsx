"use client";

import Link from "next/link";
import { Mail, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/browser-client";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { SkeletonCard } from "@/components/ui/Skeleton";

interface CampaignSummary {
  id: string;
  name: string;
  status: string;
  subject: string;
  createdAt: string;
}

function statusVariant(status: string): "default" | "success" | "warning" | "info" | "error" {
  switch (status) {
    case "COMPLETED":
      return "success";
    case "RUNNING":
    case "SCHEDULED":
      return "info";
    case "FAILED":
      return "error";
    case "PAUSED":
      return "warning";
    default:
      return "default";
  }
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
    <main className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <PageHeader
          eyebrow="Outreach"
          title="Campaigns"
          description="Email outreach and delivery tracking for your organization."
          actions={
            <Link href="/search">
              <Button leftIcon={<Plus className="h-4 w-4" />}>Create from search</Button>
            </Link>
          }
        />

        {loading ? (
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : campaigns.length === 0 ? (
          <EmptyState
            icon={Mail}
            title="No campaigns yet"
            description="Generate outreach from a company detail drawer, then create a campaign from your search results."
            action={
              <Link href="/search">
                <Button>Start a search</Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {campaigns.map((campaign) => (
              <Link key={campaign.id} href={`/campaigns/${campaign.id}`}>
                <Card hover className="transition-colors hover:border-brand-200">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">{campaign.name}</p>
                      <p className="mt-1 truncate text-sm text-slate-600">{campaign.subject}</p>
                    </div>
                    <Badge variant={statusVariant(campaign.status)}>{campaign.status}</Badge>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
