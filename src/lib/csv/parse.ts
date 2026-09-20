import Papa from "papaparse";
import { detectColumnProfiles, coerceRow } from "@/lib/csv/detect";
import type { ParsedDataset, ValidationIssue } from "@/lib/types";

export interface ParseCsvOptions {
  name: string;
  source?: "upload" | "demo";
  id?: string;
}

function createId(): string {
  return `ds_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function parseCsvText(csvText: string, options: ParseCsvOptions): ParsedDataset {
  if (!csvText || !csvText.trim()) {
    throw new Error("CSV content is empty.");
  }

  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    transformHeader: (h) => h.trim(),
  });

  const issues: ValidationIssue[] = [];

  for (const err of parsed.errors) {
    issues.push({
      row: typeof err.row === "number" ? err.row + 1 : -1,
      message: err.message,
      severity: err.type === "Quotes" || err.type === "FieldMismatch" ? "error" : "warning",
    });
  }

  const columns = (parsed.meta.fields ?? []).filter(Boolean);
  if (columns.length === 0) {
    throw new Error("No columns detected. Ensure the CSV has a header row.");
  }

  const duplicateHeaders = columns.filter((c, i) => columns.indexOf(c) !== i);
  if (duplicateHeaders.length) {
    issues.push({
      row: 0,
      message: `Duplicate column headers: ${[...new Set(duplicateHeaders)].join(", ")}`,
      severity: "error",
    });
  }

  // Inspect pre-filter rows for mostly-empty / malformed content (greedy skip removes blanks later)
  const preFilterRows = parsed.data ?? [];
  preFilterRows.forEach((row, idx) => {
    const values = columns.map((c) => row[c]);
    const nonEmpty = values.filter((v) => String(v ?? "").trim() !== "").length;
    if (nonEmpty === 0) {
      issues.push({
        row: idx + 1,
        message: "Row is mostly empty and may be malformed.",
        severity: "warning",
      });
      return;
    }
    const emptyRatio = (values.length - nonEmpty) / Math.max(values.length, 1);
    if (emptyRatio >= 0.8) {
      issues.push({
        row: idx + 1,
        message: "Row is mostly empty and may be malformed.",
        severity: "warning",
      });
    }
  });

  const rawRows = preFilterRows.filter((row) =>
    Object.values(row).some((v) => String(v ?? "").trim() !== ""),
  );

  const profiles = detectColumnProfiles(columns, rawRows);
  const rows = rawRows.map((row) => coerceRow(row, profiles));

  // Count rows with at least one non-null value after coercion
  const validRowCount = rows.filter((row) =>
    Object.values(row).some((v) => v !== null && v !== undefined && v !== ""),
  ).length;

  return {
    id: options.id ?? createId(),
    name: options.name,
    rows,
    columns,
    profiles,
    issues,
    rowCount: rows.length,
    validRowCount,
    source: options.source ?? "upload",
    createdAt: new Date().toISOString(),
  };
}

export async function parseCsvFile(file: File): Promise<ParsedDataset> {
  const text = await file.text();
  return parseCsvText(text, { name: file.name, source: "upload" });
}