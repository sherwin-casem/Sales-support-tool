import { Search, Sparkles, Target } from "lucide-react";
import { SearchForm } from "@/components/search/SearchForm";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";

const steps = [
  {
    icon: Search,
    title: "Describe your ICP",
    description: "Use plain language to define industry, size, and geography.",
  },
  {
    icon: Sparkles,
    title: "AI discovers & enriches",
    description: "We crawl the web and extract structured company profiles.",
  },
  {
    icon: Target,
    title: "Engage decision-makers",
    description: "Generate outreach and track campaigns from one place.",
  },
];

export default function SearchPage() {
  return (
    <main className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-8">
        <PageHeader
          eyebrow="Sales Intelligence"
          title="Discover companies"
          description="Describe who you are looking for in plain language. We will discover, crawl, and enrich matching companies from public web data."
        />

        <Card padding="lg">
          <SearchForm />
        </Card>

        <section aria-label="How it works" className="grid gap-4 sm:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.title}
              className="rounded-[var(--radius-card)] border border-slate-200/80 bg-white p-4 shadow-[var(--shadow-card)]"
            >
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <step.icon className="h-4 w-4" aria-hidden="true" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900">{step.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{step.description}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
