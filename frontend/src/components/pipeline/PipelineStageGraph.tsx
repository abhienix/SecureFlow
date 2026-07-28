import React from 'react';
import { Play, CheckCircle, XCircle, AlertTriangle, HelpCircle, Loader2 } from 'lucide-react';

export interface Stage {
  id: string;
  name: string;
  status: 'passed' | 'failed' | 'running' | 'queued' | 'skipped' | 'pending';
  duration?: string;
  stepsCount?: number;
  eta?: string;
}

interface PipelineStageGraphProps {
  stages: Stage[];
  onStageClick?: (stage: Stage) => void;
}

export function PipelineStageGraph({ stages, onStageClick }: PipelineStageGraphProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle size={16} color="var(--sf-success)" />;
      case 'failed':
        return <XCircle size={16} color="var(--sf-danger)" />;
      case 'running':
        return <Loader2 size={16} color="var(--sf-accent)" className="spin" style={{ animation: 'spin 2s linear infinite' }} />;
      case 'queued':
      case 'pending':
        return <Play size={16} color="var(--sf-info)" />;
      default:
        return <HelpCircle size={16} color="var(--sf-text-muted)" />;
    }
  };

  const getStatusBorder = (status: string) => {
    switch (status) {
      case 'passed':
        return '2px solid var(--sf-success)';
      case 'failed':
        return '2px solid var(--sf-danger)';
      case 'running':
        return '2px solid var(--sf-accent)';
      case 'queued':
      case 'pending':
        return '1px dashed var(--sf-info)';
      default:
        return '1px solid var(--sf-border)';
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        overflowX: 'auto',
        padding: '24px 16px',
        backgroundColor: 'var(--sf-bg-card)',
        border: '1px solid var(--sf-border)',
        borderRadius: '12px',
        gap: '24px',
      }}
    >
      {stages.map((stage, idx) => {
        const isLast = idx === stages.length - 1;
        const isRunning = stage.status === 'running';

        return (
          <React.Fragment key={stage.id}>
            {/* Stage Box */}
            <div
              onClick={() => onStageClick?.(stage)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '12px 16px',
                backgroundColor: 'var(--sf-bg-surface)',
                border: getStatusBorder(stage.status),
                borderRadius: '8px',
                minWidth: '150px',
                cursor: onStageClick ? 'pointer' : 'default',
                transition: 'transform 150ms ease, box-shadow 150ms ease',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                if (onStageClick) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = 'var(--sf-shadow)';
                }
              }}
              onMouseLeave={(e) => {
                if (onStageClick) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            >
              {/* Top Row: Icon + Name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {getStatusIcon(stage.status)}
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--sf-text-primary)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {stage.name}
                </span>
              </div>

              {/* Bottom Row: Steps + Duration / ETA */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '11px',
                  color: 'var(--sf-text-muted)',
                }}
              >
                <span>{stage.stepsCount !== undefined ? `${stage.stepsCount} steps` : '—'}</span>
                <span>{stage.duration || stage.eta || ''}</span>
              </div>

              {/* Running Status Pulse */}
              {isRunning && (
                <div
                  className="pulse-glow"
                  style={{
                    position: 'absolute',
                    inset: -2,
                    borderRadius: '8px',
                    pointerEvents: 'none',
                  }}
                />
              )}
            </div>

            {/* Connector Line */}
            {!isLast && (
              <div
                style={{
                  flex: 1,
                  height: '2px',
                  backgroundColor: stage.status === 'passed' ? 'var(--sf-success)' : 'var(--sf-border)',
                  minWidth: '24px',
                  position: 'relative',
                }}
              >
                {stage.status === 'running' && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: '100%',
                      backgroundColor: 'var(--sf-accent)',
                      transformOrigin: 'left',
                      animation: 'skeleton-shimmer 1.5s linear infinite',
                    }}
                  />
                )}
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
export default PipelineStageGraph;
