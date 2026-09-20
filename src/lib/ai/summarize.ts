import type { AnalyticsFilters, DatasetSummary, ParsedDataset } from "@/lib/types";
import { computeAnalytics } from "@/lib/analytics/engine";

/**
 * Builds a compact, LLM-safe summary of the dataset.
 * Never send raw CSV rows to the model.
 */
export function buildDatasetSummary(
  dataset: ParsedDataset,
  filters: AnalyticsFilters = {},
): DatasetSummary {
  const analytics = computeAnalytics(dataset, filters);

  const notes: string[] = [];
  const missing = dataset.profiles.filter((p) => p.missingCount > 0);
  if (missing.length) {
    notes.push(
      `Missing values detected in: ${missing
        .map((p) => `${p.name} (${(p.missingRate * 100).toFixed(1)}%)`)
        .join(", ")}.`,
    );
  }
  if (dataset.issues.length) {
    notes.push(`${dataset.issues.length} validation issue(s) found during CSV parsing.`);
  }
  notes.push(
    "Only discuss metrics present in this summary. Do not invent numbers not shown here.",
  );

  // Cap time series length for token safety
  const revenueOverTime = analytics.revenueOverTime.slice(-24);

  return {
    name: dataset.name,
    rowCount: dataset.rowCount,
    filteredRowCount: analytics.filteredRowCount,
    columns: dataset.profiles.map((p) => ({
      ...p,
      sampleValues: p.sampleValues.slice(0, 3),
    })),
    kpis: analytics.kpis,
    revenueOverTime,
    revenueByCategory: analytics.revenueByCategory.slice(0, 15),
    revenueByRegion: analytics.revenueByRegion.slice(0, 15),
    filters,
    notes,
  };
}

export function summaryToPromptBlock(summary: DatasetSummary): string {
  return JSON.stringify(
    {
      dataset: summary.name,
      rows: summary.rowCount,
      filteredRows: summary.filteredRowCount,
      filters: summary.filters,
      columnProfiles: summary.columns.map((c) => ({
        name: c.name,
        type: c.type,
        missingRate: Number(c.missingRate.toFixed(3)),
        uniqueCount: c.uniqueCount,
        min: c.min,
        max: c.max,
      })),
      kpis: {
        revenue: Number(summary.kpis.revenue.toFixed(2)),
        orders: summary.kpis.orders,
        customers: summary.kpis.customers,
        averageOrderValue: Number(summary.kpis.averageOrderValue.toFixed(2)),
        conversionRate: Number(summary.kpis.conversionRate.toFixed(2)),
      },
      revenueOverTime: summary.revenueOverTime.map((p) => ({
        period: p.date,
        revenue: Number(p.revenue.toFixed(2)),
        orders: p.orders,
      })),
      revenueByCategory: summary.revenueByCategory.map((p) => ({
        category: p.name,
        revenue: Number(p.value.toFixed(2)),
      })),
      revenueByRegion: summary.revenueByRegion.map((p) => ({
        region: p.name,
        revenue: Number(p.value.toFixed(2)),
      })),
      notes: summary.notes,
    },
    null,
    2,
  );
}