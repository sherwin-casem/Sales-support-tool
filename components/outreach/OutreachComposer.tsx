"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api/browser-client";
import { resolveOutreachBodyHtml } from "@/lib/validations/outreach-message.schema";
import type { OutreachChannelValue } from "@/lib/outreach/channel-labels";
import { ChannelSelector } from "@/components/outreach/ChannelSelector";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";

interface OutreachComposerProps {
  companyId: string;
  searchResultId?: string;
  companyLabel?: string;
  contactPreview?: Partial<Record<OutreachChannelValue, string | null>>;
  onCampaignCreated?: (campaignId: string) => void;
}

interface GeneratedMessage {
  id: string;
  subject: string;
  bodyText: string;
  bodyHtml: string | null;
  toAddress: string | null;
}

interface CampaignSummary {
  id: string;
  status: string;
}

export function OutreachComposer({
  companyId,
  searchResultId,
  companyLabel,
  contactPreview,
  onCampaignCreated,
}: OutreachComposerProps) {
  const [channel, setChannel] = useState<OutreachChannelValue>("EMAIL");
  const [subject, setSubject] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [toAddress, setToAddress] = useState<string | null>(null);
  const [showHtmlPreview, setShowHtmlPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [campaignLoading, setCampaignLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const resolvedContact = toAddress ?? contactPreview?.[channel] ?? null;
  const requiresSubject = channel === "EMAIL";
  const canSend = Boolean(bodyText.trim() && (!requiresSubject || subject.trim()) && resolvedContact);

  async function handleGenerate() {
    setLoading(true);
    setError(null);

    try {
      const message = await apiFetch<GeneratedMessage>("/api/v1/outreach/messages", {
        method: "POST",
        body: JSON.stringify({
          companyId,
          searchResultId,
          tone: "professional",
          channel,
        }),
      });

      setSubject(message.subject);
      setBodyText(message.bodyText);
      setBodyHtml(
        channel === "EMAIL"
          ? resolveOutreachBodyHtml(message.bodyText, message.bodyHtml)
          : "",
      );
      setToAddress(message.toAddress);
    } catch (generateError) {
      setError(
        generateError instanceof Error ? generateError.message : "Failed to generate message",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    const text =
      channel === "EMAIL" ? `Subject: ${subject}\n\n${bodyText}` : bodyText;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function createCampaign(sendAfterCreate: boolean) {
    if (!canSend) {
      return;
    }

    setCampaignLoading(true);
    setError(null);

    try {
      const html =
        channel === "EMAIL" ? bodyHtml || resolveOutreachBodyHtml(bodyText, null) : "";
      const campaign = await apiFetch<CampaignSummary>("/api/v1/campaigns", {
        method: "POST",
        body: JSON.stringify({
          name: companyLabel ? `Outreach: ${companyLabel}` : "Single-lead outreach",
          channel,
          subject: requiresSubject ? subject : "",
          bodyHtml: html,
          bodyText,
          searchResultIds: searchResultId ? [searchResultId] : undefined,
          companyIds: searchResultId ? undefined : [companyId],
        }),
      });

      if (sendAfterCreate) {
        await apiFetch(`/api/v1/campaigns/${campaign.id}/send`, { method: "POST" });
      }

      if (onCampaignCreated) {
        onCampaignCreated(campaign.id);
      } else if (typeof window !== "undefined") {
        window.location.assign(`/campaigns/${campaign.id}`);
      }
    } catch (campaignError) {
      setError(
        campaignError instanceof Error ? campaignError.message : "Failed to create campaign",
      );
    } finally {
      setCampaignLoading(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 p-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Outreach message</h3>
        <ChannelSelector value={channel} onChange={setChannel} disabled={loading || campaignLoading} />
      </div>

      {resolvedContact ? (
        <p className="mb-3 text-sm text-slate-600">
          Send to: <span className="font-medium text-slate-900">{resolvedContact}</span>
        </p>
      ) : (
        <Alert variant="warning" className="mb-3">
          No valid contact found for {channel.toLowerCase()} on this lead.
        </Alert>
      )}

      <div className="mb-4 flex justify-end">
        <Button type="button" variant="secondary" onClick={() => void handleGenerate()} disabled={loading}>
          {loading ? "Generating..." : "Generate with AI"}
        </Button>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className="mt-4 space-y-3">
        {requiresSubject ? (
          <Input
            id={`outreach-subject-${companyId}`}
            label="Subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
          />
        ) : null}
        <Textarea
          id={`outreach-body-${companyId}`}
          label="Message"
          rows={8}
          value={bodyText}
          onChange={(event) => setBodyText(event.target.value)}
        />

        {bodyHtml ? (
          <div className="space-y-2">
            <Button
              type="button"
              variant="ghost"
              className="px-0 text-sm"
              onClick={() => setShowHtmlPreview((current) => !current)}
            >
              {showHtmlPreview ? "Hide HTML preview" : "Show HTML preview"}
            </Button>
            {showHtmlPreview ? (
              <div
                className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"
                dangerouslySetInnerHTML={{ __html: bodyHtml }}
              />
            ) : null}
          </div>
        ) : null}

        {bodyText.trim() ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => void handleCopy()}>
              {copied ? "Copied" : "Copy to clipboard"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={campaignLoading || !canSend}
              onClick={() => void createCampaign(false)}
            >
              {campaignLoading ? "Creating..." : "Create campaign"}
            </Button>
            <Button
              type="button"
              disabled={campaignLoading || !canSend}
              onClick={() => void createCampaign(true)}
            >
              {campaignLoading ? "Sending..." : "Send to this lead"}
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
