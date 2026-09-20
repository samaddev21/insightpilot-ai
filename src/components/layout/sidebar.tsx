"use client";

import {
  BarChart3,
  Database,
  LayoutDashboard,
  MessageSquareText,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  Table2,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const NAV = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "charts", label: "Charts", icon: BarChart3 },
  { id: "table", label: "Data table", icon: Table2 },
  { id: "ask", label: "Ask InsightPilot", icon: MessageSquareText },
  { id: "upload", label: "Upload", icon: Upload },
] as const;

export type NavId = (typeof NAV)[number]["id"];

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
  active: NavId;
  onNavigate: (id: NavId) => void;
  datasetName?: string;
}

export function Sidebar({ open, onToggle, active, onNavigate, datasetName }: SidebarProps) {
  return (
    <aside
      className={cn(
        "relative z-20 flex h-full flex-col border-r border-[var(--border)] bg-[var(--sidebar)] text-[var(--sidebar-foreground)] transition-all duration-300",
        open ? "w-64" : "w-[72px]",
      )}
    >
      <div className="flex items-center gap-3 px-4 py-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] shadow-md shadow-teal-900/20">
          <Sparkles className="h-5 w-5" />
        </div>
        {open && (
          <div className="min-w-0 animate-in fade-in duration-300">
            <p className="font-[family-name:var(--font-display)] text-lg leading-none tracking-tight">
              InsightPilot
            </p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">AI analytics copilot</p>
          </div>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-2 py-2">
        {NAV.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                isActive
                  ? "bg-[var(--sidebar-active)] text-[var(--foreground)] font-medium"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {open && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-[var(--border)] p-3">
        {open && datasetName && (
          <div className="mb-3 flex items-start gap-2 rounded-lg bg-[var(--muted)]/60 px-3 py-2">
            <Database className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-[var(--muted-foreground)]">
                Active dataset
              </p>
              <p className="truncate text-sm font-medium">{datasetName}</p>
            </div>
          </div>
        )}
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2" onClick={onToggle}>
          {open ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
          {open && <span>Collapse</span>}
        </Button>
      </div>
    </aside>
  );
}