import { AppShell } from "@/components/layout/AppShell";
import { SearchForm } from "@/components/search/SearchForm";

export default function SearchPage() {
  return (
    <AppShell>
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 space-y-2">
        <p className="text-sm font-medium uppercase tracking-wide text-brand-600">
          Sales Intelligence
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Discover companies
        </h1>
        <p className="max-w-2xl text-base text-slate-600">
          Describe who you are looking for in plain language. We will discover,
          crawl, and enrich matching companies from public web data.
        </p>
      </div>

      <section
        aria-labelledby="search-panel-heading"
        className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
      >
        <h2 id="search-panel-heading" className="sr-only">
          New search
        </h2>
        <SearchForm />
      </section>
    </main>
    </AppShell>
  );
}
