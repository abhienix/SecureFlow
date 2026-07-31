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

const STATUSES = {
  PASSED:   { border: '#10B981', fill: '#064E3B', overlay: 'check', animate: null, skipped: false },
  BLOCKED:  { border: '#F59E0B', fill: '#78350F', overlay: 'lock', animate: 'pulse-amber', skipped: false },
  FAILED:   { border: '#EF4444', fill: '#7F1D1D', overlay: 'x', animate: 'pulse-red', skipped: false },
  RUNNING:  { border: '#6366F1', fill: '#1E1B4B', overlay: null, animate: 'spin', skipped: false },
  WAITING:  { border: '#475569', fill: '#1E293B', overlay: 'clock', animate: null, skipped: false },
  SKIPPED:  { border: '#374151', fill: '#111827', overlay: null, animate: null, skipped: true },
  CANCELLED:{ border: '#374151', fill: '#111827', overlay: null, animate: null, skipped: true },
};

export function getNodeStyle(result: string | undefined, stage: string) {
  const r = (result ?? '').toString().toUpperCase().trim();
  if (['PASS', 'ALLOW', 'SCANNED', 'CLEAN', 'SUCCESS', 'COMPLETE', 'COMPLETED', 'PASSED'].includes(r)) {
    return STATUSES.PASSED;
  }
  if (['BLOCK', 'BLOCKED'].includes(r)) {
    if (stage === 'code_scan') {
      return { ...STATUSES.FAILED, overlay: 'shield-alert' };
    }
    return STATUSES.BLOCKED;
  }
  if (['FAIL', 'FAILED', 'FAILURE', 'ERROR'].includes(r)) {
    return STATUSES.FAILED;
  }
  if (['RUN', 'RUNNING', 'QUEUED', 'IN_PROGRESS', 'INPROGRESS'].includes(r)) {
    return STATUSES.RUNNING;
  }
  if (['PENDING', 'WAITING', 'AWAITING'].includes(r)) {
    return STATUSES.WAITING;
  }
  if (['SKIP', 'SKIPPED', 'SKIPPING'].includes(r)) {
    return STATUSES.SKIPPED;
  }
  if (['CANCEL', 'CANCELLED', 'CANCELED'].includes(r)) {
    return STATUSES.CANCELLED;
  }
  return STATUSES.WAITING;
}

export function getOverallBadge(run: PipelineRun) {
  const steps = run.pipeline_steps || {};
  const action = run.action || run.action_taken;

  if (action === 'BLOCK' || run.status === 'BLOCKED') {
    if (steps.code_scan?.result === 'BLOCK') return { label: 'SECURITY BLOCK', color: 'red' };
    if (steps.policy?.result === 'BLOCK')    return { label: 'POLICY BLOCKED', color: 'amber' };
    if (steps.zap_gate?.result === 'BLOCK')  return { label: 'ZAP BLOCKED',    color: 'red' };
    return { label: 'BLOCKED', color: 'amber' };
  }

  if (run.status === 'CANCELLED' || run.status === 'timeout') return { label: 'CANCELLED', color: 'gray' };
  if (run.status === 'SKIPPED' || run.status === 'superseded') return { label: 'SKIPPED', color: 'gray' };

  const statusUpper = (run.status || '').toUpperCase();
  if (statusUpper === 'PASSED' || statusUpper === 'COMPLETE') return { label: 'PASSED', color: 'green' };

  const allSteps = Object.values(steps);
  if (allSteps.some(s => s?.result?.toUpperCase() === 'FAILED' || s?.result?.toUpperCase() === 'BLOCK')) {
    return { label: 'FAILED', color: 'red' };
  }
  if (statusUpper === 'RUNNING' || allSteps.some(s => s?.result?.toUpperCase() === 'RUNNING')) {
    return { label: 'RUNNING', color: 'indigo' };
  }
  return { label: 'WAITING', color: 'gray' };
}
