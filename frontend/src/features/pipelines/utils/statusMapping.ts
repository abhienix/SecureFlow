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
    if (stage === 'code_scan' || stage === 'zap_gate' || stage === 'policy') {
      return { ...STATUSES.FAILED, overlay: 'shield-alert' };
    }
    return STATUSES.FAILED;
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
  const action = String(run.action || run.action_taken || '').toUpperCase();
  const runStatusUpper = String(run.status || '').toUpperCase();

  // 1. Prioritize explicit step blocks/failures FIRST (so superseded/skipped status doesn't hide a block!)
  const zapGateRes = String(steps.zap_gate?.result || '').toUpperCase();
  const codeScanRes = String(steps.code_scan?.result || '').toUpperCase();
  const policyRes = String(steps.policy?.result || '').toUpperCase();

  if (zapGateRes === 'BLOCK' || zapGateRes === 'FAIL' || zapGateRes === 'FAILED') {
    return { label: 'ZAP BLOCKED', color: 'red' };
  }
  if (codeScanRes === 'BLOCK' || codeScanRes === 'FAIL' || codeScanRes === 'FAILED') {
    return { label: 'SECURITY BLOCK', color: 'red' };
  }
  if (policyRes === 'BLOCK' || policyRes === 'FAIL' || policyRes === 'FAILED') {
    return { label: 'POLICY BLOCKED', color: 'red' };
  }
  if (action === 'BLOCK' || runStatusUpper === 'BLOCKED') {
    return { label: 'BLOCKED', color: 'red' };
  }

  const allSteps = Object.values(steps);
  if (allSteps.some(s => ['FAILED', 'FAIL', 'BLOCK', 'BLOCKED'].includes(String(s?.result || '').toUpperCase()))) {
    return { label: 'FAILED', color: 'red' };
  }

  // 2. Check if all steps in the graph have completed successfully
  const stepList = Object.values(steps);
  const stepResultsUpper = stepList.map(s => String((s as any)?.result || '').toUpperCase());
  const hasRunningStep = stepResultsUpper.some(r => ['RUNNING', 'PENDING', 'WAITING', 'DEPLOYING', 'IN_PROGRESS'].includes(r));
  const hasFailedStep = stepResultsUpper.some(r => ['FAIL', 'FAILED', 'BLOCK', 'BLOCKED', 'ERROR'].includes(r));
  const hasPassedSteps = stepResultsUpper.some(r => ['PASS', 'ALLOW', 'SCANNED', 'CLEAN', 'SUCCESS', 'COMPLETE', 'PASSED'].includes(r));
  
  // If final deploy_prod or deploy_staging is PASS, or all non-skipped steps passed with zero failures/running
  const isFullyPassed = (stepResultsUpper.includes('PASS') || hasPassedSteps) && !hasRunningStep && !hasFailedStep;

  if (runStatusUpper === 'CANCELLED' || runStatusUpper === 'TIMEOUT') return { label: 'CANCELLED', color: 'gray' };
  if (runStatusUpper === 'SKIPPED' || runStatusUpper === 'SUPERSEDED') return { label: 'SKIPPED', color: 'gray' };
  if (runStatusUpper === 'PASSED' || runStatusUpper === 'SUCCESS' || isFullyPassed) return { label: 'PASSED', color: 'green' };

  if (runStatusUpper === 'COMPLETE') {
    if (hasRunningStep) return { label: 'RUNNING', color: 'indigo' };
    return { label: 'PASSED', color: 'green' };
  }

  if (hasRunningStep || runStatusUpper === 'DEPLOYING' || runStatusUpper === 'RUNNING' || runStatusUpper === 'IN_PROGRESS') {
    return { label: 'RUNNING', color: 'indigo' };
  }
  return { label: 'WAITING', color: 'gray' };
}
