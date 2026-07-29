import React, { useState, useEffect, useMemo } from 'react';
import { GitBranch, Clock, ChevronDown } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { PipelineRun } from './types/pipeline.types';
import { getOverallBadge, STAGE_ORDER, STAGE_META, getNodeStyle } from './utils/statusMapping';
import { formatRelativeTime, formatDuration } from './utils/timeFormatters';
import PipelineNodeGraph from './PipelineNodeGraph';

interface PipelineCardProps {
  run: PipelineRun;
  isLatest: boolean;
  onNodeClick: (stage: string, run: PipelineRun, forcedSkipped: boolean) => void;
}

export function PipelineCard({ run, isLatest, onNodeClick }: PipelineCardProps) {
  const { C } = useTheme();
  const [isExpanded, setIsExpanded] = useState(isLatest);
  const [timeAgo, setTimeAgo] = useState(formatRelativeTime(run.created_at));
  const [liveDuration, setLiveDuration] = useState<number>(run.duration || 0);

  // Live relative time ago updates every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeAgo(formatRelativeTime(run.created_at));
    }, 30000);
    return () => clearInterval(interval);
  }, [run.created_at]);

  // Live duration ticker if run is running
  const isRunning = run.status === 'running';
  useEffect(() => {
    if (!isRunning) {
      setLiveDuration(run.duration || 0);
      return;
    }

    const baseTime = new Date(run.created_at).getTime();
    const tick = () => {
      const seconds = Math.floor((Date.now() - baseTime) / 1000);
      setLiveDuration(Math.max(0, seconds));
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isRunning, run.created_at, run.duration]);

  // Calculate Overall Badge details
  const badgeInfo = getOverallBadge(run);
  const badgeColors: Record<string, { bg: string, text: string }> = {
    red: { bg: 'rgba(239, 68, 68, 0.1)', text: '#EF4444' },
    amber: { bg: 'rgba(245, 158, 11, 0.1)', text: '#F59E0B' },
    indigo: { bg: 'rgba(99, 102, 241, 0.1)', text: '#6366F1' },
    green: { bg: 'rgba(16, 185, 129, 0.1)', text: '#10B981' },
    gray: { bg: 'rgba(148, 163, 184, 0.1)', text: '#94A3B8' }
  };
  const colors = badgeColors[badgeInfo.color] || badgeColors.gray;

  // Determine trigger type badge text
  const trigger = run.scan_type === 'full-pipeline' ? 'push' : run.scan_type || 'push';

  // Determine Special Header Pills
  const specialPills = useMemo(() => {
    const steps = run.pipeline_steps || {};
    const hasDeployStaging = !!steps.deploy_staging?.result;
    
    const allDeploySkipped = 
      steps.docker?.result === 'skipped' &&
      steps.trivy?.result === 'skipped' &&
      steps.policy?.result === 'skipped' &&
      steps.deploy_staging?.result === 'skipped' &&
      steps.zap?.result === 'skipped' &&
      steps.zap_gate?.result === 'skipped' &&
      steps.deploy_prod?.result === 'skipped';

    const isFrontendOnly = 
      (steps.docker?.result === 'skipped' || !steps.docker) &&
      (steps.trivy?.result === 'skipped' || !steps.trivy) &&
      (steps.policy?.result === 'skipped' || !steps.policy) &&
      (steps.zap?.result === 'skipped' || !steps.zap) &&
      (steps.zap_gate?.result === 'skipped' || !steps.zap_gate) &&
      hasDeployStaging;

    const isSuperseded = 
      run.action === 'BLOCK' && 
      (run.reason?.includes('cancelled') || 
       run.reason?.includes('superseded') || 
       run.reason?.includes('cancel-in-progress'));

    const pills = [];
    if (allDeploySkipped) {
      pills.push({ text: 'CI-only push — no deploy', color: '#64748B' });
    } else if (isFrontendOnly) {
      pills.push({ text: 'Frontend deploy only', color: '#3B82F6' });
    }
    if (isSuperseded) {
      pills.push({ text: 'Superseded by newer push', color: '#64748B' });
    }
    return pills;
  }, [run]);

  // Truncate commit message to 68 characters
  const commitMsg = run.commit_message 
    ? (run.commit_message.length > 68 ? `${run.commit_message.slice(0, 68)}...` : run.commit_message)
    : 'Deploy trigger';

  const gitUrl = `https://github.com/${run.repo_name}/actions`;

  return (
    <div style={{
      backgroundColor: C.bgCard,
      border: `1px solid ${C.border}`,
      borderRadius: '12px',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      transition: 'box-shadow 150ms ease'
    }}>
      {/* Card Header (click to expand/collapse) */}
      <div 
        onClick={() => setIsExpanded(prev => !prev)}
        style={{
          padding: '16px 20px',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          userSelect: 'none',
          backgroundColor: C.bgSecondary
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          {/* Metadata */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 800, color: C.accent, fontSize: '14px' }}>
              #{run.id}
            </span>
            <span style={{ color: C.textPrimary, fontWeight: 600, fontSize: '13px' }}>
              {run.repo_name}
            </span>
            <span style={{ color: C.textSecondary, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <GitBranch size={13} /> {run.branch}
            </span>
            <span style={{ color: C.textMuted || '#64748B', fontFamily: 'var(--sf-font-mono)', fontSize: '11px' }}>
              {run.commit_sha.slice(0, 7)}
            </span>
          </div>

          {/* Overall Badge & Collapse Chevron */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              padding: '4px 8px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: colors.bg,
              color: colors.text,
              letterSpacing: '0.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              {isRunning && (
                <div style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: C.accent,
                  animation: 'sf-pulse 1.2s infinite'
                }} />
              )}
              {badgeInfo.label}
            </div>

            <ChevronDown 
              size={16} 
              color={C.textSecondary}
              style={{
                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 200ms ease'
              }}
            />
          </div>
        </div>

        {/* Commit Message */}
        <div style={{ fontSize: '14px', fontWeight: 600, color: C.textPrimary, margin: '2px 0' }}>
          "{commitMsg}"
        </div>

        {/* Trigger / Time Info */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', color: C.textSecondary }}>
            <span style={{
              backgroundColor: C.bgElevated,
              color: C.textPrimary,
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: 700,
              textTransform: 'uppercase'
            }}>
              {trigger}
            </span>
            <span>•</span>
            <span>{timeAgo}</span>
            <span>•</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={12} /> {formatDuration(liveDuration)}
            </span>

            {/* Special pills */}
            {specialPills.map((pill, i) => (
              <React.Fragment key={i}>
                <span>•</span>
                <span style={{
                  border: `1px solid ${pill.color}`,
                  color: pill.color,
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: 700
                }}>
                  {pill.text}
                </span>
              </React.Fragment>
            ))}
          </div>

          {/* GitHub action link */}
          <a
            href={gitUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()} // Prevent expand toggle
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              fontWeight: 600,
              color: C.accent,
              textDecoration: 'none'
            }}
          >
            ↗ GitHub Run
          </a>
        </div>

        {/* Collapsed dot strip */}
        {!isExpanded && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            marginTop: '8px',
            paddingTop: '8px',
            borderTop: `1px solid ${C.border}`
          }}>
            {STAGE_ORDER.map((stageKey) => {
              const step = run.pipeline_steps?.[stageKey];
              const result = step?.result || 'PENDING';
              const meta = STAGE_META[stageKey];
              const style = getNodeStyle(result, stageKey);
              return (
                <div
                  key={stageKey}
                  title={`${meta.label}: ${result}`}
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: style.fill,
                    border: `1px solid ${style.border}`,
                    cursor: 'help'
                  }}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Graph Area (visible when expanded) */}
      {isExpanded && (
        <div style={{
          borderTop: `1px solid ${C.border}`,
          backgroundColor: C.bgSurface,
          animation: 'sf-fade-in 200ms ease-out'
        }}>
          <PipelineNodeGraph 
            run={run}
            onNodeClick={(stage, forcedSkipped) => onNodeClick(stage, run, forcedSkipped)}
          />
        </div>
      )}

      <style>{`
        @keyframes sf-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.4); opacity: 0.4; }
        }
        @keyframes sf-fade-in {
          from { opacity: 0; max-height: 0; }
          to { opacity: 1; max-height: 500px; }
        }
      `}</style>
    </div>
  );
}
export default PipelineCard;
