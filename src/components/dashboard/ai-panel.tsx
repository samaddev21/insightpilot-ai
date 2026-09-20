"use client";

import { useState } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/form-controls";
import type { AnalyticsFilters, ChatMessage, ParsedDataset } from "@/lib/types";
import { cn } from "@/lib/utils";

const EXAMPLES = [
  "Why did revenue decline in March?",
  "Which category generated the most revenue?",
  "Which region is performing best?",
  "What should management investigate?",
];

interface AiPanelProps {
  dataset: ParsedDataset | null;
  filters: AnalyticsFilters;
  messages: ChatMessage[];
  onMessagesChange: (messages: ChatMessage[]) => void;
}

export function AiPanel({ dataset, filters, messages, onMessagesChange }: AiPanelProps) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask(q: string) {
    if (!dataset || !q.trim()) return;
    setError(null);
    setLoading(true);
    const now = new Date().toISOString();
    const userMsg: ChatMessage = {
      id: `u_${crypto.randomUUID()}`,
      role: "user",
      content: q.trim(),
      createdAt: now,
    };
    onMessagesChange([...messages, userMsg]);
    setQuestion("");

    try {
      // Send dataset but server will summarize before LLM — never blind-forward raw CSV as prompt
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q.trim(), dataset, filters }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get insight");

      const assistantMsg: ChatMessage = {
        id: `a_${crypto.randomUUID()}`,
        role: "assistant",
        content: data.answer,
        createdAt: new Date().toISOString(),
      };
      onMessagesChange([...messages, userMsg, assistantMsg]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ask failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card id="ask" className="flex h-full min-h-[420px] flex-col">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-[var(--primary)] p-1.5 text-[var(--primary-foreground)]">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <CardTitle>Ask InsightPilot</CardTitle>
            <CardDescription>
              Answers use a compact dataset summary — not the full CSV — and only cite present metrics.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              disabled={!dataset || loading}
              onClick={() => void ask(ex)}
              className="rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-1.5 text-left text-xs text-[var(--muted-foreground)] transition hover:border-[var(--primary)] hover:text-[var(--foreground)] disabled:opacity-50"
            >
              {ex}
            </button>
          ))}
        </div>

        <div className="flex-1 space-y-3 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--muted)]/20 p-3">
          {!dataset && (
            <p className="text-sm text-[var(--muted-foreground)]">
              Load a dataset to start asking questions.
            </p>
          )}
          {dataset && messages.length === 0 && (
            <p className="text-sm text-[var(--muted-foreground)]">
              Try an example above, or ask your own question about revenue, categories, or regions.
            </p>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                m.role === "user"
                  ? "ml-8 bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "mr-4 bg-[var(--card)] border border-[var(--border)]",
              )}
            >
              {m.content}
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Summarizing dataset and generating insight…
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about your metrics…"
            className="min-h-[44px] resize-none"
            disabled={!dataset || loading}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void ask(question);
              }
            }}
          />
          <Button
            type="button"
            size="icon"
            disabled={!dataset || loading || !question.trim()}
            onClick={() => void ask(question)}
            aria-label="Send question"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}