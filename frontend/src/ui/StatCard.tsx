import type { ReactNode } from "react";
import { cn } from "../lib/utils";

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  hint?: ReactNode;
  accent?: "indigo" | "emerald" | "rose" | "amber" | "sky";
  className?: string;
}

const accents = {
  indigo: "text-indigo-400",
  emerald: "text-emerald-400",
  rose: "text-rose-400",
  amber: "text-amber-400",
  sky: "text-sky-400",
};

export function StatCard({ label, value, icon, hint, accent = "indigo", className }: StatCardProps) {
  return (
    <div className={cn("rounded-xl border border-slate-800 bg-slate-900/70 p-5", className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
        {icon && <div className={cn("shrink-0", accents[accent])}>{icon}</div>}
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums text-slate-50">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
