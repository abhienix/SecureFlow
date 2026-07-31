import React from 'react';

export interface GanttStage {
  name: string;
  stage_key?: string;
  order_index?: number;
  startOffset: number;
  durationWidth: number;
  status: 'WAITING' | 'RUNNING' | 'PASSED' | 'FAILED' | 'BLOCKED' | 'SKIPPED' | 'CANCELLED';
  duration: string;
}

interface PipelineTimelineProps {
  stages: GanttStage[];
  onStageClick?: (stage: GanttStage) => void;
}

const STATUS_COLORS: Record<string, string> = {
  WAITING:  '#475569',
  RUNNING:  '#6366F1',
  PASSED:   '#10B981',
  FAILED:   '#EF4444',
  BLOCKED:  '#F59E0B',
  SKIPPED:  '#6B7280',
  CANCELLED:'#6B7280',
};

export function PipelineTimeline({ stages, onStageClick }: PipelineTimelineProps) {
  const getStatusColor = (status: string) => STATUS_COLORS[status] || '#475569';

  const sorted = [...stages].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

  return (
    <div style={{ backgroundColor: 'var(--sf-bg-card)', border: '1px solid var(--sf-border)', borderRadius: '12px', padding: '20px', width: '100%' }}>
      <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--sf-text-primary)', margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Pipeline Execution Timeline
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {sorted.map((stage, idx) => (
          <div key={stage.stage_key || idx} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '12px', width: '130px', color: 'var(--sf-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{stage.name}</span>
            <div style={{ flex: 1, backgroundColor: 'var(--sf-bg-surface)', height: '14px', borderRadius: '4px', position: 'relative' }}>
              <div
                onClick={() => onStageClick?.(stage)}
                style={{
                  position: 'absolute', left: `${stage.startOffset}%`, width: `${Math.max(2, stage.durationWidth)}%`,
                  height: '100%', backgroundColor: getStatusColor(stage.status), borderRadius: '3px',
                  cursor: onStageClick ? 'pointer' : 'default', transition: 'transform 150ms ease',
                }}
                onMouseEnter={(e) => { if (onStageClick) e.currentTarget.style.transform = 'scaleY(1.2)'; }}
                onMouseLeave={(e) => { if (onStageClick) e.currentTarget.style.transform = 'scaleY(1.0)'; }}
              />
            </div>
            <span style={{ fontSize: '12px', width: '48px', textAlign: 'right', color: 'var(--sf-text-muted)', fontFamily: 'var(--sf-font-mono)' }}>{stage.duration}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PipelineTimeline;
