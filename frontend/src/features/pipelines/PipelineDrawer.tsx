import React, { useEffect } from 'react';
import { X, Check, AlertCircle, Ban, RefreshCw, HelpCircle, Lock } from 'lucide-react';
import { PipelineRun } from './types/pipeline.types';
import { STAGE_META, getNodeStyle } from './utils/statusMapping';
import PassDrawer from './drawers/PassDrawer';
import FailedDrawer from './drawers/FailedDrawer';
import BlockCodeScanDrawer from './drawers/BlockCodeScanDrawer';
import BlockPolicyDrawer from './drawers/BlockPolicyDrawer';
import BlockZapGateDrawer from './drawers/BlockZapGateDrawer';
import SkippedDrawer from './drawers/SkippedDrawer';
import RunningDrawer from './drawers/RunningDrawer';
import PendingDrawer from './drawers/PendingDrawer';

interface PipelineDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  stage: string | null;
  run: PipelineRun | null;
  onNavigateToSecurity: () => void;
  onNavigateToPolicies: () => void;
  forcedSkipped?: boolean;
}

export function PipelineDrawer({
  isOpen,
  onClose,
  stage,
  run,
  onNavigateToSecurity,
  onNavigateToPolicies,
  forcedSkipped = false
}: PipelineDrawerProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !stage || !run) return null;

  const step = run.pipeline_steps?.[stage as keyof typeof run.pipeline_steps];
  const meta = STAGE_META[stage as keyof typeof STAGE_META] || { label: stage, icon: 'HelpCircle' };
  
  const currentResult = forcedSkipped ? 'skipped' : step?.result || 'PENDING';
  const nodeStyle = getNodeStyle(currentResult, stage);

  // Render header status details
  const renderHeaderStatus = () => {
    const r = currentResult.toUpperCase();
    if (r === 'PASS' || r === 'ALLOW' || r === 'SCANNED') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10B981' }}>
          <Check size={18} strokeWidth={3} />
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>
            {meta.label} — Passed
          </h3>
        </div>
      );
    }
    if (r === 'BLOCK') {
      if (stage === 'code_scan') {
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#EF4444' }}>
            <AlertCircle size={18} />
            <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>
              Code Scan — Security Block
            </h3>
          </div>
        );
      }
      if (stage === 'zap_gate') {
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#EF4444' }}>
            <Ban size={18} />
            <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>
              ZAP Gate — Production Blocked
            </h3>
          </div>
        );
      }
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#F59E0B' }}>
          <Lock size={18} />
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>
            {meta.label} — Blocked
          </h3>
        </div>
      );
    }
    if (r === 'FAILED') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#EF4444' }}>
          <X size={18} strokeWidth={3} />
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>
            {meta.label} — Failed
          </h3>
        </div>
      );
    }
    if (r === 'RUNNING') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6366F1' }}>
          <RefreshCw size={16} className="sf-spin" />
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>
            {meta.label} — Running
          </h3>
        </div>
      );
    }
    if (r === 'SKIPPED') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6B7280' }}>
          <Ban size={18} />
          <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>
            {meta.label} — Skipped
          </h3>
        </div>
      );
    }
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94A3B8' }}>
        <HelpCircle size={18} />
        <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>
          {meta.label} — Pending
        </h3>
      </div>
    );
  };

  // Render specific sub-drawer content
  const renderBody = () => {
    const r = currentResult.toUpperCase();
    if (r === 'PASS' || r === 'ALLOW' || r === 'SCANNED') {
      return (
        <PassDrawer
          stage={stage}
          label={meta.label}
          run={run}
          onNavigateToSecurity={onNavigateToSecurity}
        />
      );
    }
    if (r === 'BLOCK') {
      if (stage === 'code_scan') {
        return (
          <BlockCodeScanDrawer
            run={run}
            onNavigateToSecurity={onNavigateToSecurity}
          />
        );
      }
      if (stage === 'policy') {
        return (
          <BlockPolicyDrawer
            run={run}
            onNavigateToSecurity={onNavigateToSecurity}
            onNavigateToPolicies={onNavigateToPolicies}
          />
        );
      }
      if (stage === 'zap_gate') {
        return (
          <BlockZapGateDrawer
            run={run}
            onNavigateToSecurity={onNavigateToSecurity}
            onNavigateToPolicies={onNavigateToPolicies}
          />
        );
      }
    }
    if (r === 'FAILED') {
      return (
        <FailedDrawer
          stage={stage}
          label={meta.label}
          run={run}
          onNavigateToSecurity={onNavigateToSecurity}
        />
      );
    }
    if (r === 'RUNNING') {
      return (
        <RunningDrawer
          stage={stage}
          label={meta.label}
          run={run}
        />
      );
    }
    if (r === 'SKIPPED') {
      return (
        <SkippedDrawer
          stage={stage}
          label={meta.label}
          run={run}
        />
      );
    }
    return <PendingDrawer label={meta.label} />;
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9995,
      display: 'flex',
      justifyContent: 'flex-end',
      pointerEvents: 'auto'
    }}>
      {/* Backdrop */}
      <div 
        onClick={onClose}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(1px)',
          transition: 'opacity 250ms ease'
        }}
      />

      {/* Slide-out Drawer */}
      <div style={{
        position: 'relative',
        width: '400px',
        maxWidth: '92vw',
        height: '100%',
        backgroundColor: '#111827',
        borderLeft: '1px solid #1E293B',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
        display: 'flex',
        flexDirection: 'column',
        animation: 'sf-slide-in 250ms ease-out',
        borderTop: `4px solid ${nodeStyle.border}`
      }}>
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #1E293B',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {renderHeaderStatus()}

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 150ms'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1E293B'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{
          flex: 1,
          padding: '20px',
          overflowY: 'auto'
        }}>
          {renderBody()}
        </div>
      </div>

      <style>{`
        @keyframes sf-slide-in {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes sf-spin-slow {
          to { transform: rotate(360deg); }
        }
        .sf-spin {
          animation: sf-spin-slow 1.5s linear infinite;
        }
      `}</style>
    </div>
  );
}
export default PipelineDrawer;
