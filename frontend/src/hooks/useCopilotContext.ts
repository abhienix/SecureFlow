import { useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCopilotStore } from '../store/copilotStore';
import { useSecurityStore } from '../store/securityStore';
import { usePipelineStore } from '../store/pipelineStore';
import { useMetricsStore } from '../store/metricsStore';
import { client } from '../api/client';

export function useCopilotContext() {
  const location = useLocation();
  const params = useParams();
  const setContext = useCopilotStore((s) => s.setContext);
  const activeFinding = useSecurityStore((s) => s.activeFinding);
  const activeRun = usePipelineStore((s) => s.activeRun);
  const alerts = useMetricsStore((s) => s.alerts);

  // Fetch latest pipeline for deep context
  const { data: latestRun } = useQuery({
    queryKey: ['pipelines', 'latest'],
    queryFn: async () => {
      const res = await client.get('/pipelines/latest');
      return res.data;
    },
    refetchInterval: 30000,
  });

  useEffect(() => {
    const currentRoute = location.pathname;

    const context: any = {
      page: currentRoute,
      timestamp: new Date().toISOString(),
    };

    if (params.id) {
      context.itemId = params.id;
    }

    if (activeFinding) {
      context.finding = {
        id: activeFinding.id,
        title: activeFinding.title,
        severity: activeFinding.severity,
        scanner: activeFinding.scanner,
        file: activeFinding.file,
        line: activeFinding.line,
        status: activeFinding.status,
      };
    }

    if (activeRun) {
      context.pipeline = {
        id: activeRun.id,
        run_number: activeRun.run_number,
        status: activeRun.status,
        action_taken: activeRun.action_taken,
        commit_sha: activeRun.commit_sha,
      };
    }

    // Enrich with latest run stages if available
    if (latestRun?.stages) {
      context.latest_run = {
        id: latestRun.id,
        status: latestRun.status,
        stages: latestRun.stages.map((s: any) => ({
          name: s.name,
          stage_key: s.stage_key,
          status: s.status,
          order_index: s.order_index,
        })),
      };
    }

    if (alerts && alerts.length > 0) {
      context.infra = {
        active_alerts: alerts.map((a: any) => a.name),
        degraded_services: ['celery-worker'],
      };
    }

    setContext(context);
  }, [location.pathname, params.id, activeFinding, activeRun, alerts, setContext, latestRun]);
}
