import React from 'react';
import { PipelineRun } from '../types/pipeline.types';

interface SkippedDrawerProps {
  stage: string;
  label: string;
  run: PipelineRun;
}

const HUMAN_EXPLANATIONS: Record<string, string> = {
  "pipeline stopped at code scan": 
    "Skipped because the Code Scan stage failed or was blocked.",
  "no backend or docker files changed": 
    "Skipped because this push did not modify any backend, Docker, or requirements files. Only changed files trigger the relevant stages.",
  "pipeline stopped before code scan completed": 
    "Skipped because Gitleaks failed to install.",
  "Awaiting policy gate decision...": 
    "Skipped because the Policy Gate blocked deployment.",
  "Awaiting staging Cloud Run deployment...": 
    "Skipped because the staging deployment was not reached."
};

export function SkippedDrawer({ stage, label, run }: SkippedDrawerProps) {
  const step = run.pipeline_steps?.[stage as keyof typeof run.pipeline_steps];
  const detail = step?.detail || 'This stage was skipped by the workflow controller.';
  const explanation = HUMAN_EXPLANATIONS[detail] || HUMAN_EXPLANATIONS[detail.trim()] || null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>
          Execution Detail
        </div>
        <div style={{
          backgroundColor: '#1E293B',
          border: '1px solid #334155',
          borderRadius: '6px',
          padding: '12px',
          fontSize: '12px',
          color: '#E2E8F0',
          fontFamily: 'var(--sf-font-mono)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all'
        }}>
          {detail}
        </div>
      </div>

      {explanation && (
        <div>
          <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>
            Explanation
          </div>
          <p style={{
            fontSize: '13px',
            color: '#94A3B8',
            margin: 0,
            lineHeight: '1.5',
            backgroundColor: 'rgba(255,255,255,0.02)',
            padding: '12px',
            borderRadius: '6px',
            border: '1px solid #1E293B'
          }}>
            {explanation}
          </p>
        </div>
      )}
    </div>
  );
}
export default SkippedDrawer;
