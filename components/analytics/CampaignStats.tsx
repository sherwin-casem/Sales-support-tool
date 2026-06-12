interface CampaignStatsProps {
  statusCounts: Record<string, number>;
}

export function CampaignStats({ statusCounts }: CampaignStatsProps) {
  const total = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
  const sent = (statusCounts.SENT ?? 0) + (statusCounts.DELIVERED ?? 0) + (statusCounts.OPENED ?? 0) + (statusCounts.CLICKED ?? 0);
  const opened = (statusCounts.OPENED ?? 0) + (statusCounts.CLICKED ?? 0);
  const clicked = statusCounts.CLICKED ?? 0;

  const cards = [
    { label: "Recipients", value: total },
    { label: "Sent", value: sent },
    { label: "Opened", value: opened },
    { label: "Clicked", value: clicked },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {card.label}
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{card.value}</p>
        </div>
      ))}
    </div>
  );
}
