"use client";

import { Select } from "@/components/ui/form-controls";
import type { ParsedDataset } from "@/lib/types";

interface DatasetSelectorProps {
  datasets: ParsedDataset[];
  activeId: string | null;
  onSelect: (id: string) => void;
}

export function DatasetSelector({ datasets, activeId, onSelect }: DatasetSelectorProps) {
  if (datasets.length === 0) return null;

  return (
    <div className="flex min-w-[200px] flex-col gap-1">
      <span className="text-[11px] uppercase tracking-wide text-[var(--muted-foreground)]">
        Dataset
      </span>
      <Select value={activeId ?? undefined} onChange={(e) => onSelect(e.target.value)}>
        {datasets.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name} ({d.rowCount} rows)
          </option>
        ))}
      </Select>
    </div>
  );
}