import React from 'react';

export interface GanttStage {
  name: string;
  startOffset: number; // percentage (0 - 100)
  durationWidth: number; // percentage (0 - 100)
  status: 'passed' | 'failed' | 'running' | 'skipped' | 'queued' | 'pending';
  duration: string;
}

interface PipelineTimelineProps {
  stages: GanttStage[];
  onStageClick?: (stage: GanttStage) => void;
}

export function PipelineTimeline({ stages, onStageClick }: PipelineTimelineProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed':
        return 'var(--sf-success)';
      case 'failed':
        return 'var(--sf-danger)';
      case 'running':
        return 'var(--sf-accent)';
      case 'skipped':
        return 'var(--sf-text-muted)';
      default:
        return 'var(--sf-bg-elevated)';
    }
  };

  return (
    <div
      style={{
        backgroundColor: 'var(--sf-bg-card)',
        border: '1px solid var(--sf-border)',
        borderRadius: '12px',
        padding: '20px',
        width: '100%',
      }}
    >
      <h3
        style={{
          fontSize: '14px',
          fontWeight: 700,
          color: 'var(--sf-text-primary)',
          margin: '0 0 16px 0',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        Pipeline Execution Timeline
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {stages.map((stage, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Label */}
            <span
              style={{
                fontSize: '12px',
                width: '130px',
                color: 'var(--sf-text-secondary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontWeight: 500,
              }}
            >
              {stage.name}
            </span>

            {/* Time Track container */}
            <div
              style={{
                flex: 1,
                backgroundColor: 'var(--sf-bg-surface)',
                height: '14px',
                borderRadius: '4px',
                position: 'relative',
              }}
            >
              {/* Colored Gantt Bar */}
              <div
                onClick={() => onStageClick?.(stage)}
                style={{
                  position: 'absolute',
                  left: `${stage.startOffset}%`,
                  width: `${Math.max(2, stage.durationWidth)}%`,
                  height: '100%',
                  backgroundColor: getStatusColor(stage.status),
                  borderRadius: '3px',
                  cursor: onStageClick ? 'pointer' : 'default',
                  transition: 'transform 150ms ease',
                }}
                onMouseEnter={(e) => {
                  if (onStageClick) e.currentTarget.style.transform = 'scaleY(1.2)';
                }}
                onMouseLeave={(e) => {
                  if (onStageClick) e.currentTarget.style.transform = 'scaleY(1.0)';
                }}
              />
            </div>

            {/* Duration text */}
            <span
              style={{
                fontSize: '12px',
                width: '48px',
                textAlign: 'right',
                color: 'var(--sf-text-muted)',
                fontFamily: 'var(--sf-font-mono)',
              }}
            >
              {stage.duration}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
export default PipelineTimeline;
