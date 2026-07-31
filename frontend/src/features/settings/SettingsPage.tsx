import { useState } from "react";
import {
  Server,
  Database,
  Boxes,
  Bell,
  Workflow,
  Cpu,
  Webhook,
  Activity,
  RefreshCw,
} from "lucide-react";
import {
  Card,
  CardBody,
  CardHeader,
  PageHeader,
  LoadingState,
  ErrorState,
  Button,
  StatusBadge,
} from "../../ui";
import { useSystemHealth, useSystemInfo, useSlackStatus } from "../../lib/queries";

const componentIcon: Record<string, typeof Server> = {
  fastapi: Server,
  database: Database,
  redis: Boxes,
  celery: Workflow,
  github: Activity,
  slack: Bell,
  void_ai: Cpu,
};

export function SettingsPage() {
  const health = useSystemHealth();
  const info = useSystemInfo();
  const slack = useSlackStatus();
  const [sent, setSent] = useState<string | null>(null);

  const sendTest = async () => {
    setSent("");
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL ?? ""}/api/slack/test`,
        { method: "POST", headers: { "Content-Type": "application/json" } }
      );
      if (res.ok) {
        const body = await res.json();
        setSent(body.message ?? "Test alert sent.");
      } else {
        setSent(`Test failed (${res.status}).`);
      }
    } catch (e) {
      setSent(e instanceof Error ? e.message : "Test failed.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="System health, environment info, and integrations." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="System Health"
            subtitle="Component status from /api/health/system."
            action={health.isFetching ? <RefreshCw size={14} className="animate-spin text-slate-500" /> : undefined}
          />
          <CardBody className="space-y-2">
            {health.isLoading ? (
              <LoadingState />
            ) : health.isError ? (
              <ErrorState message={health.error?.message} onRetry={() => health.refetch()} />
            ) : (
              <>
                <div className="mb-3">
                  <StatusBadge status={health.data?.status} />
                </div>
                {Object.entries(health.data?.components ?? {}).map(([key, comp]) => {
                  const Icon = componentIcon[key] ?? Server;
                  return (
                    <div key={key} className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2.5">
                      <Icon size={15} className="text-slate-500" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-200">{comp.name}</p>
                        {comp.latency_ms !== undefined && (
                          <p className="text-xs text-slate-500">{comp.latency_ms} ms</p>
                        )}
                        {comp.active_workers !== undefined && (
                          <p className="text-xs text-slate-500">{comp.active_workers} active workers</p>
                        )}
                        {comp.webhook_configured !== undefined && (
                          <p className="text-xs text-slate-500">
                            Webhook {comp.webhook_configured ? "configured" : "not configured"}
                          </p>
                        )}
                        {comp.model && <p className="text-xs text-slate-500">{comp.model}</p>}
                      </div>
                      <StatusBadge status={comp.status} />
                    </div>
                  );
                })}
              </>
            )}
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Environment" />
            <CardBody>
              {info.isLoading ? (
                <LoadingState />
              ) : info.isError ? (
                <ErrorState message={info.error?.message} onRetry={() => info.refetch()} />
              ) : (
                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {[
                    ["Environment", info.data?.environment],
                    ["Frontend", info.data?.frontend_version],
                    ["Backend", info.data?.backend_version],
                    ["Build", info.data?.build_number],
                    ["Database", info.data?.database_version],
                    ["Redis", info.data?.redis_status],
                    ["Workers", info.data?.worker_status],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2.5">
                      <dt className="text-[11px] uppercase tracking-wider text-slate-500">{k}</dt>
                      <dd className="mt-0.5 text-sm font-medium text-slate-200">{v ?? "—"}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Slack Integration" />
            <CardBody>
              {slack.isLoading ? (
                <LoadingState />
              ) : slack.isError ? (
                <ErrorState message={slack.error?.message} onRetry={() => slack.refetch()} />
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Webhook size={15} className={slack.data?.configured ? "text-emerald-400" : "text-slate-500"} />
                    <span className="text-slate-300">
                      {slack.data?.configured ? "Configured" : "Not configured"}
                    </span>
                    {slack.data?.channel && (
                      <span className="font-mono text-xs text-slate-500">{slack.data.channel}</span>
                    )}
                  </div>
                  <p className="truncate text-xs text-slate-500">{slack.data?.webhook_preview}</p>
                  <Button variant="secondary" size="sm" onClick={sendTest} loading={sent === ""}>
                    Send test alert
                  </Button>
                  {sent && <p className="text-xs text-emerald-400">{sent}</p>}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
