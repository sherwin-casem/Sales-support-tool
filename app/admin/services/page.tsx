"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { apiFetch } from "@/lib/api/browser-client";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";

export default function AdminServicesPage() {
  const [json, setJson] = useState("[]");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void apiFetch<{ servicesCatalog: unknown }>("/api/v1/admin/services").then((response) => {
      setJson(JSON.stringify(response.servicesCatalog, null, 2));
    });
  }, []);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    const servicesCatalog = JSON.parse(json) as unknown;
    await apiFetch("/api/v1/admin/services", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ servicesCatalog }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold text-slate-900">Parijat services catalog</h1>
        <p className="mt-1 text-sm text-slate-600">
          This catalog is injected into AI outreach prompts.
        </p>

        <form onSubmit={(event) => void handleSave(event)} className="mt-6 space-y-4">
          <Textarea
            id="services-catalog"
            label="Services JSON"
            rows={18}
            value={json}
            onChange={(event) => setJson(event.target.value)}
          />
          <Button type="submit">{saved ? "Saved" : "Save catalog"}</Button>
        </form>
      </main>
    </AppShell>
  );
}
