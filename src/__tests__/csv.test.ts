import { describe, expect, it } from "vitest";
import { parseCsvText } from "@/lib/csv/parse";
import { isCsvFile, assertCsvUpload, MAX_CSV_BYTES } from "@/lib/csv/validate";
import { detectColumnProfiles } from "@/lib/csv/detect";

const SAMPLE = `order_id,date,customer_id,category,region,product,quantity,unit_price,revenue,status
ORD-1,2025-03-01,CUST-1,Electronics,Europe,Laptop,1,100,100,completed
ORD-2,2025-03-02,CUST-2,Apparel,North America,Tee,2,25,50,cancelled
ORD-3,2025-04-01,CUST-1,Electronics,Europe,Hub,1,40,40,completed
`;

describe("CSV parsing", () => {
  it("parses headers and rows", () => {
    const ds = parseCsvText(SAMPLE, { name: "sample.csv" });
    expect(ds.columns).toContain("revenue");
    expect(ds.rowCount).toBe(3);
    expect(ds.validRowCount).toBe(3);
  });

  it("detects column types", () => {
    const ds = parseCsvText(SAMPLE, { name: "sample.csv" });
    const byName = Object.fromEntries(ds.profiles.map((p) => [p.name, p.type]));
    expect(byName.date).toBe("date");
    expect(byName.revenue).toBe("number");
    expect(byName.category).toBe("category");
  });

  it("rejects empty CSV", () => {
    expect(() => parseCsvText("   ", { name: "empty.csv" })).toThrow(/empty/i);
  });

  it("flags malformed / mostly empty rows", () => {
    const csv = `a,b,c
1,2,3
,,
4,5,6
`;
    const ds = parseCsvText(csv, { name: "mal.csv" });
    expect(ds.issues.some((i) => /mostly empty/i.test(i.message))).toBe(true);
  });
});

describe("CSV upload validation", () => {
  it("accepts csv mime and extension", () => {
    expect(isCsvFile({ name: "sales.csv", type: "text/csv" })).toBe(true);
    expect(isCsvFile({ name: "sales.txt", type: "text/csv" })).toBe(false);
  });

  it("enforces size limit", () => {
    const big = {
      name: "big.csv",
      type: "text/csv",
      size: MAX_CSV_BYTES + 1,
    } as File;
    expect(() => assertCsvUpload(big)).toThrow(/too large/i);
  });
});

describe("type detection helpers", () => {
  it("profiles missing values", () => {
    const profiles = detectColumnProfiles(
      ["revenue"],
      [{ revenue: "10" }, { revenue: "" }, { revenue: "n/a" }],
    );
    expect(profiles[0].missingCount).toBe(2);
    expect(profiles[0].type).toBe("number");
  });
});
