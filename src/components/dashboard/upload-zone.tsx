"use client";

import { useCallback, useRef, useState } from "react";
import { FileSpreadsheet, Loader2, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { assertCsvUpload } from "@/lib/csv/validate";
import { parseCsvFile } from "@/lib/csv/parse";
import type { ParsedDataset } from "@/lib/types";
import { cn } from "@/lib/utils";

interface UploadZoneProps {
  onDataset: (dataset: ParsedDataset) => void;
  onLoadDemo: () => Promise<void>;
  loadingDemo?: boolean;
}

export function UploadZone({ onDataset, onLoadDemo, loadingDemo }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setBusy(true);
      try {
        assertCsvUpload(file);
        const dataset = await parseCsvFile(file);
        onDataset(dataset);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to parse CSV");
      } finally {
        setBusy(false);
      }
    },
    [onDataset],
  );

  return (
    <Card id="upload">
      <CardHeader>
        <CardTitle>Dataset</CardTitle>
        <CardDescription>
          Upload a CSV or load the demo sales dataset to explore KPIs, charts, and AI insights.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) void handleFile(file);
          }}
          className={cn(
            "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
            dragging
              ? "border-[var(--primary)] bg-[var(--accent)]"
              : "border-[var(--border)] bg-[var(--muted)]/30",
          )}
        >
          <div className="rounded-full bg-[var(--accent)] p-3 text-[var(--accent-foreground)]">
            {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
          </div>
          <div>
            <p className="font-medium">Drop a CSV here</p>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Max 5 MB · headers required · dates, numbers & categories auto-detected
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              e.target.value = "";
            }}
          />
          <div className="flex flex-wrap justify-center gap-2">
            <Button type="button" onClick={() => inputRef.current?.click()} disabled={busy}>
              <FileSpreadsheet className="h-4 w-4" />
              Choose CSV
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void onLoadDemo()}
              disabled={busy || loadingDemo}
            >
              {loadingDemo ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Load Demo Dataset
            </Button>
          </div>
        </div>
        {error && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}