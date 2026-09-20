"use client";

import {
  DollarSign,
  ShoppingCart,
  Users,
  Receipt,
  Percent,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { KpiSet } from "@/lib/types";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";

const ITEMS: {
  key: keyof KpiSet;
  label: string;
  icon: LucideIcon;
  format: (v: number) => string;
}[] = [
  { key: "revenue", label: "Revenue", icon: DollarSign, format: formatCurrency },
  { key: "orders", label: "Orders", icon: ShoppingCart, format: formatNumber },
  { key: "customers", label: "Customers", icon: Users, format: formatNumber },
  {
    key: "averageOrderValue",
    label: "Average Order Value",
    icon: Receipt,
    format: formatCurrency,
  },
  {
    key: "conversionRate",
    label: "Conversion Rate",
    icon: Percent,
    format: formatPercent,
  },
];

export function KpiCards({ kpis }: { kpis: KpiSet }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {ITEMS.map((item, index) => {
        const Icon = item.icon;
        return (
          <Card
            key={item.key}
            className="overflow-hidden transition-transform duration-300 hover:-translate-y-0.5"
            style={{ animationDelay: `${index * 40}ms` }}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-[var(--muted-foreground)]">
                {item.label}
              </CardTitle>
              <div className="rounded-lg bg-[var(--accent)] p-2 text-[var(--accent-foreground)]">
                <Icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="font-[family-name:var(--font-display)] text-2xl tracking-tight">
                {item.format(kpis[item.key])}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}