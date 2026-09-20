import type { ColumnProfile, ColumnType } from "@/lib/types";

const DATE_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}$/,
  /^\d{4}\/\d{2}\/\d{2}$/,
  /^\d{1,2}\/\d{1,2}\/\d{2,4}$/,
  /^\d{1,2}-\d{1,2}-\d{2,4}$/,
];

function isMissing(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  const s = String(value).trim();
  return s === "" || s.toLowerCase() === "null" || s.toLowerCase() === "na" || s.toLowerCase() === "n/a";
}

function isBooleanLike(value: string): boolean {
  const v = value.trim().toLowerCase();
  return ["true", "false", "yes", "no", "0", "1"].includes(v);
}

function isNumberLike(value: string): boolean {
  const cleaned = value.replace(/[$,\s]/g, "").trim();
  if (!cleaned) return false;
  return /^-?\d+(\.\d+)?%?$/.test(cleaned) && !Number.isNaN(Number(cleaned.replace("%", "")));
}

function isDateLike(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (DATE_PATTERNS.some((p) => p.test(v))) {
    const t = Date.parse(v);
    return !Number.isNaN(t);
  }
  // ISO datetime
  if (/^\d{4}-\d{2}-\d{2}T/.test(v)) {
    return !Number.isNaN(Date.parse(v));
  }
  return false;
}

function scoreType(values: string[]): ColumnType {
  const nonEmpty = values.filter((v) => !isMissing(v));
  if (nonEmpty.length === 0) return "string";

  let dateHits = 0;
  let numberHits = 0;
  let boolHits = 0;

  for (const v of nonEmpty) {
    if (isDateLike(v)) dateHits += 1;
    else if (isBooleanLike(v)) boolHits += 1;
    else if (isNumberLike(v)) numberHits += 1;
  }

  const n = nonEmpty.length;
  if (dateHits / n >= 0.8) return "date";
  if (numberHits / n >= 0.8) return "number";
  if (boolHits / n >= 0.8) return "boolean";

  const unique = new Set(nonEmpty.map((v) => v.trim()));
  if (unique.size <= Math.max(20, Math.floor(n * 0.3)) && unique.size < n) {
    return "category";
  }
  return "string";
}

export function detectColumnProfiles(
  columns: string[],
  rows: Record<string, unknown>[],
): ColumnProfile[] {
  return columns.map((name) => {
    const rawValues = rows.map((row) => row[name]);
    const asStrings = rawValues.map((v) => (v == null ? "" : String(v)));
    const missingCount = asStrings.filter((v) => isMissing(v)).length;
    const nonMissing = asStrings.filter((v) => !isMissing(v));
    const type = scoreType(asStrings);
    const uniqueCount = new Set(nonMissing.map((v) => v.trim())).size;

    const profile: ColumnProfile = {
      name,
      type,
      missingCount,
      missingRate: rows.length === 0 ? 0 : missingCount / rows.length,
      uniqueCount,
      sampleValues: nonMissing.slice(0, 5),
    };

    if (type === "number") {
      const nums = nonMissing
        .map((v) => Number(v.replace(/[$,%\s]/g, "")))
        .filter((n) => !Number.isNaN(n));
      if (nums.length) {
        profile.min = Math.min(...nums);
        profile.max = Math.max(...nums);
      }
    }

    if (type === "date") {
      const dates = nonMissing
        .map((v) => Date.parse(v))
        .filter((t) => !Number.isNaN(t))
        .sort((a, b) => a - b);
      if (dates.length) {
        profile.min = new Date(dates[0]).toISOString().slice(0, 10);
        profile.max = new Date(dates[dates.length - 1]).toISOString().slice(0, 10);
      }
    }

    return profile;
  });
}

export function coerceRow(
  row: Record<string, unknown>,
  profiles: ColumnProfile[],
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...row };
  for (const profile of profiles) {
    const raw = row[profile.name];
    if (raw == null || String(raw).trim() === "") {
      out[profile.name] = null;
      continue;
    }
    const s = String(raw).trim();
    if (profile.type === "number") {
      const n = Number(s.replace(/[$,%\s]/g, ""));
      out[profile.name] = Number.isNaN(n) ? null : n;
    } else if (profile.type === "date") {
      const t = Date.parse(s);
      out[profile.name] = Number.isNaN(t) ? null : new Date(t).toISOString().slice(0, 10);
    } else if (profile.type === "boolean") {
      const v = s.toLowerCase();
      out[profile.name] = ["true", "yes", "1"].includes(v);
    } else {
      out[profile.name] = s;
    }
  }
  return out;
}