import { NextResponse } from "next/server";
import { z } from "zod";
import OpenAI from "openai";
import { buildDatasetSummary } from "@/lib/ai/summarize";
import { SYSTEM_PROMPT, buildUserPrompt, localInsightAnswer } from "@/lib/ai/prompts";
import type { ParsedDataset, AnalyticsFilters } from "@/lib/types";

export const runtime = "nodejs";

const bodySchema = z.object({
  question: z.string().min(3).max(2000),
  filters: z
    .object({
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      category: z.string().optional(),
      region: z.string().optional(),
    })
    .optional(),
  dataset: z.object({
    id: z.string(),
    name: z.string(),
    rows: z.array(z.record(z.string(), z.unknown())),
    columns: z.array(z.string()),
    profiles: z.array(
      z.object({
        name: z.string(),
        type: z.enum(["date", "number", "category", "string", "boolean"]),
        missingCount: z.number(),
        missingRate: z.number(),
        uniqueCount: z.number(),
        sampleValues: z.array(z.string()),
        min: z.union([z.number(), z.string()]).optional(),
        max: z.union([z.number(), z.string()]).optional(),
      }),
    ),
    issues: z.array(
      z.object({
        row: z.number(),
        column: z.string().optional(),
        message: z.string(),
        severity: z.enum(["error", "warning"]),
      }),
    ),
    rowCount: z.number(),
    validRowCount: z.number(),
    source: z.enum(["upload", "demo"]),
    createdAt: z.string(),
  }),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { question, dataset, filters } = parsed.data;
    const summary = buildDatasetSummary(
      dataset as ParsedDataset,
      (filters ?? {}) as AnalyticsFilters,
    );

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      const answer = localInsightAnswer(question, summary);
      return NextResponse.json({
        answer,
        mode: "local",
        summaryMeta: {
          rowCount: summary.rowCount,
          filteredRowCount: summary.filteredRowCount,
          kpiKeys: Object.keys(summary.kpis),
        },
      });
    }

    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(question, summary) },
      ],
    });

    const answer =
      completion.choices[0]?.message?.content?.trim() ||
      "No response generated from the model.";

    return NextResponse.json({
      answer,
      mode: "openai",
      summaryMeta: {
        rowCount: summary.rowCount,
        filteredRowCount: summary.filteredRowCount,
        kpiKeys: Object.keys(summary.kpis),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}