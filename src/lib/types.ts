export type ColumnType = "date" | "number" | "category" | "string" | "boolean";

export interface ColumnProfile {
  name: string;
  type: ColumnType;
  missingCount: number;
  missingRate: number;
  uniqueCount: number;
  sampleValues: string[];
  min?: number | string;
  max?: number | string;
}

export interface ValidationIssue {
  row: number;
  column?: string;
  message: string;
  severity: "error" | "warning";
}

export interface ParsedDataset {
  id: string;
  name: string;
  rows: Record<string, unknown>[];
  columns: string[];
  profiles: ColumnProfile[];
  issues: ValidationIssue[];
  rowCount: number;
  validRowCount: number;
  source: "upload" | "demo";
  createdAt: string;
}

export interface AnalyticsFilters {
  dateFrom?: string;
  dateTo?: string;
  category?: string;
  region?: string;
}

export interface KpiSet {
  revenue: number;
  orders: number;
  customers: number;
  averageOrderValue: number;
  conversionRate: number;
}

export interface TimePoint {
  date: string;
  revenue: number;
  orders: number;
}

export interface NamedValue {
  name: string;
  value: number;
}

export interface AnalyticsResult {
  kpis: KpiSet;
  revenueOverTime: TimePoint[];
  ordersOverTime: TimePoint[];
  revenueByCategory: NamedValue[];
  revenueByRegion: NamedValue[];
  categories: string[];
  regions: string[];
  dateRange: { min: string; max: string } | null;
  filteredRowCount: number;
}

export interface DatasetSummary {
  name: string;
  rowCount: number;
  filteredRowCount: number;
  columns: ColumnProfile[];
  kpis: KpiSet;
  revenueOverTime: TimePoint[];
  revenueByCategory: NamedValue[];
  revenueByRegion: NamedValue[];
  filters: AnalyticsFilters;
  notes: string[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}