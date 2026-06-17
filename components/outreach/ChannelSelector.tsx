"use client";

import type { OutreachChannelValue } from "@/types/outreach/channel-labels";
import { OUTREACH_CHANNELS } from "@/types/outreach/channel-labels";

interface ChannelSelectorProps {
  value: OutreachChannelValue;
  onChange: (channel: OutreachChannelValue) => void;
  disabled?: boolean;
}

export function ChannelSelector({ value, onChange, disabled }: ChannelSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {OUTREACH_CHANNELS.map((channel) => (
        <button
          key={channel.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(channel.value)}
          className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
            value === channel.value
              ? "border-brand-500 bg-brand-50 text-brand-700"
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
          }`}
        >
          {channel.label}
        </button>
      ))}
    </div>
  );
}
