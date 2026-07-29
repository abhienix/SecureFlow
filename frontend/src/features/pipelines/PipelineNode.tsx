import React from 'react';
import { 
  GitBranch, Shield, Box, ScanSearch, Lock, Server, Bug, ShieldCheck, Rocket,
  Check, X, ShieldAlert, Clock
} from 'lucide-react';
import { getNodeStyle } from './utils/statusMapping';

interface PipelineNodeProps {
  stage: string;
  result?: string;
  label: string;
  iconName: string;
  onClick?: () => void;
  forcedSkipped?: boolean;
}

const StageIconMap: Record<string, React.ComponentType<any>> = {
  GitBranch,
  Shield,
  Box,
  ScanSearch,
  Lock,
  Server,
  Bug,
  ShieldCheck,
  Rocket
};

export function PipelineNode({
  stage,
  result,
  label,
  iconName,
  onClick,
  forcedSkipped = false
}: PipelineNodeProps) {
  const baseStyle = getNodeStyle(forcedSkipped ? 'skipped' : result, stage);
  const IconComponent = StageIconMap[iconName] || Server;

  // Render overlays
  const renderOverlay = () => {
    if (forcedSkipped || baseStyle.skipped || !baseStyle.overlay) return null;
    
    switch (baseStyle.overlay) {
      case 'check':
        return (
          <div style={{
            position: 'absolute', bottom: -2, right: -2,
            width: 16, height: 16, borderRadius: '50%',
            backgroundColor: '#ffffff', border: '1px solid #10B981',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
          }}>
            <Check size={10} color="#10B981" strokeWidth={3} />
          </div>
        );
      case 'lock':
        return (
          <div style={{
            position: 'absolute', bottom: -2, right: -2,
            width: 16, height: 16, borderRadius: '50%',
            backgroundColor: '#F59E0B',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
          }}>
            <Lock size={10} color="#ffffff" strokeWidth={3} />
          </div>
        );
      case 'shield-alert':
        return (
          <div style={{
            position: 'absolute', bottom: -2, right: -2,
            width: 16, height: 16, borderRadius: '50%',
            backgroundColor: '#EF4444',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
          }}>
            <ShieldAlert size={10} color="#ffffff" />
          </div>
        );
      case 'x':
        return (
          <div style={{
            position: 'absolute', bottom: -2, right: -2,
            width: 16, height: 16, borderRadius: '50%',
            backgroundColor: '#EF4444',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
          }}>
            <X size={10} color="#ffffff" strokeWidth={3} />
          </div>
        );
      case 'clock':
        return (
          <div style={{
            position: 'absolute', bottom: -2, right: -2,
            width: 14, height: 14, borderRadius: '50%',
            backgroundColor: '#1E293B', border: '1px solid #475569',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Clock size={8} color="#94A3B8" />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div 
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        width: '56px',
        cursor: onClick ? 'pointer' : 'default',
        opacity: forcedSkipped || baseStyle.skipped ? 0.45 : 1,
        position: 'relative'
      }}
    >
      <div 
        className={baseStyle.animate ? `sf-node-${baseStyle.animate}` : ''}
        style={{
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          border: `3px solid ${baseStyle.border}`,
          backgroundColor: baseStyle.fill,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          boxSizing: 'border-box',
          color: baseStyle.skipped ? '#6B7280' : '#E2E8F0',
          transition: 'all 200ms ease'
        }}
      >
        {/* Spinning border overlay for running */}
        {baseStyle.animate === 'spin' && (
          <div style={{
            boxSizing: 'border-box',
            border: '3px solid transparent',
            borderTopColor: '#6366F1',
            borderRadius: '50%',
            width: '52px',
            height: '52px',
            position: 'absolute',
            top: '-3px',
            left: '-3px',
            animation: 'sf-spin 1s linear infinite'
          }} />
        )}

        {/* Diagonal line for skipped */}
        {(forcedSkipped || baseStyle.skipped) && (
          <div style={{
            position: 'absolute',
            width: '2px',
            height: '60px',
            backgroundColor: '#6B7280',
            transform: 'rotate(-45deg)',
            top: '-4px',
            left: '50%'
          }} />
        )}

        <IconComponent size={20} />
        {renderOverlay()}
      </div>

      <span style={{
        fontSize: '11px',
        fontWeight: 500,
        color: '#94A3B8',
        textAlign: 'center',
        lineHeight: '1.2',
        maxHeight: '26px',
        overflow: 'hidden',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        whiteSpace: 'normal',
        wordBreak: 'break-word'
      }}>
        {label}
      </span>

      <style>{`
        @keyframes sf-pulse-amber {
          0%, 100% { box-shadow: 0 0 0 0px rgba(245, 158, 11, 0.4); }
          50% { box-shadow: 0 0 0 6px rgba(245, 158, 11, 0.1); }
        }
        @keyframes sf-pulse-red {
          0%, 100% { box-shadow: 0 0 0 0px rgba(239, 68, 68, 0.4); }
          50% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0.1); }
        }
        @keyframes sf-spin {
          to { transform: rotate(360deg); }
        }
        .sf-node-pulse-amber {
          animation: sf-pulse-amber 1.5s infinite ease-in-out;
        }
        .sf-node-pulse-red {
          animation: sf-pulse-red 1.5s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
}
