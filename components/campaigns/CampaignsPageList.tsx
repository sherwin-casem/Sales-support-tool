"use client";

import Link from "next/link";
import { Bookmark, Mail, Trash2 } from "lucide-react";
import { outreachStatusLabel } from "@/services/domain/saved-search/outreach-status";
import { channelLabel } from "@/types/outreach/channel-labels";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { SavedSearchItemResponse } from "@/types/api/saved-search.api.types.js";
import type { SavedSearchOutreachStatus } from "@/types/repositories/saved-search.repository.types.js";

interface CampaignSummary {
  id: string;
  name: string;
  channel: string;
  status: string;
  subject: string;
  createdAt: string;
}

export type CampaignsPageItem =
  | {
      kind: "saved_search";
      sortDate: string;
      savedSearch: SavedSearchItemResponse;
    }
  | {
      kind: "campaign";
      sortDate: string;
      campaign: CampaignSummary;
    };

interface CampaignsPageListProps {
  items: CampaignsPageItem[];
  deletingId: string | null;
  onDeleteSavedSearch: (savedSearchId: string) => void;
  onDeleteCampaign: (campaignId: string) => void;
}

export function buildCampaignsPageItems(
  campaigns: CampaignSummary[],
  savedSearches: SavedSearchItemResponse[],
): CampaignsPageItem[] {
  const items: CampaignsPageItem[] = [
    ...savedSearches.map((savedSearch) => ({
      kind: "saved_search" as const,
      sortDate: savedSearch.savedAt,
      savedSearch,
    })),
    ...campaigns.map((campaign) => ({
      kind: "campaign" as const,
      sortDate: campaign.createdAt,
      campaign,
    })),
  ];

  return items.sort(
    (left, right) => new Date(right.sortDate).getTime() - new Date(left.sortDate).getTime(),
  );
}

export function CampaignsPageList({
  items,
  deletingId,
  onDeleteSavedSearch,
  onDeleteCampaign,
}: CampaignsPageListProps) {
  return (
    <div className="space-y-3">
      {items.map((item) =>
        item.kind === "saved_search" ? (
          <SavedSearchCard
            key={`saved-${item.savedSearch.id}`}
            savedSearch={item.savedSearch}
            deleting={deletingId === item.savedSearch.id}
            onDelete={() => onDeleteSavedSearch(item.savedSearch.id)}
          />
        ) : (
          <CampaignCard
            key={`campaign-${item.campaign.id}`}
            campaign={item.campaign}
            deleting={deletingId === item.campaign.id}
            onDelete={() => onDeleteCampaign(item.campaign.id)}
          />
        ),
      )}
    </div>
  );
}

function SavedSearchCard({
  savedSearch,
  deleting,
  onDelete,
}: {
  savedSearch: SavedSearchItemResponse;
  deleting: boolean;
  onDelete: () => void;
}) {
  return (
    <Card hover className="transition-colors hover:border-brand-200">
      <div className="flex items-start justify-between gap-4">
        <Link href={`/search/${savedSearch.searchJobId}`} className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Bookmark className="h-4 w-4 shrink-0 text-brand-600" />
            <p className="font-medium text-slate-900">{savedSearch.query}</p>
            <Badge variant="default">Saved search</Badge>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span>
              {savedSearch.leadCount} lead{savedSearch.leadCount === 1 ? "" : "s"}
            </span>
            <span aria-hidden="true">·</span>
            <Badge variant={outreachStatusVariant(savedSearch.outreachStatus)}>
              {outreachStatusLabel(savedSearch.outreachStatus)}
            </Badge>
            <span aria-hidden="true">·</span>
            <span>
              Saved{" "}
              {new Date(savedSearch.savedAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
        </Link>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          isLoading={deleting}
          leftIcon={<Trash2 className="h-4 w-4" />}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onDelete();
          }}
          aria-label={`Delete saved search ${savedSearch.query}`}
        >
          Delete
        </Button>
      </div>
    </Card>
  );
}

function CampaignCard({
  campaign,
  deleting,
  onDelete,
}: {
  campaign: CampaignSummary;
  deleting: boolean;
  onDelete: () => void;
}) {
  return (
    <Card hover className="transition-colors hover:border-brand-200">
      <div className="flex items-start justify-between gap-4">
        <Link href={`/campaigns/${campaign.id}`} className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Mail className="h-4 w-4 shrink-0 text-slate-500" />
            <p className="font-medium text-slate-900">{campaign.name}</p>
            <Badge variant="default">{channelLabel(campaign.channel)}</Badge>
            <Badge variant={campaignStatusVariant(campaign.status)}>{campaign.status}</Badge>
          </div>
          <p className="mt-1 truncate text-sm text-slate-600">
            {campaign.channel === "EMAIL" ? campaign.subject : channelLabel(campaign.channel)}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Created{" "}
            {new Date(campaign.createdAt).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </p>
        </Link>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          isLoading={deleting}
          leftIcon={<Trash2 className="h-4 w-4" />}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onDelete();
          }}
          aria-label={`Delete campaign ${campaign.name}`}
        >
          Delete
        </Button>
      </div>
    </Card>
  );
}

function outreachStatusVariant(
  status: SavedSearchOutreachStatus,
): "default" | "success" | "warning" | "info" | "error" {
  switch (status) {
    case "COMPLETED":
      return "success";
    case "IN_PROGRESS":
      return "info";
    default:
      return "default";
  }
}

function campaignStatusVariant(
  status: string,
): "default" | "success" | "warning" | "info" | "error" {
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
