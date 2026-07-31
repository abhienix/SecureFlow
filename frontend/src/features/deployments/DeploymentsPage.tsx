import { Rocket, Globe, ExternalLink, Terminal } from "lucide-react";
import {
  Card,
  CardBody,
  CardHeader,
  PageHeader,
  LoadingState,
  ErrorState,
  ActionBadge,
  StatusBadge,
} from "../../ui";
import { useDeployments } from "../../lib/queries";
import { formatDate, formatCommit } from "../../lib/utils";

export function DeploymentsPage() {
  const deps = useDeployments();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deployments"
        description="Production deployments gated by the policy engine."
      />

      {deps.isLoading ? (
        <LoadingState label="Loading deployments…" />
      ) : deps.isError ? (
        <ErrorState message={deps.error?.message} onRetry={() => deps.refetch()} />
      ) : (
        <div className="space-y-3">
          {(deps.data?.deployments ?? []).map((d) => (
            <Card key={d.id}>
              <CardBody>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg " +
                        (d.status === "active"
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-rose-500/15 text-rose-400")
                      }
                    >
                      <Rocket size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                        {d.service_name}
                        <span className="font-mono text-xs text-slate-500">{d.revision}</span>
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {d.repo_name} · <span className="font-mono">{formatCommit(d.commit_sha)}</span> ·{" "}
                        {d.environment}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <ActionBadge action={d.ai_verdict} />
                    <StatusBadge status={d.status} />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-3 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5">
                      <Terminal size={12} /> DAST {d.dast_status}
                    </span>
                    <span>{formatDate(d.created_at)}</span>
                  </span>
                  {d.url && (
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300"
                    >
                      <Globe size={12} /> Open service <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              </CardBody>
            </Card>
          ))}

          {(deps.data?.deployments ?? []).length === 0 && (
            <Card>
              <CardHeader title="No deployments" />
              <CardBody>
                <p className="text-sm text-slate-400">No deployments recorded yet.</p>
              </CardBody>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
