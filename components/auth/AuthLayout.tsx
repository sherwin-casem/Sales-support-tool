import type { ReactNode } from "react";
import { BarChart3, Search, Sparkles } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

const features = [
  {
    icon: Search,
    title: "Discover leads",
    description: "Find B2B companies from natural language search queries.",
  },
  {
    icon: Sparkles,
    title: "AI enrichment",
    description: "Extract profiles, contacts, and intent signals automatically.",
  },
  {
    icon: BarChart3,
    title: "Outreach & analytics",
    description: "Run campaigns and track performance from one workspace.",
  },
];

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-[42%] flex-col justify-between bg-slate-900 px-10 py-12 lg:flex xl:px-14">
        <Logo variant="light" />

        <div className="space-y-8">
          <div className="space-y-3">
            <h2 className="text-3xl font-semibold tracking-tight text-white">
              Sales intelligence for modern teams
            </h2>
            <p className="text-base leading-relaxed text-slate-400">
              Discover, enrich, and engage high-fit B2B accounts with AI-powered
              research and outreach.
            </p>
          </div>

          <ul className="space-y-5">
            {features.map((feature) => (
              <li key={feature.title} className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-600/20 text-brand-300 ring-1 ring-brand-500/30">
                  <feature.icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-medium text-white">{feature.title}</p>
                  <p className="mt-1 text-sm text-slate-400">{feature.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-slate-500">
          Trusted by sales teams for lead discovery and outreach.
        </p>
      </aside>

      <main className="flex flex-1 flex-col items-center justify-center bg-slate-50 px-4 py-10 sm:px-6">
        <div className="mb-8 lg:hidden">
          <Logo variant="dark" />
        </div>
        {children}
      </main>
    </div>
  );
}
