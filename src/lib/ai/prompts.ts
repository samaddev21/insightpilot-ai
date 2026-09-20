import type { DatasetSummary } from "@/lib/types";
import { summaryToPromptBlock } from "@/lib/ai/summarize";

export const SYSTEM_PROMPT = `You are InsightPilot, an AI analytics copilot for business datasets.

Rules:
1. Only discuss metrics and dimensions present in the provided dataset summary.
2. Never invent numbers, trends, or entities that are not in the summary.
3. If the summary lacks enough information to answer, say so clearly.
4. Prefer concise, executive-ready insights with specific figures from the summary.
5. When asked for recommendations, ground them in the summary metrics only.
6. Format answers with short paragraphs or bullets. Use plain language.`;

export function buildUserPrompt(question: string, summary: DatasetSummary): string {
  return `DATASET SUMMARY (authoritative — do not contradict):
${summaryToPromptBlock(summary)}

USER QUESTION:
${question}

Answer using only the summary above.`;
}

/** Deterministic fallback when OPENAI_API_KEY is missing. */
export function localInsightAnswer(question: string, summary: DatasetSummary): string {
  const q = question.toLowerCase();
  const { kpis, revenueOverTime, revenueByCategory, revenueByRegion } = summary;

  if (q.includes("decline") || q.includes("march") || q.includes("drop")) {
    const march = revenueOverTime.find((p) => p.date.endsWith("-03") || p.date.includes("-03"));
    const sorted = [...revenueOverTime].sort((a, b) => a.revenue - b.revenue);
    const weakest = sorted[0];
    const strongest = [...revenueOverTime].sort((a, b) => b.revenue - a.revenue)[0];
    if (march || weakest) {
      const target = march ?? weakest;
      return [
        `Based on the summarized metrics (not raw CSV rows):`,
        ``,
        `• Weakest period: **${target.date}** with revenue of **$${target.revenue.toFixed(2)}** across **${target.orders}** orders.`,
        strongest
          ? `• Strongest period in view: **${strongest.date}** at **$${strongest.revenue.toFixed(2)}**.`
          : null,
        revenueByCategory[0]
          ? `• Top category overall: **${revenueByCategory[0].name}** ($${revenueByCategory[0].value.toFixed(2)}).`
          : null,
        revenueByRegion[revenueByRegion.length - 1]
          ? `• Softest region overall: **${revenueByRegion[revenueByRegion.length - 1].name}** ($${revenueByRegion[revenueByRegion.length - 1].value.toFixed(2)}).`
          : null,
        ``,
        `Management should compare category and region mix in the weak period versus peak months using the dashboard filters. Numbers above come only from the dataset summary.`,
      ]
        .filter(Boolean)
        .join("\n");
    }
  }

  if (q.includes("category") && (q.includes("most") || q.includes("top") || q.includes("best"))) {
    const top = revenueByCategory[0];
    if (!top) return "This dataset summary does not include category revenue breakdowns.";
    return `**${top.name}** generated the most revenue at **$${top.value.toFixed(2)}** under the current filters. Full ranking:\n${revenueByCategory
      .slice(0, 5)
      .map((c, i) => `${i + 1}. ${c.name}: $${c.value.toFixed(2)}`)
      .join("\n")}`;
  }

  if (q.includes("region") && (q.includes("best") || q.includes("top") || q.includes("performing"))) {
    const top = revenueByRegion[0];
    if (!top) return "This dataset summary does not include region revenue breakdowns.";
    return `**${top.name}** is the top-performing region with **$${top.value.toFixed(2)}** revenue. Ranking:\n${revenueByRegion
      .map((r, i) => `${i + 1}. ${r.name}: $${r.value.toFixed(2)}`)
      .join("\n")}`;
  }

  if (q.includes("investigate") || q.includes("management") || q.includes("recommend")) {
    const weakPeriod = [...revenueOverTime].sort((a, b) => a.revenue - b.revenue)[0];
    const weakRegion = revenueByRegion[revenueByRegion.length - 1];
    return [
      `Suggested investigation areas from the current summary:`,
      ``,
      `1. **Revenue**: $${kpis.revenue.toFixed(2)} across ${kpis.orders} orders (AOV $${kpis.averageOrderValue.toFixed(2)}).`,
      `2. **Conversion rate**: ${kpis.conversionRate.toFixed(1)}% — review cancelled/incomplete orders if this looks low.`,
      weakPeriod
        ? `3. **Soft period**: ${weakPeriod.date} ($${weakPeriod.revenue.toFixed(2)}) — check mix shifts.`
        : null,
      weakRegion
        ? `4. **Soft region**: ${weakRegion.name} ($${weakRegion.value.toFixed(2)}).`
        : null,
      `5. **Customers**: ${kpis.customers} unique customers in the filtered set.`,
      ``,
      `All figures are taken from the pre-aggregated dataset summary only.`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  return [
    `Here is a concise snapshot from the dataset summary:`,
    ``,
    `• Revenue: $${kpis.revenue.toFixed(2)}`,
    `• Orders: ${kpis.orders}`,
    `• Customers: ${kpis.customers}`,
    `• Average order value: $${kpis.averageOrderValue.toFixed(2)}`,
    `• Conversion rate: ${kpis.conversionRate.toFixed(1)}%`,
    revenueByCategory[0]
      ? `• Top category: ${revenueByCategory[0].name} ($${revenueByCategory[0].value.toFixed(2)})`
      : null,
    revenueByRegion[0]
      ? `• Top region: ${revenueByRegion[0].name} ($${revenueByRegion[0].value.toFixed(2)})`
      : null,
    ``,
    `Ask about trends, categories, regions, or what management should investigate for a deeper reading.`,
  ]
    .filter(Boolean)
    .join("\n");
}