import { useState } from "react";
import {
  GitBranch,
  Timer,
  X,
  ChevronRight,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Ban,
  Clock,
  SkipForward,
} from "lucide-react";
import {
  Card,
  CardBody,
  PageHeader,
  LoadingState,
  ErrorState,
  ActionBadge,
  StatusBadge,
} from "../../ui";
import { usePipelines, usePipelineDetail } from "../../lib/queries";
import { formatDate, formatDuration, formatCommit, cn } from "../../lib/utils";

export function PipelinesPage() {
  const pipelines = usePipelines(200);
  const [selected, setSelected] = useState<string | null>(null);
  const detail = usePipelineDetail(selected);

  if (pipelines.isLoading) return <LoadingState label="Loading pipelines…" />;
  if (pipelines.isError) {
    return <ErrorState message={pipelines.error?.message} onRetry={() => pipelines.refetch()} />;
  }

  const runs = pipelines.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pipelines"
        description="CI/CD pipeline runs with stage-level enforcement results."
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardBody className="px-0 pb-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-5 pb-2 font-medium">Run</th>
                    <th className="pb-2 pr-4 font-medium">Repo</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 pr-4 font-medium">Verdict</th>
                    <th className="pb-2 pr-4 font-medium">Duration</th>
                    <th className="pb-2 font-medium">Started</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => setSelected(r.id)}
                      className={cn(
                        "cursor-pointer border-b border-slate-800/50 transition-colors hover:bg-slate-800/40",
                        selected === r.id && "bg-indigo-500/10"
                      )}
                    >
                      <td className="px-5 py-3 font-mono text-xs text-slate-300">
                        #{r.run_number ?? r.id.slice(0, 8)}
                      </td>
                      <td className="max-w-[160px] truncate py-3 pr-4 text-slate-300" title={r.repo_name}>
                        {r.repo_name}
                      </td>
                      <td className="py-3 pr-4"><StatusBadge status={r.status} /></td>
                      <td className="py-3 pr-4"><ActionBadge action={r.action_taken} /></td>
                      <td className="py-3 pr-4 tabular-nums text-slate-400">{formatDuration(r.duration)}</td>
                      <td className="whitespace-nowrap py-3 pr-5 text-xs text-slate-500">{formatDate(r.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>

        <Card className="min-h-[400px]">
          {!selected ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
              <GitBranch size={24} className="text-slate-600" />
              <p className="text-sm text-slate-400">Select a pipeline run to inspect stages.</p>
            </div>
          ) : detail.isLoading ? (
            <div className="flex h-full items-center justify-center"><LoadingState /></div>
          ) : detail.isError ? (
            <ErrorState message={detail.error?.message} onRetry={() => detail.refetch()} />
          ) : detail.data ? (
            <PipelineDetailView run={detail.data} onClose={() => setSelected(null)} />
          ) : null}
        </Card>
      </div>
    </div>
  );
}

function stageIcon(status: string) {
  const s = status.toUpperCase();
  switch (s) {
    case "PASSED":
    case "SUCCESS":
    case "COMPLETE":
      return <CheckCircle2 size={14} className="text-emerald-400" />;
    case "RUNNING":
      return <Loader2 size={14} className="animate-spin text-sky-400" />;
    case "FAILED":
      return <AlertCircle size={14} className="text-rose-400" />;
    case "BLOCKED":
    case "BLOCK":
      return <Ban size={14} className="text-rose-400" />;
    case "SKIPPED":
      return <SkipForward size={14} className="text-slate-500" />;
    default:
      return <Clock size={14} className="text-slate-500" />;
  }
}

function PipelineDetailView({ run, onClose }: { run: import("../../lib/types").PipelineDetail; onClose: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-slate-800 px-5 py-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <GitBranch size={15} className="text-indigo-400" />
            #{run.run_number ?? run.id.slice(0, 8)} · {run.repo_name}
          </p>
          <p className="mt-1 flex items-center gap-2 text-xs text-slate-500">
            <span className="font-mono">{formatCommit(run.commit_sha)}</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1"><Timer size={11} /> {formatDuration(run.duration)}</span>
          </p>
          {run.commit_message && <p className="mt-1 text-xs text-slate-400">{run.commit_message}</p>}
        </div>
        <button onClick={onClose} className="rounded-md p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-200">
          <X size={16} />
        </button>
      </div>

      <div className="flex items-center gap-2 px-5 py-3">
        <StatusBadge status={run.status} />
        <ActionBadge action={run.action_taken} />
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-5 pb-5">
        {[...run.stages]
          .sort((a, b) => a.order_index - b.order_index)
          .map((stage) => (
            <div key={stage.id} className="rounded-lg border border-slate-800 bg-slate-950/50">
              <div className="flex items-center gap-2 px-3 py-2.5">
                {stageIcon(stage.status)}
                <span className="text-xs font-medium text-slate-200">{stage.name}</span>
                <span className="ml-auto flex items-center gap-2">
                  {stage.duration && <span className="text-xs text-slate-500">{stage.duration}</span>}
                  <ChevronRight size={13} className="text-slate-600" />
                </span>
              </div>
              {stage.detail && (
                <p className="px-3 pb-2 text-xs text-slate-500">{stage.detail}</p>
              )}
              {stage.steps.length > 0 && (
                <div className="border-t border-slate-800/60 px-3 py-2">
                  {stage.steps.map((step) => (
                    <div key={step.id} className="flex items-center gap-2 py-1">
                      {stageIcon(step.status)}
                      <span className="text-xs text-slate-400">{step.name}</span>
                      {step.duration && <span className="ml-auto text-[11px] text-slate-600">{step.duration}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
