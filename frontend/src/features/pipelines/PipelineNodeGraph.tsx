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

  // Track if pipeline flow has terminated (on BLOCK or FAILED)
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
        let result = step?.result || 'PENDING';
        
        // Seamless GitHub Action Flow mapping:
        // 1. If deploy_staging was skipped non-blockingly (or omitted when subsequent steps like zap ran),
        // treat deploy_staging as PASS so nodes connect in a continuous green flow.
        if (stageKey === 'deploy_staging' && (result === 'PENDING' || result === 'SKIPPED' || result === 'WAITING' || !step)) {
          if (steps.zap || steps.zap_gate || steps.deploy_prod || run.status === 'complete' || run.status === 'PASSED' || run.status === 'FAILED' || run.status === 'complete') {
            result = 'PASS';
          }
        }

        // 2. If checkout/code_scan/docker/trivy/policy passed, and they don't have explicit result, mark PASS
        if (['checkout', 'code_scan', 'docker', 'trivy', 'policy'].includes(stageKey) && (result === 'PENDING' || !step)) {
          const laterSteps = STAGE_ORDER.slice(index + 1);
          if (laterSteps.some(k => steps[k] && ['PASS', 'ALLOW', 'SCANNED', 'CLEAN', 'SUCCESS', 'COMPLETE', 'COMPLETED', 'PASSED', 'BLOCK', 'FAIL', 'FAILED'].includes((steps[k]?.result || '').toUpperCase()))) {
            result = 'PASS';
          }
        }
        
        // Save current termination state for this node
        const forceThisNodeSkipped = isTerminated;
        
        const resUpper = (result || '').toString().toUpperCase();
        const isCurrentBlockOrFailed = resUpper === 'BLOCK' || resUpper === 'FAILED' || resUpper === 'FAIL';
        
        // Connectors are drawn between nodes. The connector after node N depends on node N
        const drawConnector = index < STAGE_ORDER.length - 1;
        const forceThisConnectorSkipped = isTerminated || isCurrentBlockOrFailed;

        // If this node was a BLOCK or FAILED, terminate the flow for ALL subsequent stages
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
