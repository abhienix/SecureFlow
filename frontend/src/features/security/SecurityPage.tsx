import { useMemo, useState } from "react";
import { ShieldAlert, FileCode2, KeyRound, Container, Globe } from "lucide-react";
import {
  Card,
  CardBody,
  CardHeader,
  PageHeader,
  LoadingState,
  ErrorState,
  SeverityBadge,
  StatusBadge,
} from "../../ui";
import { useFindings, useSecuritySummary, useScannerComparison } from "../../lib/queries";
import { formatDate, cn, truncate } from "../../lib/utils";
import type { Finding } from "../../lib/types";

const scannerMeta: Record<string, { label: string; icon: typeof FileCode2 }> = {
  gitleaks: { label: "Gitleaks", icon: KeyRound },
  semgrep: { label: "Semgrep", icon: FileCode2 },
  trivy: { label: "Trivy", icon: Container },
  zap: { label: "ZAP", icon: Globe },
};

export function SecurityPage() {
  const [severity, setSeverity] = useState("");
  const [scanner, setScanner] = useState("");

  const findings = useFindings({ severity: severity || undefined, scanner: scanner || undefined });
  const summary = useSecuritySummary();
  const comparison = useScannerComparison();

  const counts = useMemo(() => {
    if (summary.data) {
      return {
        CRITICAL: summary.data.critical,
        HIGH: summary.data.high,
        MEDIUM: summary.data.medium,
        LOW: summary.data.low,
      };
    }
    const c = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    for (const f of findings.data?.findings ?? []) {
      const k = f.severity as keyof typeof c;
      if (k in c) c[k] += 1;
    }
    return c;
  }, [summary.data, findings.data]);

  const activeTotal = findings.data?.total ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security"
        description="Unified findings across Gitleaks, Semgrep, Trivy, and OWASP ZAP."
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map((sev) => (
          <button
            key={sev}
            onClick={() => setSeverity((cur) => (cur === sev ? "" : sev))}
            className={cn(
              "rounded-xl border p-4 text-left transition-colors",
              severity === sev
                ? "border-indigo-500/60 bg-indigo-500/10"
                : "border-slate-800 bg-slate-900/70 hover:border-slate-700"
            )}
          >
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{sev}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-slate-50">{counts[sev]}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title={`Findings (${activeTotal})`}
            subtitle="Click a severity chip above to filter. Findings come from /api/findings."
            action={
              <div className="flex items-center gap-2">
                {Object.entries(scannerMeta).map(([key, meta]) => {
                  const Icon = meta.icon;
                  return (
                    <button
                      key={key}
                      onClick={() => setScanner((cur) => (cur === key ? "" : key))}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors",
                        scanner === key
                          ? "border-indigo-500/60 bg-indigo-500/10 text-indigo-300"
                          : "border-slate-800 text-slate-400 hover:border-slate-600"
                      )}
                    >
                      <Icon size={12} />
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            }
          />
          <CardBody className="pt-0">
            {findings.isLoading ? (
              <LoadingState />
            ) : findings.isError ? (
              <ErrorState message={findings.error?.message} onRetry={() => findings.refetch()} />
            ) : findings.data && findings.data.findings.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <ShieldAlert size={24} className="text-slate-600" />
                <p className="text-sm text-slate-400">No findings match the current filters.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {findings.data?.findings.map((f) => (
                  <FindingRow key={f.id} f={f} />
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Scanner Comparison" />
            <CardBody className="space-y-3">
              {comparison.isLoading ? (
                <LoadingState />
              ) : comparison.isError ? (
                <ErrorState message={comparison.error?.message} onRetry={() => comparison.refetch()} />
              ) : (
                Object.entries(comparison.data ?? {}).map(([scannerKey, sevs]) => {
                  const meta = scannerMeta[scannerKey] ?? { label: scannerKey, icon: FileCode2 };
                  const Icon = meta.icon;
                  const total = sevs.critical + sevs.high + sevs.medium + sevs.low;
                  return (
                    <div key={scannerKey} className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs font-medium text-slate-200">
                          <Icon size={13} className="text-indigo-400" /> {meta.label}
                        </span>
                        <span className="tabular-nums text-xs text-slate-400">{total}</span>
                      </div>
                      <div className="mt-2 grid grid-cols-4 gap-1 text-center">
                        <div className="rounded bg-rose-500/10 py-1">
                          <p className="text-[10px] uppercase text-rose-400/80">C</p>
                          <p className="text-xs font-semibold tabular-nums text-slate-200">{sevs.critical}</p>
                        </div>
                        <div className="rounded bg-orange-500/10 py-1">
                          <p className="text-[10px] uppercase text-orange-400/80">H</p>
                          <p className="text-xs font-semibold tabular-nums text-slate-200">{sevs.high}</p>
                        </div>
                        <div className="rounded bg-amber-500/10 py-1">
                          <p className="text-[10px] uppercase text-amber-400/80">M</p>
                          <p className="text-xs font-semibold tabular-nums text-slate-200">{sevs.medium}</p>
                        </div>
                        <div className="rounded bg-sky-500/10 py-1">
                          <p className="text-[10px] uppercase text-sky-400/80">L</p>
                          <p className="text-xs font-semibold tabular-nums text-slate-200">{sevs.low}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function FindingRow({ f }: { f: Finding }) {
  const meta = scannerMeta[f.scanner] ?? { label: f.scanner, icon: FileCode2 };
  const Icon = meta.icon;
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/50">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
      >
        <Icon size={15} className="shrink-0 text-slate-500" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-200">{f.title}</p>
          <p className="truncate text-xs text-slate-500">
            {f.cve_cwe} · {f.file}:{f.line}
          </p>
        </div>
        <SeverityBadge severity={f.severity} />
        <StatusBadge status={f.status} />
        <span className="text-xs text-slate-600">{formatDate(f.created_at)}</span>
      </button>
      {expanded && (
        <div className="space-y-2 border-t border-slate-800/60 px-3 py-3 text-xs">
          <p className="text-slate-400"><span className="font-semibold text-slate-300">OWASP:</span> {f.owasp}</p>
          <p className="text-slate-400"><span className="font-semibold text-slate-300">Analysis:</span> {truncate(f.ai_explanation, 240)}</p>
          <p className="text-slate-400"><span className="font-semibold text-slate-300">Remediation:</span> {truncate(f.ai_fix, 240)}</p>
        </div>
      )}
    </div>
  );
}
