import { Link } from "react-router-dom";
import {
  Database,
  GitBranch,
  Rocket,
  ShieldAlert,
  Activity,
  Timer,
  CheckCircle2,
  Gauge,
} from "lucide-react";
import { Card, CardBody, CardHeader, StatCard, PageHeader, LoadingState, ErrorState, SeverityBadge, ActionBadge, StatusBadge, ProgressBar } from "../../ui";
import { useObservability, useScanResults, useV1Observability } from "../../lib/queries";
import { formatDuration, formatRelative, formatCommit } from "../../lib/utils";

export function OverviewPage() {
  const obs = useObservability();
  const v1 = useV1Observability();
  const scans = useScanResults(200);

  if (obs.isLoading || scans.isLoading) return <LoadingState />;
  if (obs.isError || scans.isError) {
    return (
      <ErrorState
        message={obs.error?.message ?? scans.error?.message}
        onRetry={() => {
          obs.refetch();
          scans.refetch();
        }}
      />
    );
  }

  const data = obs.data;
  const scanTotal = scans.data?.total ?? 0;
  const open = data?.open_findings;
  const dast = data?.dast_pipeline;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description="Real-time snapshot of the SecureFlow DevSecOps pipeline."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Security Score"
          value={data?.security_score ?? "—"}
          icon={<Gauge size={18} />}
          accent="emerald"
          hint={v1.data ? `Repo health ${v1.data.repository_health_pct ?? 0}%` : undefined}
        />
        <StatCard
          label="Total Scans"
          value={scanTotal.toLocaleString()}
          icon={<Activity size={18} />}
          accent="indigo"
          hint={`${data?.active_pipelines ?? 0} active pipeline${(data?.active_pipelines ?? 0) === 1 ? "" : "s"}`}
        />
        <StatCard
          label="Open Findings"
          value={open?.total ?? "—"}
          icon={<ShieldAlert size={18} />}
          accent="rose"
          hint={`${open?.critical ?? 0} critical · ${open?.high ?? 0} high`}
        />
        <StatCard
          label="Deploy Success"
          value={data ? `${data.deployment_success_rate}%` : "—"}
          icon={<Rocket size={18} />}
          accent="sky"
          hint={`${data?.total_deployments ?? 0} deployments`}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent Scans"
            subtitle={`${scanTotal.toLocaleString()} total scan records`}
            action={
              <Link to="/pipelines" className="text-xs font-medium text-indigo-400 hover:text-indigo-300">
                View pipelines →
              </Link>
            }
          />
          <CardBody className="pt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500">
                    <th className="pb-2 pr-4 font-medium">Commit</th>
                    <th className="pb-2 pr-4 font-medium">Repo</th>
                    <th className="pb-2 pr-4 font-medium">Severity</th>
                    <th className="pb-2 pr-4 font-medium">Risk</th>
                    <th className="pb-2 pr-4 font-medium">Action</th>
                    <th className="pb-2 pr-4 font-medium">DAST</th>
                    <th className="pb-2 font-medium">When</th>
                  </tr>
                </thead>
                <tbody>
                  {scans.data?.scans.slice(0, 12).map((s) => (
                    <tr key={s.id} className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/30">
                      <td className="py-2.5 pr-4 font-mono text-xs text-slate-300">{formatCommit(s.commit_sha)}</td>
                      <td className="max-w-[160px] truncate py-2.5 pr-4 text-slate-300" title={s.repo_name ?? ""}>
                        {s.repo_name ?? "—"}
                      </td>
                      <td className="py-2.5 pr-4"><SeverityBadge severity={s.severity} /></td>
                      <td className="py-2.5 pr-4 tabular-nums text-slate-300">{s.risk_score ?? "—"}</td>
                      <td className="py-2.5 pr-4"><ActionBadge action={s.action_taken} /></td>
                      <td className="py-2.5 pr-4"><StatusBadge status={s.dast_status} /></td>
                      <td className="whitespace-nowrap py-2.5 text-xs text-slate-500">{formatRelative(s.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Findings by Severity" />
            <CardBody className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map((sev) => (
                  <div key={sev} className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                    <p className="text-xs text-slate-500">{sev}</p>
                    <p className="mt-1 text-xl font-bold tabular-nums text-slate-100">
                      {open ? open[sev.toLowerCase() as "critical" | "high" | "medium" | "low"] : "—"}
                    </p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500">
                Open findings from active policy enforcement; severity split from <code className="text-slate-400">/api/observability/overview</code>.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Pipeline Health" />
            <CardBody className="space-y-4">
              <div>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-slate-400">Deploy success rate</span>
                  <span className="tabular-nums text-slate-200">{data?.deployment_success_rate ?? 0}%</span>
                </div>
                <ProgressBar value={data?.deployment_success_rate ?? 0} />
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1.5"><Timer size={13} /> {formatDuration(data?.mean_pipeline_duration_seconds)} avg</span>
                <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={13} /> infra {data?.infrastructure_status ?? "—"}</span>
              </div>
              {dast && (
                <div className="border-t border-slate-800 pt-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">DAST Pipeline</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <span className="text-slate-400">Queued <span className="tabular-nums text-slate-200">{dast.queued_jobs}</span></span>
                    <span className="text-slate-400">Running <span className="tabular-nums text-slate-200">{dast.running_jobs}</span></span>
                    <span className="text-slate-400">Completed <span className="tabular-nums text-slate-200">{dast.completed_jobs}</span></span>
                    <span className="text-slate-400">Failed <span className="tabular-nums text-slate-200">{dast.failed_jobs}</span></span>
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link to="/repositories" className="group">
          <Card className="transition-colors group-hover:border-slate-700">
            <CardBody className="flex items-center gap-4">
              <Database size={20} className="text-indigo-400" />
              <div>
                <p className="text-sm font-semibold text-slate-100">{v1.data?.total_repositories ?? data?.total_repositories ?? "—"} Repositories</p>
                <p className="text-xs text-slate-500">Monitored codebases</p>
              </div>
            </CardBody>
          </Card>
        </Link>
        <Link to="/deployments" className="group">
          <Card className="transition-colors group-hover:border-slate-700">
            <CardBody className="flex items-center gap-4">
              <GitBranch size={20} className="text-emerald-400" />
              <div>
                <p className="text-sm font-semibold text-slate-100">{v1.data?.total_pipelines ?? "—"} Pipeline Runs</p>
                <p className="text-xs text-slate-500">{v1.data?.active_pipelines ?? 0} active</p>
              </div>
            </CardBody>
          </Card>
        </Link>
        <Link to="/security" className="group">
          <Card className="transition-colors group-hover:border-slate-700">
            <CardBody className="flex items-center gap-4">
              <ShieldAlert size={20} className="text-rose-400" />
              <div>
                <p className="text-sm font-semibold text-slate-100">{v1.data?.open_findings ?? "—"} Open Findings</p>
                <p className="text-xs text-slate-500">{v1.data?.total_findings ?? "—"} total reported</p>
              </div>
            </CardBody>
          </Card>
        </Link>
      </div>
    </div>
  );
}
