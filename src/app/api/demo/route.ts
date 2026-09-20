import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { parseCsvText } from "@/lib/csv/parse";

export const runtime = "nodejs";

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "public", "demo", "sales.csv");
    const text = await readFile(filePath, "utf8");
    const dataset = parseCsvText(text, {
      name: "Demo Sales Dataset",
      source: "demo",
      id: "demo_sales",
    });
    return NextResponse.json({ dataset, csv: text });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load demo dataset";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}