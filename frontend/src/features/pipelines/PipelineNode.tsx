import React from 'react';
import { 
  GitBranch, Shield, Box, ScanSearch, Lock, Server, Bug, ShieldCheck, Rocket,
  Check, X, ShieldAlert, Clock
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
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
  const { C } = useTheme();
  const baseStyle = getNodeStyle(forcedSkipped ? 'skipped' : result, stage);
  const IconComponent = StageIconMap[iconName] || Server;

  const r = (forcedSkipped ? 'skipped' : result || 'PENDING').toUpperCase().trim();

  // Determine 3D spherical radial gradient fill and hover shadow colors
  let gradientBackground = 'radial-gradient(circle at 30% 30%, #475569, #1E293B)';
  let glowColor = 'rgba(71, 85, 105, 0.3)';

  if (['PASS', 'ALLOW', 'SCANNED', 'CLEAN', 'SUCCESS', 'COMPLETE', 'COMPLETED', 'PASSED'].includes(r)) {
    gradientBackground = 'radial-gradient(circle at 30% 30%, #34D399, #064E3B)';
    glowColor = 'rgba(16, 185, 129, 0.5)';
  } else if (['BLOCK', 'BLOCKED', 'FAIL', 'FAILED', 'FAILURE', 'ERROR'].includes(r)) {
    gradientBackground = 'radial-gradient(circle at 30% 30%, #F87171, #7F1D1D)';
    glowColor = 'rgba(239, 68, 68, 0.5)';
  } else if (['RUN', 'RUNNING', 'QUEUED', 'IN_PROGRESS', 'INPROGRESS'].includes(r)) {
    gradientBackground = 'radial-gradient(circle at 30% 30%, #818CF8, #1E1B4B)';
    glowColor = 'rgba(99, 102, 241, 0.5)';
  } else if (['SKIP', 'SKIPPED', 'SKIPPING'].includes(r)) {
    gradientBackground = 'radial-gradient(circle at 30% 30%, #4B5563, #111827)';
    glowColor = 'transparent';
  }

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
      className="sf-node-container"
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
          background: gradientBackground,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          boxSizing: 'border-box',
          color: baseStyle.skipped ? '#94A3B8' : '#ffffff',
          boxShadow: `0 6px 12px -2px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.2), 0 0 0 1px rgba(255,255,255,0.05)`,
          transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)'
        }}
        onMouseEnter={(e) => {
          if (!forcedSkipped && !baseStyle.skipped) {
            e.currentTarget.style.transform = 'translateY(-6px) scale(1.1)';
            e.currentTarget.style.boxShadow = `0 12px 20px -2px ${glowColor}, inset 0 2px 4px rgba(255,255,255,0.3)`;
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = `0 6px 12px -2px rgba(0,0,0,0.3), inset 0 2px 4px rgba(255,255,255,0.2), 0 0 0 1px rgba(255,255,255,0.05)`;
        }}
      >
        {/* Spinning border overlay for running */}
        {baseStyle.animate === 'spin' && (
          <>
            <div style={{
              boxSizing: 'border-box',
              border: '3px solid transparent',
              borderTopColor: '#818CF8',
              borderRightColor: '#06B6D4',
              borderRadius: '50%',
              width: '56px',
              height: '56px',
              position: 'absolute',
              top: '-5px',
              left: '-5px',
              animation: 'sfCyberSpin 1.2s linear infinite',
              filter: 'drop-shadow(0 0 6px #818CF8)'
            }} />
            <div style={{
              boxSizing: 'border-box',
              border: '2px dashed #06B6D4',
              borderRadius: '50%',
              width: '62px',
              height: '62px',
              position: 'absolute',
              top: '-8px',
              left: '-8px',
              animation: 'sfCyberSpinReverse 3s linear infinite',
              opacity: 0.6
            }} />
          </>
        )}

        {/* Diagonal line for skipped */}
        {(forcedSkipped || baseStyle.skipped) && (
          <div style={{
            position: 'absolute',
            width: '2px',
            height: '60px',
            backgroundColor: '#94A3B8',
            transform: 'rotate(-45deg)',
            top: '-4px',
            left: '50%'
          }} />
        )}

        <IconComponent
          size={20}
          style={{
            animation: ['RUN', 'RUNNING', 'QUEUED', 'IN_PROGRESS'].includes(r)
              ? 'sfIconPulse 1.2s infinite ease-in-out'
              : ['BLOCK', 'BLOCKED', 'FAIL', 'FAILED'].includes(r)
              ? 'sfShake 2.5s infinite ease-in-out'
              : 'none',
            filter: ['PASS', 'ALLOW', 'COMPLETE', 'PASSED'].includes(r)
              ? 'drop-shadow(0 0 4px rgba(52, 211, 153, 0.7))'
              : ['BLOCK', 'BLOCKED', 'FAIL', 'FAILED'].includes(r)
              ? 'drop-shadow(0 0 6px rgba(248, 113, 113, 0.8))'
              : 'none',
            transition: 'transform 300ms ease'
          }}
        />
        {renderOverlay()}
      </div>

      <span style={{
        fontSize: '11px',
        fontWeight: 700,
        color: ['RUN', 'RUNNING', 'QUEUED', 'IN_PROGRESS'].includes(r)
          ? '#818CF8'
          : ['PASS', 'ALLOW', 'COMPLETE', 'PASSED'].includes(r)
          ? '#10B981'
          : ['BLOCK', 'BLOCKED', 'FAIL', 'FAILED'].includes(r)
          ? '#EF4444'
          : C.textSecondary,
        textAlign: 'center',
        lineHeight: '1.2',
        maxHeight: '26px',
        overflow: 'hidden',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        whiteSpace: 'normal',
        wordBreak: 'break-word',
        transition: 'color 300ms ease'
      }}>
        {label}
      </span>

      <style>{`
        @keyframes sf-pulse-amber {
          0%, 100% { box-shadow: 0 0 0 0px rgba(245, 158, 11, 0.5); }
          50% { box-shadow: 0 0 0 10px rgba(245, 158, 11, 0); }
        }
        @keyframes sf-pulse-red {
          0%, 100% { box-shadow: 0 0 0 0px rgba(239, 68, 68, 0.6); }
          50% { box-shadow: 0 0 0 12px rgba(239, 68, 68, 0); }
        }
        @keyframes sfCyberSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes sfCyberSpinReverse {
          0% { transform: rotate(360deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes sfIconPulse {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.22); opacity: 1; filter: drop-shadow(0 0 8px #818CF8); }
        }
        @keyframes sfShake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-2px); }
          40% { transform: translateX(2px); }
          60% { transform: translateX(-1px); }
          80% { transform: translateX(1px); }
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
export default PipelineNode;
