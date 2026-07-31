import { ScrollText, ShieldCheck, ShieldX, AlertTriangle } from "lucide-react";
import {
  Card,
  CardBody,
  CardHeader,
  PageHeader,
  LoadingState,
  ErrorState,
  SeverityBadge,
} from "../../ui";
import { usePolicies } from "../../lib/queries";

export function PoliciesPage() {
  const policies = usePolicies();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Policy"
        description="Enforcement gates applied to every pipeline run (from policy.yaml)."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Active Rules" subtitle="Rules returned by /api/policies." />
          <CardBody className="space-y-3 pt-0">
            {policies.isLoading ? (
              <LoadingState />
            ) : policies.isError ? (
              <ErrorState message={policies.error?.message} onRetry={() => policies.refetch()} />
            ) : (
              (policies.data?.rules ?? []).map((rule) => (
                <div key={rule.id} className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-3">
                  <div className="shrink-0">
                    {rule.action === "BLOCK" ? (
                      <ShieldX size={18} className="text-rose-400" />
                    ) : (
                      <AlertTriangle size={18} className="text-amber-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-200">{rule.name}</p>
                    <p className="text-xs text-slate-500">{rule.scanner}</p>
                  </div>
                  <SeverityBadge severity={rule.severity} />
                  <span
                    className={
                      "rounded-md border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide " +
                      (rule.action === "BLOCK"
                        ? "border-rose-500/30 bg-rose-500/15 text-rose-400"
                        : "border-amber-500/30 bg-amber-500/15 text-amber-400")
                    }
                  >
                    {rule.action}
                  </span>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Raw Policy" />
            <CardBody>
              {policies.isLoading ? (
                <LoadingState />
              ) : policies.isError ? (
                <ErrorState message={policies.error?.message} onRetry={() => policies.refetch()} />
              ) : (
                <pre className="max-h-96 overflow-auto rounded-lg bg-slate-950 p-4 font-mono text-xs text-emerald-300">
                  {JSON.stringify(policies.data?.policy ?? {}, null, 2)}
                </pre>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Enforcement Model" />
            <CardBody className="flex items-center gap-3">
              <ScrollText size={20} className="text-indigo-400" />
              <div>
                <p className="flex items-center gap-1.5 text-sm font-medium text-slate-100">
                  <ShieldCheck size={14} className="text-emerald-400" /> Block & Warn gates
                </p>
                <p className="text-xs text-slate-500">
                  Critical/High findings block deploys; Medium findings warn.
                </p>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
