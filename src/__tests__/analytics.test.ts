import { describe, expect, it } from "vitest";
import { parseCsvText } from "@/lib/csv/parse";
import { computeAnalytics, applyFilters } from "@/lib/analytics/engine";
import { buildDatasetSummary } from "@/lib/ai/summarize";
import { localInsightAnswer } from "@/lib/ai/prompts";

const SAMPLE = `order_id,date,customer_id,category,region,product,quantity,unit_price,revenue,status
ORD-1,2025-03-01,CUST-1,Electronics,Europe,Laptop,1,100,100,completed
ORD-2,2025-03-02,CUST-2,Apparel,North America,Tee,2,25,50,cancelled
ORD-3,2025-03-15,CUST-3,Electronics,Europe,Hub,1,80,80,completed
ORD-4,2025-04-01,CUST-1,Apparel,Europe,Jacket,1,60,60,completed
ORD-5,2025-04-10,CUST-4,Sports,Asia Pacific,Mat,3,20,60,completed
`;

describe("analytics calculations", () => {
  const dataset = parseCsvText(SAMPLE, { name: "sales.csv" });

  it("computes KPIs excluding cancelled revenue", () => {
    const result = computeAnalytics(dataset);
    // completed revenue: 100+80+60+60 = 300
    expect(result.kpis.revenue).toBe(300);
    expect(result.kpis.orders).toBe(5);
    expect(result.kpis.customers).toBe(4);
    expect(result.kpis.averageOrderValue).toBe(60);
    // conversion: 4 completed / 5 = 80%
    expect(result.kpis.conversionRate).toBe(80);
  });

  it("aggregates revenue by category and region", () => {
    const result = computeAnalytics(dataset);
    const electronics = result.revenueByCategory.find((c) => c.name === "Electronics");
    expect(electronics?.value).toBe(180);
    const europe = result.revenueByRegion.find((r) => r.name === "Europe");
    expect(europe?.value).toBe(240);
  });

  it("updates when filters are applied", () => {
    const filtered = computeAnalytics(dataset, {
      category: "Electronics",
      region: "Europe",
    });
    expect(filtered.kpis.revenue).toBe(180);
    expect(filtered.filteredRowCount).toBe(2);
    expect(filtered.revenueByCategory).toHaveLength(1);
  });

  it("filters by date range", () => {
    const rows = applyFilters(dataset, { dateFrom: "2025-04-01", dateTo: "2025-04-30" });
    expect(rows).toHaveLength(2);
  });
});

describe("AI summary architecture", () => {
  const dataset = parseCsvText(SAMPLE, { name: "sales.csv" });

  it("builds a compact summary without dumping every row", () => {
    const summary = buildDatasetSummary(dataset);
    expect(summary.rowCount).toBe(5);
    expect(summary.kpis.revenue).toBe(300);
    expect(summary.revenueByCategory.length).toBeGreaterThan(0);
    // summary should not embed raw rows array
    expect("rows" in summary).toBe(false);
  });

  it("local fallback answers category question from summary only", () => {
    const summary = buildDatasetSummary(dataset);
    const answer = localInsightAnswer("Which category generated the most revenue?", summary);
    expect(answer).toContain("Electronics");
    expect(answer).toContain("180");
  });
});
