"use client";

import { Label, Select, Input } from "@/components/ui/form-controls";
import type { AnalyticsFilters, AnalyticsResult } from "@/lib/types";

interface FiltersBarProps {
  filters: AnalyticsFilters;
  analytics: AnalyticsResult;
  onChange: (next: AnalyticsFilters) => void;
}

export function FiltersBar({ filters, analytics, onChange }: FiltersBarProps) {
  return (
    <div className="grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)]/80 p-4 backdrop-blur sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-1.5">
        <Label htmlFor="dateFrom">Date from</Label>
        <Input
          id="dateFrom"
          type="date"
          value={filters.dateFrom ?? analytics.dateRange?.min ?? ""}
          min={analytics.dateRange?.min}
          max={analytics.dateRange?.max}
          onChange={(e) => onChange({ ...filters, dateFrom: e.target.value || undefined })}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="dateTo">Date to</Label>
        <Input
          id="dateTo"
          type="date"
          value={filters.dateTo ?? analytics.dateRange?.max ?? ""}
          min={analytics.dateRange?.min}
          max={analytics.dateRange?.max}
          onChange={(e) => onChange({ ...filters, dateTo: e.target.value || undefined })}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="category">Category</Label>
        <Select
          id="category"
          value={filters.category ?? "all"}
          onChange={(e) =>
            onChange({
              ...filters,
              category: e.target.value === "all" ? undefined : e.target.value,
            })
          }
        >
          <option value="all">All categories</option>
          {analytics.categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="region">Region</Label>
        <Select
          id="region"
          value={filters.region ?? "all"}
          onChange={(e) =>
            onChange({
              ...filters,
              region: e.target.value === "all" ? undefined : e.target.value,
            })
          }
        >
          <option value="all">All regions</option>
          {analytics.regions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}