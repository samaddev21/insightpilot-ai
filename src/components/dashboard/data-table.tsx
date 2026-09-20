"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/form-controls";
import type { ParsedDataset } from "@/lib/types";

interface DataTableProps {
  dataset: ParsedDataset;
  previewRows?: number;
}

export function DataTable({ dataset, previewRows = 50 }: DataTableProps) {
  const rows = dataset.rows.slice(0, previewRows);

  return (
    <Card id="table">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>Data preview</CardTitle>
          <CardDescription>
            Showing {rows.length} of {dataset.rowCount} rows · {dataset.columns.length} columns
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {dataset.profiles.map((p) => (
            <Badge key={p.name} className="bg-[var(--muted)] text-[var(--foreground)]">
              {p.name}: {p.type}
              {p.missingCount > 0 ? ` · ${p.missingCount} missing` : ""}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto rounded-lg border border-[var(--border)]">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="sticky top-0 bg-[var(--muted)]/90 backdrop-blur">
              <tr>
                {dataset.columns.map((col) => (
                  <th key={col} className="px-3 py-2 font-medium text-[var(--muted-foreground)]">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-t border-[var(--border)] hover:bg-[var(--muted)]/40">
                  {dataset.columns.map((col) => (
                    <td key={col} className="px-3 py-2 whitespace-nowrap">
                      {row[col] == null || row[col] === "" ? (
                        <span className="text-[var(--muted-foreground)]">—</span>
                      ) : (
                        String(row[col])
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {dataset.issues.length > 0 && (
          <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
            <p className="font-medium text-amber-800 dark:text-amber-200">
              {dataset.issues.length} validation issue(s)
            </p>
            <ul className="mt-2 max-h-28 list-disc space-y-1 overflow-auto pl-5 text-[var(--muted-foreground)]">
              {dataset.issues.slice(0, 8).map((issue, idx) => (
                <li key={idx}>
                  {issue.row >= 0 ? `Row ${issue.row}: ` : ""}
                  {issue.message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}