import { z } from "zod";

export const MAX_CSV_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_PREVIEW_ROWS = 100;
export const REQUIRED_MIN_COLUMNS = 1;

export const uploadMetaSchema = z.object({
  name: z.string().min(1).max(200),
  size: z.number().int().positive().max(MAX_CSV_BYTES),
  type: z.string(),
});

export function isCsvFile(file: { name: string; type: string }): boolean {
  const lower = file.name.toLowerCase();
  const byExt = lower.endsWith(".csv");
  const byMime =
    file.type === "text/csv" ||
    file.type === "application/vnd.ms-excel" ||
    file.type === "application/csv" ||
    file.type === "text/plain" ||
    file.type === "";
  return byExt && byMime;
}

export function assertCsvUpload(file: File): void {
  if (!isCsvFile(file)) {
    throw new Error("Only CSV files are supported. Please upload a .csv file.");
  }
  if (file.size <= 0) {
    throw new Error("The uploaded file is empty.");
  }
  if (file.size > MAX_CSV_BYTES) {
    throw new Error(
      `File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Max size is 5 MB.`,
    );
  }
}