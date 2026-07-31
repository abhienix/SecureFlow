import React from 'react';
import { PipelineRun } from './types/pipeline.types';
import { STAGE_ORDER, STAGE_META } from './utils/statusMapping';
import { PipelineNode } from './PipelineNode';
import { PipelineConnector } from './PipelineConnector';

interface PipelineNodeGraphProps {
  run: PipelineRun;
  onNodeClick: (stage: string, forcedSkipped: boolean) => void;
}

export function PipelineNodeGraph({ run, onNodeClick }: PipelineNodeGraphProps) {
  const steps = run.pipeline_steps || {};
  const runStatusUpper = String(run.status || '').toUpperCase();

  const isCompletedSuccess = runStatusUpper === 'PASSED' || runStatusUpper === 'COMPLETE' || runStatusUpper === 'SUCCESS';

  // Find the first explicitly failed/blocked stage, if any
  let firstFailedIndex = -1;
  STAGE_ORDER.forEach((key, idx) => {
    const res = String(steps[key]?.result || '').toUpperCase();
    if ((res === 'BLOCK' || res === 'FAILED' || res === 'FAIL') && firstFailedIndex === -1) {
      firstFailedIndex = idx;
    }
  });

  // Find the first running/active stage, if any
  let firstRunningIndex = -1;
  if (!isCompletedSuccess && firstFailedIndex === -1) {
    STAGE_ORDER.forEach((key, idx) => {
      const res = String(steps[key]?.result || '').toUpperCase();
      if ((res === 'RUNNING' || res === 'IN_PROGRESS' || res === 'QUEUED') && firstRunningIndex === -1) {
        firstRunningIndex = idx;
      }
    });
  }

  let isTerminated = false;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      width: '100%',
      overflowX: 'auto',
      padding: '24px 10px',
      boxSizing: 'border-box',
      gap: '4px'
    }}>
      {STAGE_ORDER.map((stageKey, index) => {
        const step = steps[stageKey];
        const meta = STAGE_META[stageKey];
        const rawResult = String(step?.result || 'PENDING').toUpperCase();
        let result = rawResult;

        if (isCompletedSuccess) {
          // In a successful run, all steps up to zap_gate passed!
          if (stageKey === 'deploy_prod') {
            result = ['PASS', 'ALLOW', 'SUCCESS', 'COMPLETE', 'PASSED'].includes(rawResult) ? 'PASS' : 'SKIPPED';
          } else {
            result = (rawResult === 'BLOCK' || rawResult === 'FAILED' || rawResult === 'FAIL') ? rawResult : 'PASS';
          }
        } else if (firstFailedIndex !== -1) {
          // If a step failed/blocked:
          if (index < firstFailedIndex) {
            result = 'PASS';
          } else if (index === firstFailedIndex) {
            result = (rawResult === 'BLOCK' || rawResult === 'BLOCKED' || rawResult === 'FAIL') ? 'BLOCK' : 'FAILED';
          } else {
            result = 'SKIPPED';
          }
        } else if (firstRunningIndex !== -1) {
          // In an in-progress run, steps run sequentially:
          if (index < firstRunningIndex) {
            result = 'PASS';
          } else if (index === firstRunningIndex) {
            result = 'RUNNING';
          } else {
            result = 'PENDING';
          }
        } else {
          // Default fallback resolution
          if (['PASS', 'ALLOW', 'SCANNED', 'CLEAN', 'SUCCESS', 'COMPLETE', 'COMPLETED', 'PASSED'].includes(rawResult)) {
            result = 'PASS';
          }
        }

        // If deploy_staging was bypassed (e.g. backend image unchanged during frontend commit),
        // but subsequent steps (OWASP ZAP / ZAP Gate) ran or passed, resolve deploy_staging to PASS
        if (stageKey === 'deploy_staging' && (result === 'PENDING' || result === 'SKIPPED' || result === 'WAITING' || !step)) {
          const laterSteps = STAGE_ORDER.slice(index + 1);
          if (laterSteps.some(k => steps[k] && ['PASS', 'ALLOW', 'SCANNED', 'CLEAN', 'SUCCESS', 'COMPLETE', 'COMPLETED', 'PASSED'].includes(String(steps[k]?.result || '').toUpperCase()))) {
            result = 'PASS';
          }
        }

        // Save current termination state for this node
        const forceThisNodeSkipped = isTerminated || (firstFailedIndex !== -1 && index > firstFailedIndex);
        
        const resUpper = result.toUpperCase();
        const isCurrentBlockOrFailed = resUpper === 'BLOCK' || resUpper === 'FAILED' || resUpper === 'FAIL';
        
        const drawConnector = index < STAGE_ORDER.length - 1;
        const forceThisConnectorSkipped = forceThisNodeSkipped || isCurrentBlockOrFailed;

        if (isCurrentBlockOrFailed) {
          isTerminated = true;
        }

        return (
          <React.Fragment key={stageKey}>
            <PipelineNode
              stage={stageKey}
              result={result}
              label={meta.label}
              iconName={meta.icon}
              forcedSkipped={forceThisNodeSkipped}
              onClick={() => onNodeClick(stageKey, forceThisNodeSkipped)}
            />
            {drawConnector && (
              <PipelineConnector
                sourceResult={result}
                forcedSkipped={forceThisConnectorSkipped}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default PipelineNodeGraph;
