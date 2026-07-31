import React from 'react';
import { Play, CheckCircle, XCircle, AlertTriangle, HelpCircle, Loader2, SkipForward, Ban, Clock, Lock } from 'lucide-react';

export interface Stage {
  id: string;
  name: string;
  stage_key?: string;
  order_index?: number;
  status: 'WAITING' | 'RUNNING' | 'PASSED' | 'FAILED' | 'BLOCKED' | 'SKIPPED' | 'CANCELLED';
  duration?: string;
  stepsCount?: number;
  detail?: string;
}

interface PipelineStageGraphProps {
  stages: Stage[];
  onStageClick?: (stage: Stage) => void;
}

const STATUS_META: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  WAITING:  { color: '#475569', icon: <Clock size={16} color="#475569" />, label: 'Waiting' },
  RUNNING:  { color: '#6366F1', icon: <Loader2 size={16} color="#6366F1" className="spin" style={{ animation: 'spin 2s linear infinite' }} />, label: 'Running' },
  PASSED:   { color: '#10B981', icon: <CheckCircle size={16} color="#10B981" />, label: 'Passed' },
  FAILED:   { color: '#EF4444', icon: <XCircle size={16} color="#EF4444" />, label: 'Failed' },
  BLOCKED:  { color: '#F59E0B', icon: <Lock size={16} color="#F59E0B" />, label: 'Blocked' },
  SKIPPED:  { color: '#6B7280', icon: <SkipForward size={16} color="#6B7280" />, label: 'Skipped' },
  CANCELLED:{ color: '#6B7280', icon: <Ban size={16} color="#6B7280" />, label: 'Cancelled' },
};

export function PipelineStageGraph({ stages, onStageClick }: PipelineStageGraphProps) {
  const getStatusBorder = (status: string) => {
    const meta = STATUS_META[status];
    if (!meta) return '1px dashed #475569';
    if (status === 'WAITING') return '1px dashed #475569';
    if (status === 'RUNNING') return '2px solid #6366F1';
    return `2px solid ${meta.color}`;
  };

  const sorted = [...stages].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', overflowX: 'auto', padding: '24px 16px', backgroundColor: 'var(--sf-bg-card)', border: '1px solid var(--sf-border)', borderRadius: '12px', gap: '24px' }}>
      {sorted.map((stage, idx) => {
        const isLast = idx === sorted.length - 1;
        const meta = STATUS_META[stage.status] || STATUS_META.WAITING;
        const isActive = stage.status === 'RUNNING';

        return (
          <React.Fragment key={stage.id || stage.stage_key || idx}>
            <div
              onClick={() => onStageClick?.(stage)}
              style={{
                display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px 16px',
                backgroundColor: 'var(--sf-bg-surface)', border: getStatusBorder(stage.status),
                borderRadius: '8px', minWidth: '150px', cursor: onStageClick ? 'pointer' : 'default',
                transition: 'transform 150ms ease, box-shadow 150ms ease', position: 'relative',
              }}
              onMouseEnter={(e) => { if (onStageClick) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--sf-shadow)'; } }}
              onMouseLeave={(e) => { if (onStageClick) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; } }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {meta.icon}
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--sf-text-primary)', whiteSpace: 'nowrap' }}>{stage.name}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--sf-text-muted)' }}>
                <span>{meta.label}</span>
                <span>{stage.duration || ''}</span>
              </div>
              {isActive && <div className="pulse-glow" style={{ position: 'absolute', inset: -2, borderRadius: '8px', pointerEvents: 'none' }} />}
            </div>
            {!isLast && (
              <div style={{ flex: 1, height: '2px', backgroundColor: stage.status === 'PASSED' ? '#10B981' : isFailure(stage.status) ? '#EF4444' : 'var(--sf-border)', minWidth: '24px', position: 'relative' }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function isFailure(status: string) {
  return status === 'FAILED' || status === 'BLOCKED';
}

export default PipelineStageGraph;
