import type {
  AnalyticsFilters,
  AnalyticsResult,
  ColumnProfile,
  KpiSet,
  NamedValue,
  ParsedDataset,
  TimePoint,
} from "@/lib/types";

function findColumn(
  profiles: ColumnProfile[],
  candidates: string[],
  type?: ColumnProfile["type"],
): string | null {
  const lower = candidates.map((c) => c.toLowerCase());
  const exact = profiles.find(
    (p) => lower.includes(p.name.toLowerCase()) && (!type || p.type === type),
  );
  if (exact) return exact.name;

  const fuzzy = profiles.find((p) => {
    const n = p.name.toLowerCase();
    return lower.some((c) => n.includes(c)) && (!type || p.type === type || p.type === "string");
  });
  return fuzzy?.name ?? null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string") {
    const n = Number(value.replace(/[$,%\s]/g, ""));
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

function resolveColumns(dataset: ParsedDataset) {
  const { profiles } = dataset;
  const dateCol =
    findColumn(profiles, ["date", "order_date", "created_at", "timestamp"], "date") ??
    profiles.find((p) => p.type === "date")?.name ??
    null;
  const revenueCol =
    findColumn(profiles, ["revenue", "sales", "amount", "total", "gmv"]) ??
    profiles.find((p) => p.type === "number" && /rev|sales|amount|total/i.test(p.name))?.name ??
    null;
  const categoryCol =
    findColumn(profiles, ["category", "product_category", "segment"]) ??
    profiles.find((p) => p.type === "category" && /cat|segment/i.test(p.name))?.name ??
    null;
  const regionCol =
    findColumn(profiles, ["region", "country", "market", "geo"]) ??
    profiles.find((p) => p.type === "category" && /region|country|market|geo/i.test(p.name))
      ?.name ??
    null;
  const customerCol =
    findColumn(profiles, ["customer_id", "customer", "user_id", "client_id"]) ?? null;
  const statusCol = findColumn(profiles, ["status", "order_status", "converted"]) ?? null;
  const orderCol =
    findColumn(profiles, ["order_id", "order", "id", "transaction_id"]) ?? null;

  return { dateCol, revenueCol, categoryCol, regionCol, customerCol, statusCol, orderCol };
}

export function applyFilters(
  dataset: ParsedDataset,
  filters: AnalyticsFilters,
): Record<string, unknown>[] {
  const { dateCol, categoryCol, regionCol } = resolveColumns(dataset);

  return dataset.rows.filter((row) => {
    if (dateCol && filters.dateFrom) {
      const d = String(row[dateCol] ?? "");
      if (!d || d < filters.dateFrom) return false;
    }
    if (dateCol && filters.dateTo) {
      const d = String(row[dateCol] ?? "");
      if (!d || d > filters.dateTo) return false;
    }
    if (categoryCol && filters.category && filters.category !== "all") {
      if (String(row[categoryCol] ?? "") !== filters.category) return false;
    }
    if (regionCol && filters.region && filters.region !== "all") {
      if (String(row[regionCol] ?? "") !== filters.region) return false;
    }
    return true;
  });
}

function computeKpis(
  rows: Record<string, unknown>[],
  cols: ReturnType<typeof resolveColumns>,
): KpiSet {
  const { revenueCol, customerCol, statusCol, orderCol } = cols;

  let revenue = 0;
  const customers = new Set<string>();
  let completed = 0;
  let considered = 0;

  for (const row of rows) {
    if (revenueCol) {
      const n = toNumber(row[revenueCol]);
      // Only count completed revenue when status exists and is cancelled
      const status = statusCol ? String(row[statusCol] ?? "").toLowerCase() : "completed";
      if (status === "cancelled" || status === "canceled" || status === "false") {
        // skip revenue for cancelled
      } else if (n != null) {
        revenue += n;
      }
    }

    if (customerCol && row[customerCol] != null && row[customerCol] !== "") {
      customers.add(String(row[customerCol]));
    }

    if (statusCol) {
      considered += 1;
      const status = String(row[statusCol] ?? "").toLowerCase();
      if (
        status === "completed" ||
        status === "converted" ||
        status === "true" ||
        status === "yes" ||
        status === "1"
      ) {
        completed += 1;
      }
    }
  }

  const orders = orderCol
    ? new Set(rows.map((r) => String(r[orderCol] ?? "")).filter(Boolean)).size || rows.length
    : rows.length;

  const averageOrderValue = orders > 0 ? revenue / orders : 0;
  const conversionRate = considered > 0 ? (completed / considered) * 100 : 100;

  return {
    revenue,
    orders,
    customers: customers.size || rows.length,
    averageOrderValue,
    conversionRate,
  };
}

function groupByTime(
  rows: Record<string, unknown>[],
  dateCol: string,
  revenueCol: string | null,
  statusCol: string | null,
): TimePoint[] {
  const map = new Map<string, TimePoint>();

  for (const row of rows) {
    const date = String(row[dateCol] ?? "").slice(0, 10);
    if (!date) continue;
    const monthKey = date.slice(0, 7); // aggregate by month for readability
    const current = map.get(monthKey) ?? { date: monthKey, revenue: 0, orders: 0 };
    current.orders += 1;

    const status = statusCol ? String(row[statusCol] ?? "").toLowerCase() : "completed";
    const cancelled =
      status === "cancelled" || status === "canceled" || status === "false";
    if (!cancelled && revenueCol) {
      const n = toNumber(row[revenueCol]);
      if (n != null) current.revenue += n;
    }
    map.set(monthKey, current);
  }

  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function groupSum(
  rows: Record<string, unknown>[],
  groupCol: string,
  revenueCol: string | null,
  statusCol: string | null,
): NamedValue[] {
  const map = new Map<string, number>();
  for (const row of rows) {
    const name = String(row[groupCol] ?? "Unknown");
    const status = statusCol ? String(row[statusCol] ?? "").toLowerCase() : "completed";
    if (status === "cancelled" || status === "canceled" || status === "false") continue;
    const n = revenueCol ? toNumber(row[revenueCol]) : 1;
    if (n == null) continue;
    map.set(name, (map.get(name) ?? 0) + n);
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export function computeAnalytics(
  dataset: ParsedDataset,
  filters: AnalyticsFilters = {},
): AnalyticsResult {
  const cols = resolveColumns(dataset);
  const filtered = applyFilters(dataset, filters);

  const categories = cols.categoryCol
    ? [...new Set(dataset.rows.map((r) => String(r[cols.categoryCol!] ?? "")).filter(Boolean))].sort()
    : [];
  const regions = cols.regionCol
    ? [...new Set(dataset.rows.map((r) => String(r[cols.regionCol!] ?? "")).filter(Boolean))].sort()
    : [];

  let dateRange: AnalyticsResult["dateRange"] = null;
  if (cols.dateCol) {
    const dates = dataset.rows
      .map((r) => String(r[cols.dateCol!] ?? ""))
      .filter(Boolean)
      .sort();
    if (dates.length) dateRange = { min: dates[0], max: dates[dates.length - 1] };
  }

  const kpis = computeKpis(filtered, cols);
  const revenueOverTime = cols.dateCol
    ? groupByTime(filtered, cols.dateCol, cols.revenueCol, cols.statusCol)
    : [];
  const ordersOverTime = revenueOverTime.map((p) => ({
    date: p.date,
    revenue: p.revenue,
    orders: p.orders,
  }));
  const revenueByCategory = cols.categoryCol
    ? groupSum(filtered, cols.categoryCol, cols.revenueCol, cols.statusCol)
    : [];
  const revenueByRegion = cols.regionCol
    ? groupSum(filtered, cols.regionCol, cols.revenueCol, cols.statusCol)
    : [];

  return {
    kpis,
    revenueOverTime,
    ordersOverTime,
    revenueByCategory,
    revenueByRegion,
    categories,
    regions,
    dateRange,
    filteredRowCount: filtered.length,
  };
}

export { resolveColumns };