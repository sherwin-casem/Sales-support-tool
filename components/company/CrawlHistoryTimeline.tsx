import type { GetCompanyResponse } from "@/types/api/company.api.types";
import { formatCompleteness, formatDateTime } from "@/lib/utils/format-display";

interface CrawlHistoryTimelineProps {
  company: GetCompanyResponse;
}

interface TimelineEvent {
  id: string;
  title: string;
  description: string;
  timestamp: string;
}

export function CrawlHistoryTimeline({ company }: CrawlHistoryTimelineProps) {
  const events = buildTimelineEvents(company);

  return (
    <section
      aria-labelledby="crawl-history-heading"
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2 id="crawl-history-heading" className="text-lg font-semibold text-slate-900">
        Crawl history
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Website crawls and profile extraction versions over time.
      </p>

      {events.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">No crawl or extraction history yet.</p>
      ) : (
        <ol className="mt-6 space-y-4">
          {events.map((event, index) => (
            <li key={event.id} className="relative pl-6">
              {index < events.length - 1 ? (
                <span
                  aria-hidden="true"
                  className="absolute left-[7px] top-5 h-[calc(100%+0.5rem)] w-px bg-slate-200"
                />
              ) : null}
              <span
                aria-hidden="true"
                className="absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-brand-600 bg-white"
              />
              <div>
                <p className="text-sm font-medium text-slate-900">{event.title}</p>
                <p className="mt-1 text-sm text-slate-600">{event.description}</p>
                <time className="mt-1 block text-xs text-slate-500" dateTime={event.timestamp}>
                  {formatDateTime(event.timestamp)}
                </time>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function buildTimelineEvents(company: GetCompanyResponse): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  if (company.lastCrawledAt) {
    events.push({
      id: "last-crawled",
      title: "Website crawled",
      description: `Latest crawl completed for ${company.domain}.`,
      timestamp: company.lastCrawledAt,
    });
  }

  for (const profile of company.profileHistory) {
    events.push({
      id: `profile-${profile.version}`,
      title: `Profile v${profile.version} extracted`,
      description: `Structured profile saved with ${formatCompleteness(profile.completeness)} completeness.`,
      timestamp: profile.extractedAt,
    });
  }

  return events.sort(
    (left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
  );
}
