import type { LucideIcon } from "lucide-react";
import { MessageCircle, MousePointerClick, Reply, Send, Users, Eye } from "lucide-react";
import { engagementLabel } from "@/types/outreach/channel-labels";

interface CampaignStatsProps {
  statusCounts: Record<string, number>;
  channel?: string;
}

export function CampaignStats({ statusCounts, channel = "EMAIL" }: CampaignStatsProps) {
  const total = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
  const sent =
    (statusCounts.SENT ?? 0) +
    (statusCounts.DELIVERED ?? 0) +
    (statusCounts.OPENED ?? 0) +
    (statusCounts.CLICKED ?? 0) +
    (statusCounts.REPLIED ?? 0);
  const engaged = (statusCounts.OPENED ?? 0) + (statusCounts.CLICKED ?? 0) + (statusCounts.REPLIED ?? 0);
  const clicked = statusCounts.CLICKED ?? 0;
  const replied = statusCounts.REPLIED ?? 0;

  const cards: Array<{ label: string; value: number; icon: LucideIcon; accent: string }> = [
    { label: "Recipients", value: total, icon: Users, accent: "border-l-brand-500" },
    { label: "Sent", value: sent, icon: Send, accent: "border-l-blue-500" },
    {
      label: engagementLabel(channel),
      value: engaged,
      icon: Eye,
      accent: "border-l-emerald-500",
    },
  ];

  if (channel === "EMAIL") {
    cards.push({
      label: "Clicked",
      value: clicked,
      icon: MousePointerClick,
      accent: "border-l-violet-500",
    });
  } else {
    cards.push({
      label: "Replied",
      value: replied,
      icon: channel === "WHATSAPP" ? MessageCircle : Reply,
      accent: "border-l-violet-500",
    });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className={`surface-card border-l-4 ${card.accent} p-4`}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {card.label}
            </p>
            <card.icon className="h-4 w-4 text-slate-400" aria-hidden="true" />
          </div>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
