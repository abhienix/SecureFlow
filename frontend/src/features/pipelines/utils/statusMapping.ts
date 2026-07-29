import { PipelineRun } from '../types/pipeline.types';

export const STAGE_ORDER = [
  'checkout', 'code_scan', 'docker', 'trivy',
  'policy', 'deploy_staging', 'zap', 'zap_gate', 'deploy_prod'
] as const;

export const STAGE_META = {
  checkout:       { label: 'Checkout',        icon: 'GitBranch'   },
  code_scan:      { label: 'Code Scan',        icon: 'Shield'      },
  docker:         { label: 'Docker Build',     icon: 'Box'         },
  trivy:          { label: 'Trivy CVE',        icon: 'ScanSearch'  },
  policy:         { label: 'Policy Gate ①',   icon: 'Lock'        },
  deploy_staging: { label: 'Deploy Staging',   icon: 'Server'      },
  zap:            { label: 'OWASP ZAP',        icon: 'Bug'         },
  zap_gate:       { label: 'ZAP Gate ②',      icon: 'ShieldCheck' },
  deploy_prod:    { label: 'Deploy Prod',      icon: 'Rocket'      },
};

export function getNodeStyle(result: string | undefined, stage: string) {
  const r = result?.toUpperCase() || 'PENDING';
  if (r === 'PASS' || r === 'ALLOW' || r === 'SCANNED') {
    return { border: '#10B981', fill: '#064E3B', overlay: 'check', animate: null, skipped: false };
  }
  if (r === 'BLOCK') {
    if (stage === 'code_scan') {
      return { border: '#EF4444', fill: '#7F1D1D', overlay: 'shield-alert', animate: 'pulse-red', skipped: false };
    }
    return { border: '#F59E0B', fill: '#78350F', overlay: 'lock', animate: 'pulse-amber', skipped: false };
  }
  if (r === 'FAILED') {
    return { border: '#EF4444', fill: '#7F1D1D', overlay: 'x', animate: 'pulse-red', skipped: false };
  }
  if (r === 'RUNNING') {
    return { border: '#6366F1', fill: '#1E1B4B', overlay: null, animate: 'spin', skipped: false };
  }
  if (r === 'PENDING') {
    return { border: '#475569', fill: '#1E293B', overlay: 'clock', animate: null, skipped: false };
  }
  if (r === 'SKIPPED' || r === 'skipped') {
    return { border: '#374151', fill: '#111827', overlay: null, animate: null, skipped: true };
  }
  return { border: '#475569', fill: '#1E293B', overlay: 'clock', animate: null, skipped: false };
}

export function getOverallBadge(run: PipelineRun) {
  const steps = run.pipeline_steps || {};
  const action = run.action || run.action_taken;
  if (action === 'BLOCK') {
    if (steps.code_scan?.result === 'BLOCK') return { label: 'SECURITY BLOCK', color: 'red' };
    if (steps.policy?.result === 'BLOCK')    return { label: 'POLICY BLOCKED', color: 'amber' };
    if (steps.zap_gate?.result === 'BLOCK')  return { label: 'ZAP BLOCKED',    color: 'red' };
    return { label: 'BLOCKED', color: 'amber' };
  }
  if (run.status === 'timeout' || run.status === 'superseded') {
    return { label: run.status.toUpperCase(), color: 'gray' };
  }
  const allSteps = Object.values(steps);
  if (allSteps.some(s => s?.result?.toUpperCase() === 'FAILED')) return { label: 'FAILED', color: 'red' };
  if (run.status === 'running' || allSteps.some(s => s?.result?.toUpperCase() === 'RUNNING')) {
    return { label: 'RUNNING', color: 'indigo' };
  }
  if (action === 'ALLOW' && run.status === 'complete') return { label: 'PASSED', color: 'green' };
  return { label: 'QUEUED', color: 'gray' };
}
