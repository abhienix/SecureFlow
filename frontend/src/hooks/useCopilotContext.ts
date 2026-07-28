import { useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useCopilotStore } from '../store/copilotStore';
import { useSecurityStore } from '../store/securityStore';
import { usePipelineStore } from '../store/pipelineStore';
import { useMetricsStore } from '../store/metricsStore';

export function useCopilotContext() {
  const location = useLocation();
  const params = useParams();
  const setContext = useCopilotStore((s) => s.setContext);
  const activeFinding = useSecurityStore((s) => s.activeFinding);
  const activeRun = usePipelineStore((s) => s.activeRun);
  const alerts = useMetricsStore((s) => s.alerts);

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

    if (alerts && alerts.length > 0) {
      context.infra = {
        active_alerts: alerts.map((a) => a.name),
        degraded_services: ['celery-worker'],
      };
    }

    setContext(context);
  }, [location.pathname, params.id, activeFinding, activeRun, alerts, setContext]);
}
