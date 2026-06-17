"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api/browser-client";
import { channelLabel } from "@/types/outreach/channel-labels";
import { CampaignStats } from "@/components/analytics/CampaignStats";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
} from "@/components/ui/DataTable";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { SkeletonCard, SkeletonTable } from "@/components/ui/Skeleton";

interface CampaignDetail {
  id: string;
  name: string;
  channel: string;
  status: string;
  subject: string;
  statusCounts: Record<string, number>;
  recipients: Array<{
    id: string;
    toAddress: string;
    toEmail: string;
    toName: string | null;
    status: string;
    errorMessage: string | null;
  }>;
}

const POLL_INTERVAL_MS = 3000;

function statusVariant(status: string): "default" | "success" | "warning" | "info" | "error" {
  switch (status) {
    case "COMPLETED":
    case "DELIVERED":
      return "success";
    case "RUNNING":
    case "SCHEDULED":
    case "SENT":
      return "info";
    case "FAILED":
    case "BOUNCED":
      return "error";
    case "PAUSED":
      return "warning";
    default:
      return "default";
  }
}

export default function CampaignDetailPage() {
  const params = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [scheduleAt, setScheduleAt] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadCampaign = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }

    try {
      const detail = await apiFetch<CampaignDetail>(`/api/v1/campaigns/${params.id}`);
      setCampaign(detail);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load campaign");
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [params.id]);

  useEffect(() => {
    void loadCampaign();
  }, [loadCampaign]);

  useEffect(() => {
    if (!campaign || campaign.status !== "RUNNING") {
      return;
    }

    const intervalId = window.setInterval(() => {
      void loadCampaign(false);
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [campaign?.status, loadCampaign]);

  async function handleSend() {
    setSending(true);
    setError(null);

    try {
      await apiFetch(`/api/v1/campaigns/${params.id}/send`, { method: "POST" });
      await loadCampaign(false);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Failed to send campaign");
    } finally {
      setSending(false);
    }
  }

  async function handlePause() {
    setPausing(true);
    setError(null);

    try {
      await apiFetch(`/api/v1/campaigns/${params.id}/pause`, { method: "POST" });
      await loadCampaign(false);
    } catch (pauseError) {
      setError(pauseError instanceof Error ? pauseError.message : "Failed to pause campaign");
    } finally {
      setPausing(false);
    }
  }

  async function handleSchedule() {
    if (!scheduleAt) {
      setError("Choose a schedule date and time.");
      return;
    }

    setScheduling(true);
    setError(null);

    try {
      await apiFetch(`/api/v1/campaigns/${params.id}/schedule`, {
        method: "POST",
        body: JSON.stringify({ scheduledAt: new Date(scheduleAt).toISOString() }),
      });
      await loadCampaign(false);
    } catch (scheduleError) {
      setError(
        scheduleError instanceof Error ? scheduleError.message : "Failed to schedule campaign",
      );
    } finally {
      setScheduling(false);
    }
  }

  return (
    <main className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {loading || !campaign ? (
          <>
            <SkeletonCard />
            <SkeletonTable rows={5} />
          </>
        ) : (
          <>
            <PageHeader
              eyebrow="Campaign"
              title={campaign.name}
              description={
                campaign.channel === "EMAIL"
                  ? campaign.subject
                  : `${channelLabel(campaign.channel)} outreach`
              }
              actions={
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="default">{channelLabel(campaign.channel)}</Badge>
                  <Badge variant={statusVariant(campaign.status)}>{campaign.status}</Badge>
                  {campaign.status === "RUNNING" ? (
                    <Button type="button" variant="secondary" onClick={() => void handlePause()} isLoading={pausing}>
                      Pause
                    </Button>
                  ) : null}
                  {campaign.status === "DRAFT" || campaign.status === "SCHEDULED" ? (
                    <Button type="button" onClick={() => void handleSend()} isLoading={sending}>
                      Send now
                    </Button>
                  ) : null}
                </div>
              }
            />

            {error ? <Alert variant="error">{error}</Alert> : null}

            {campaign.status === "RUNNING" ? (
              <Alert variant="info">Sending in progress. Recipient statuses refresh automatically.</Alert>
            ) : null}

            {campaign.status === "DRAFT" ? (
              <Card>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <Input
                    id="campaign-schedule-at"
                    label="Schedule send"
                    type="datetime-local"
                    value={scheduleAt}
                    onChange={(event) => setScheduleAt(event.target.value)}
                  />
                  <Button type="button" onClick={() => void handleSchedule()} isLoading={scheduling}>
                    Schedule
                  </Button>
                </div>
              </Card>
            ) : null}

            <CampaignStats statusCounts={campaign.statusCounts} channel={campaign.channel} />

            <Card padding="none">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="text-sm font-semibold text-slate-900">Recipients</h2>
              </div>
              <DataTable className="rounded-none border-0">
                <DataTableHead>
                  <DataTableHeaderCell>Recipient</DataTableHeaderCell>
                  <DataTableHeaderCell>Status</DataTableHeaderCell>
                  <DataTableHeaderCell>Error</DataTableHeaderCell>
                </DataTableHead>
                <DataTableBody>
                  {campaign.recipients.map((recipient) => (
                    <DataTableRow key={recipient.id}>
                      <DataTableCell>
                        {recipient.toName ? `${recipient.toName} — ` : ""}
                        {recipient.toAddress}
                      </DataTableCell>
                      <DataTableCell>
                        <Badge variant={statusVariant(recipient.status)}>{recipient.status}</Badge>
                      </DataTableCell>
                      <DataTableCell className="text-slate-500">
                        {recipient.errorMessage ?? "—"}
                      </DataTableCell>
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
