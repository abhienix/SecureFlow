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
        const result = step?.result || 'PENDING';
        
        // Save current termination state for this node, but check *after* if we set it for future
        const forceThisNodeSkipped = isTerminated;
        
        const isCurrentBlockOrFailed = result === 'BLOCK' || result === 'FAILED';
        
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
