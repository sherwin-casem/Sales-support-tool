"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/browser-client";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
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
    <main className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <PageHeader
          eyebrow="Administration"
          title="Services catalog"
          description="Configure the services catalog injected into AI outreach prompts."
        />

        <Card>
          <CardHeader>
            <CardTitle>Catalog JSON</CardTitle>
          </CardHeader>
          <form onSubmit={(event) => void handleSave(event)} className="space-y-4">
            <Textarea
              id="services-catalog"
              label="Services JSON"
              rows={18}
              value={json}
              onChange={(event) => setJson(event.target.value)}
            />
            <Button type="submit" variant={saved ? "secondary" : "primary"}>
              {saved ? "Saved" : "Save catalog"}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
