"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api/browser-client";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";

interface OutreachComposerProps {
  companyId: string;
  searchResultId?: string;
}

interface GeneratedMessage {
  id: string;
  subject: string;
  bodyText: string;
  bodyHtml: string | null;
}

export function OutreachComposer({ companyId, searchResultId }: OutreachComposerProps) {
  const [subject, setSubject] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    setError(null);

    try {
      const message = await apiFetch<GeneratedMessage>("/api/v1/outreach/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          searchResultId,
          tone: "professional",
          channel: "EMAIL",
        }),
      });

      setSubject(message.subject);
      setBodyText(message.bodyText);
    } catch (generateError) {
      setError(
        generateError instanceof Error ? generateError.message : "Failed to generate message",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    const text = `Subject: ${subject}\n\n${bodyText}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="rounded-xl border border-slate-200 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900">Outreach message</h3>
        <Button type="button" variant="secondary" onClick={() => void handleGenerate()} disabled={loading}>
          {loading ? "Generating..." : "Generate with AI"}
        </Button>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className="mt-4 space-y-3">
        <Input
          id={`outreach-subject-${companyId}`}
          label="Subject"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
        />
        <Textarea
          id={`outreach-body-${companyId}`}
          label="Message"
          rows={8}
          value={bodyText}
          onChange={(event) => setBodyText(event.target.value)}
        />
        {subject || bodyText ? (
          <Button type="button" variant="secondary" onClick={() => void handleCopy()}>
            {copied ? "Copied" : "Copy to clipboard"}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
