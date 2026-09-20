import { readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { parseCsvText } from "@/lib/csv/parse";
import { computeAnalytics } from "@/lib/analytics/engine";

describe("demo mode", () => {
  it("loads and parses public/demo/sales.csv", () => {
    const filePath = path.join(process.cwd(), "public", "demo", "sales.csv");
    const text = readFileSync(filePath, "utf8");
    const dataset = parseCsvText(text, {
      name: "Demo Sales Dataset",
      source: "demo",
      id: "demo_sales",
    });

    expect(dataset.source).toBe("demo");
    expect(dataset.rowCount).toBeGreaterThan(100);
    expect(dataset.columns).toEqual(
      expect.arrayContaining([
        "order_id",
        "date",
        "category",
        "region",
        "revenue",
        "status",
      ]),
    );

    const analytics = computeAnalytics(dataset);
    expect(analytics.kpis.revenue).toBeGreaterThan(0);
    expect(analytics.kpis.orders).toBe(dataset.rowCount);
    expect(analytics.revenueOverTime.length).toBeGreaterThan(3);

    const march = analytics.revenueOverTime.find((p) => p.date === "2025-03");
    const may = analytics.revenueOverTime.find((p) => p.date === "2025-05");
    expect(march).toBeTruthy();
    expect(may).toBeTruthy();
    expect(march!.revenue).toBeLessThan(may!.revenue);
  });
});
