"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Sidebar, type NavId } from "@/components/layout/sidebar";
import { UploadZone } from "@/components/dashboard/upload-zone";
import { DatasetSelector } from "@/components/dashboard/dataset-selector";
import { FiltersBar } from "@/components/dashboard/filters";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { ChartsPanel } from "@/components/dashboard/charts";
import { DataTable } from "@/components/dashboard/data-table";
import { AiPanel } from "@/components/dashboard/ai-panel";
import { computeAnalytics } from "@/lib/analytics/engine";
import type { AnalyticsFilters, ChatMessage, ParsedDataset } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

export function DashboardApp() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeNav, setActiveNav] = useState<NavId>("overview");
  const [datasets, setDatasets] = useState<ParsedDataset[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filters, setFilters] = useState<AnalyticsFilters>({});
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const bootstrappedRef = useRef(false);

  const activeDataset = useMemo(
    () => datasets.find((d) => d.id === activeId) ?? null,
    [datasets, activeId],
  );

  const analytics = useMemo(
    () => (activeDataset ? computeAnalytics(activeDataset, filters) : null),
    [activeDataset, filters],
  );

  const addDataset = useCallback((dataset: ParsedDataset) => {
    setDatasets((prev) => {
      const without = prev.filter((d) => d.id !== dataset.id);
      return [dataset, ...without];
    });
    setActiveId(dataset.id);
    setFilters({});
    setMessages([]);
    setActiveNav("overview");
  }, []);

  const loadDemo = useCallback(async () => {
    setLoadingDemo(true);
    try {
      const res = await fetch("/api/demo");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load demo");
      addDataset(data.dataset as ParsedDataset);
    } finally {
      setLoadingDemo(false);
    }
  }, [addDataset]);

  useEffect(() => {
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;
    void loadDemo();
  }, [loadDemo]);

  function navigate(id: NavId) {
    setActiveNav(id);
    const el = document.getElementById(id === "overview" ? "kpis" : id);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <Sidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((v) => !v)}
        active={activeNav}
        onNavigate={navigate}
        datasetName={activeDataset?.name}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] bg-[var(--card)]/70 px-4 py-4 backdrop-blur-md sm:px-6">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-2xl tracking-tight sm:text-3xl">
              InsightPilot
            </h1>
            <p className="text-sm text-[var(--muted-foreground)]">
              Upload CSV business data, explore metrics, and ask natural-language questions.
            </p>
          </div>
          <DatasetSelector
            datasets={datasets}
            activeId={activeId}
            onSelect={(id) => {
              setActiveId(id);
              setFilters({});
              setMessages([]);
            }}
          />
        </header>

        <main className="relative flex-1 overflow-y-auto">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--hero-glow),_transparent_55%)]" />
          <div className="relative mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6">
            <UploadZone onDataset={addDataset} onLoadDemo={loadDemo} loadingDemo={loadingDemo} />

            {activeDataset && analytics && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-[var(--muted-foreground)]">
                  <p>
                    {formatNumber(analytics.filteredRowCount)} filtered rows ·{" "}
                    {formatNumber(activeDataset.rowCount)} total · source:{" "}
                    {activeDataset.source}
                  </p>
                </div>

                <FiltersBar filters={filters} analytics={analytics} onChange={setFilters} />

                <div id="kpis">
                  <KpiCards kpis={analytics.kpis} />
                </div>

                <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
                  <ChartsPanel analytics={analytics} />
                  <AiPanel
                    dataset={activeDataset}
                    filters={filters}
                    messages={messages}
                    onMessagesChange={setMessages}
                  />
                </div>

                <DataTable dataset={activeDataset} />
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}