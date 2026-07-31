import type { ReactNode } from "react";
import { cn } from "../lib/utils";
import type { Severity } from "../lib/types";

export function severityClasses(severity: Severity | string | null | undefined): string {
  switch ((severity ?? "").toUpperCase()) {
    case "CRITICAL":
      return "bg-rose-500/15 text-rose-400 border-rose-500/30";
    case "HIGH":
      return "bg-orange-500/15 text-orange-400 border-orange-500/30";
    case "MEDIUM":
      return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    case "LOW":
      return "bg-sky-500/15 text-sky-400 border-sky-500/30";
    case "INFO":
      return "bg-slate-500/15 text-slate-400 border-slate-500/30";
    default:
      return "bg-slate-500/15 text-slate-400 border-slate-500/30";
  }
}

export function SeverityBadge({ severity, className }: { severity: Severity | string | null | undefined; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide",
        severityClasses(severity),
        className
      )}
    >
      {severity ?? "UNKNOWN"}
    </span>
  );
}

export function ActionBadge({ action }: { action: string | null | undefined }) {
  const ok = (action ?? "").toUpperCase() === "ALLOW";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide",
        ok
          ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
          : "border-rose-500/30 bg-rose-500/15 text-rose-400"
      )}
    >
      {action ?? "UNKNOWN"}
    </span>
  );
}

export function StatusBadge({ status, className }: { status: string | null | undefined; className?: string }) {
  const s = (status ?? "").toUpperCase();
  const classes =
    s === "COMPLETE" || s === "SUCCESS" || s === "PASSED" || s === "HEALTHY" || s === "ACTIVE"
      ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-400"
      : s === "RUNNING" || s === "PENDING" || s === "QUEUED" || s === "RUNNING"
        ? "border-sky-500/30 bg-sky-500/15 text-sky-400"
        : s === "FAILED" || s === "TIMEOUT" || s === "BLOCKED" || s === "CANCELLED" || s === "BLOCK"
          ? "border-rose-500/30 bg-rose-500/15 text-rose-400"
          : s === "WAITING" || s === "SKIPPED" || s === "NOT_QUEUED"
            ? "border-slate-500/30 bg-slate-500/15 text-slate-400"
            : "border-indigo-500/30 bg-indigo-500/15 text-indigo-400";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide",
        classes,
        className
      )}
    >
      {status ?? "UNKNOWN"}
    </span>
  );
}

export function Dot({ className, title, children }: { className?: string; title?: string; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)} title={title}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}
