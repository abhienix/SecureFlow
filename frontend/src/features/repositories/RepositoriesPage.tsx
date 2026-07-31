import { Link } from "react-router-dom";
import { Database, GitFork, ExternalLink, ShieldCheck } from "lucide-react";
import {
  Card,
  CardBody,
  PageHeader,
  LoadingState,
  ErrorState,
  StatusBadge,
  ProgressBar,
} from "../../ui";
import { useRepositories } from "../../lib/queries";
import { formatRelative } from "../../lib/utils";

export function RepositoriesPage() {
  const repos = useRepositories();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Repositories"
        description="Monitored repositories and their security posture."
      />

      {repos.isLoading ? (
        <LoadingState label="Loading repositories…" />
      ) : repos.isError ? (
        <ErrorState message={repos.error?.message} onRetry={() => repos.refetch()} />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(repos.data?.repositories ?? []).map((r) => (
            <Card key={r.id}>
              <CardBody>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-400">
                      <Database size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-100" title={r.name}>
                        {r.repo_name}
                      </p>
                      <p className="flex items-center gap-1 text-xs text-slate-500">
                        <GitFork size={11} /> {r.owner}/{r.default_branch}
                      </p>
                    </div>
                  </div>
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-200"
                    aria-label="Open on GitHub"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>

                <div className="mt-4">
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1 text-slate-400">
                      <ShieldCheck size={12} /> Security score
                    </span>
                    <span className="tabular-nums font-semibold text-slate-200">{r.security_score}</span>
                  </div>
                  <ProgressBar value={r.security_score} />
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    {r.total_scans} scan{r.total_scans === 1 ? "" : "s"} · {r.open_findings} open finding{r.open_findings === 1 ? "" : "s"}
                  </span>
                  <StatusBadge status={r.last_dast_status} />
                </div>
                <p className="mt-2 text-[11px] text-slate-600">
                  Last scan {formatRelative(r.last_scan_at)}
                </p>

                <div className="mt-4 border-t border-slate-800 pt-3">
                  <Link to="/pipelines" className="text-xs font-medium text-indigo-400 hover:text-indigo-300">
                    View pipeline history →
                  </Link>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
