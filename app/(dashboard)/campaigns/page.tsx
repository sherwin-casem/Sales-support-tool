"use client";

import Link from "next/link";
import { Mail, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildCampaignsPageItems,
  CampaignsPageList,
} from "@/components/campaigns/CampaignsPageList";
import { apiFetch } from "@/lib/api/browser-client";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { Alert } from "@/components/ui/Alert";
import type { ListSavedSearchesResponse } from "@/types/api/saved-search.api.types.js";

interface CampaignSummary {
  id: string;
  name: string;
  channel: string;
  status: string;
  subject: string;
  createdAt: string;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [savedSearches, setSavedSearches] = useState<ListSavedSearchesResponse["data"]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [campaignResponse, savedSearchResponse] = await Promise.all([
        apiFetch<{ data: CampaignSummary[] }>("/api/v1/campaigns"),
        apiFetch<ListSavedSearchesResponse>("/api/v1/saved-searches"),
      ]);

      setCampaigns(campaignResponse.data);
      setSavedSearches(savedSearchResponse.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load campaigns.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const items = useMemo(
    () => buildCampaignsPageItems(campaigns, savedSearches),
    [campaigns, savedSearches],
  );

  const handleDeleteSavedSearch = useCallback(
    async (savedSearchId: string) => {
      setDeletingId(savedSearchId);
      setError(null);

      try {
        await apiFetch(`/api/v1/saved-searches/${savedSearchId}`, { method: "DELETE" });
        setSavedSearches((current) => current.filter((item) => item.id !== savedSearchId));
      } catch (deleteError) {
        setError(deleteError instanceof Error ? deleteError.message : "Failed to delete saved search.");
      } finally {
        setDeletingId(null);
      }
    },
    [],
  );

  const handleDeleteCampaign = useCallback(async (campaignId: string) => {
    setDeletingId(campaignId);
    setError(null);

    try {
      await apiFetch(`/api/v1/campaigns/${campaignId}`, { method: "DELETE" });
      setCampaigns((current) => current.filter((item) => item.id !== campaignId));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete campaign.");
    } finally {
      setDeletingId(null);
    }
  }, []);

  return (
    <main className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <PageHeader
          eyebrow="Outreach"
          title="Campaigns"
          description="Saved searches and multi-channel outreach for your organization."
          actions={
            <Link href="/search">
              <Button leftIcon={<Plus className="h-4 w-4" />}>Create from search</Button>
            </Link>
          }
        />

        {error ? <Alert title="Action failed">{error}</Alert> : null}

        {loading ? (
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Mail}
            title="No campaigns or saved searches yet"
            description="Complete a search and save the results, or create a campaign from your search results."
            action={
              <Link href="/search">
                <Button>Start a search</Button>
              </Link>
            }
          />
        ) : (
          <CampaignsPageList
            items={items}
            deletingId={deletingId}
            onDeleteSavedSearch={(savedSearchId) => void handleDeleteSavedSearch(savedSearchId)}
            onDeleteCampaign={(campaignId) => void handleDeleteCampaign(campaignId)}
          />
        )}
      </div>
    </main>
  );
}
