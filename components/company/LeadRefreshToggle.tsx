"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/browser-client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface LeadRefreshToggleProps {
  companyId: string;
}

interface RefreshSchedule {
  enabled: boolean;
  intervalDays: number;
  nextRunAt: string | null;
}

export function LeadRefreshToggle({ companyId }: LeadRefreshToggleProps) {
  const [schedule, setSchedule] = useState<RefreshSchedule | null>(null);
  const [intervalDays, setIntervalDays] = useState(30);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void apiFetch<RefreshSchedule | null>(
      `/api/v1/companies/${companyId}/refresh-schedule`,
    ).then((value) => {
      if (value) {
        setSchedule(value);
        setIntervalDays(value.intervalDays);
      }
    });
  }, [companyId]);

  async function saveSchedule(enabled: boolean) {
    setLoading(true);
    try {
      const saved = await apiFetch<RefreshSchedule>(
        `/api/v1/companies/${companyId}/refresh-schedule`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled, intervalDays }),
        },
      );
      setSchedule(saved);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 p-4">
      <h3 className="text-sm font-semibold text-slate-900">Auto-refresh</h3>
      <p className="mt-1 text-sm text-slate-600">
        Re-enrich this lead on a schedule to keep intent signals fresh.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <Input
          id={`refresh-interval-${companyId}`}
          label="Every N days"
          type="number"
          min={7}
          max={90}
          value={intervalDays}
          onChange={(event) => setIntervalDays(Number(event.target.value))}
        />
        <Button
          type="button"
          disabled={loading}
          onClick={() => void saveSchedule(!(schedule?.enabled ?? false))}
        >
          {schedule?.enabled ? "Disable" : "Enable"}
        </Button>
      </div>
      {schedule?.enabled && schedule.nextRunAt ? (
        <p className="mt-2 text-xs text-slate-500">
          Next refresh: {new Date(schedule.nextRunAt).toLocaleString()}
        </p>
      ) : null}
    </section>
  );
}
