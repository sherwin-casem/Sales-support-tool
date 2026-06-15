"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api/browser-client";
import { resolveOutreachBodyHtml } from "@/lib/validations/outreach-message.schema";
import type { OutreachChannelValue } from "@/lib/outreach/channel-labels";
import { ChannelSelector } from "@/components/outreach/ChannelSelector";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Alert } from "@/components/ui/Alert";

interface CampaignCreateModalProps {
  open: boolean;
  searchResultIds: string[];
  onClose: () => void;
  onCampaignCreated?: (campaignId: string) => void;
}

interface CampaignSummary {
  id: string;
  status: string;
}

export function CampaignCreateModal({
  open,
  searchResultIds,
  onClose,
  onCampaignCreated,
}: CampaignCreateModalProps) {
  const [channel, setChannel] = useState<OutreachChannelValue>("EMAIL");
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return null;
  }

  async function handleSubmit(sendAfterCreate: boolean) {
    if (!name.trim() || !bodyText.trim()) {
      setError("Campaign name and message are required.");
      return;
    }

    if (channel === "EMAIL" && !subject.trim()) {
      setError("Subject is required for email campaigns.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const campaign = await apiFetch<CampaignSummary>("/api/v1/campaigns", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          channel,
          subject: channel === "EMAIL" ? subject.trim() : "",
          bodyHtml:
            channel === "EMAIL" ? resolveOutreachBodyHtml(bodyText.trim(), null) : "",
          bodyText: bodyText.trim(),
          searchResultIds,
        }),
      });

      if (sendAfterCreate) {
        await apiFetch(`/api/v1/campaigns/${campaign.id}/send`, { method: "POST" });
      }

      onClose();

      if (onCampaignCreated) {
        onCampaignCreated(campaign.id);
      } else if (typeof window !== "undefined") {
        window.location.assign(`/campaigns/${campaign.id}`);
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Failed to create campaign",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="campaign-create-title"
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="campaign-create-title" className="text-lg font-semibold text-slate-900">
              Create campaign
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {searchResultIds.length} selected lead{searchResultIds.length === 1 ? "" : "s"}
            </p>
          </div>
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
            Close
          </Button>
        </div>

        <div className="mb-4">
          <p className="mb-2 text-sm font-medium text-slate-700">Channel</p>
          <ChannelSelector value={channel} onChange={setChannel} disabled={loading} />
        </div>

        {error ? <Alert variant="error">{error}</Alert> : null}

        <div className="mt-4 space-y-3">
          <Input
            id="campaign-name"
            label="Campaign name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          {channel === "EMAIL" ? (
            <Input
              id="campaign-subject"
              label="Subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
            />
          ) : null}
          <Textarea
            id="campaign-body"
            label="Message"
            rows={8}
            value={bodyText}
            onChange={(event) => setBodyText(event.target.value)}
          />
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={loading}
            onClick={() => void handleSubmit(false)}
          >
            {loading ? "Creating..." : "Create draft"}
          </Button>
          <Button type="button" disabled={loading} onClick={() => void handleSubmit(true)}>
            {loading ? "Sending..." : "Create & send"}
          </Button>
        </div>
      </div>
    </div>
  );
}
