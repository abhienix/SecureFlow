import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Clock, GitBranch, Shield, Zap, Terminal,
  CheckCircle, XCircle, AlertTriangle, Ban, HelpCircle, Loader2,
  SkipForward, Lock, ExternalLink, ChevronDown, ChevronUp
} from 'lucide-react';
import { DrawerPanel } from '../../components/ui/DrawerPanel';
import { LogViewer } from '../../components/ui/LogViewer';
import Badge from '../../components/ui/Badge';
import { useUIStore } from '../../stores/uiStore';
import { useVoidStore } from '../../stores/voidStore';
import { client } from '../../api/client';

// Status constants matching backend pipeline_engine.py
const STATUS = {
  WAITING: 'WAITING',
  RUNNING: 'RUNNING',
  PASSED: 'PASSED',
  FAILED: 'FAILED',
  BLOCKED: 'BLOCKED',
  SKIPPED: 'SKIPPED',
  CANCELLED: 'CANCELLED',
};

const isFailure = (s: string) => s === STATUS.FAILED || s === STATUS.BLOCKED;
const isTerminal = (s: string) => [STATUS.PASSED, STATUS.FAILED, STATUS.BLOCKED, STATUS.SKIPPED, STATUS.CANCELLED].includes(s);

const STATUS_META: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  [STATUS.WAITING]:  { color: '#475569', bg: '#1E293B', icon: <Clock size={14} />, label: 'Waiting' },
  [STATUS.RUNNING]:  { color: '#6366F1', bg: '#1E1B4B', icon: <Loader2 size={14} className="sf-spin-icon" />, label: 'Running' },
  [STATUS.PASSED]:   { color: '#10B981', bg: '#064E3B', icon: <CheckCircle size={14} />, label: 'Passed' },
  [STATUS.FAILED]:   { color: '#EF4444', bg: '#7F1D1D', icon: <XCircle size={14} />, label: 'Failed' },
  [STATUS.BLOCKED]:  { color: '#F59E0B', bg: '#78350F', icon: <Lock size={14} />, label: 'Blocked' },
  [STATUS.SKIPPED]:  { color: '#6B7280', bg: '#111827', icon: <SkipForward size={14} />, label: 'Skipped' },
  [STATUS.CANCELLED]:{ color: '#6B7280', bg: '#111827', icon: <Ban size={14} />, label: 'Cancelled' },
};

// Immutable stage order (mirrors backend STAGE_ORDER)
const STAGE_ORDER = [
  'checkout', 'code_scan', 'docker', 'trivy',
  'policy', 'deploy_staging', 'zap', 'zap_gate', 'deploy_prod'
];

export default function PipelineDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [selectedStage, setSelectedStage] = useState<any | null>(null);
  const [expandedBlocked, setExpandedBlocked] = useState<string | null>(null);
  const [liveStages, setLiveStages] = useState<any[] | null>(null);
  const [liveRun, setLiveRun] = useState<any | null>(null);
  const wsConnected = useUIStore((s) => s.wsConnected);
  const lastWsUpdate = useRef<number>(0);

  useEffect(() => {
    const handler = (e: Event) => {
      const data = (e as CustomEvent).detail;
      if (data?.type !== 'pipeline.stage_update') return;
      const eventRunId = data.run_id?.replace('run-', '') || String(data.scan_id || '');
      if (eventRunId !== id) return;
      lastWsUpdate.current = Date.now();

      setLiveStages((prev: any) => {
        const stages = prev ?? [];
        const idx = stages.findIndex((s: any) => s.stage_key === data.stage_key);
        const update = {
          stage_key: data.stage_key,
          status: data.status,
          detail: data.detail || '',
          exit_code: data.exit_code,
        };
        if (idx >= 0) {
          const next = [...stages];
          next[idx] = { ...next[idx], ...update };
          return next;
        }
        return [...stages, update];
      });

      setLiveRun((prev: any) => {
        if (!prev) return prev;
        return { ...prev, status: data.status === 'RUNNING' ? 'RUNNING' : prev.status };
      });
    };
    window.addEventListener('sf_ws_event', handler);
    return () => window.removeEventListener('sf_ws_event', handler);
  }, [id]);

  const { data: run, isLoading } = useQuery({
    queryKey: ['pipelines', 'detail', id],
    queryFn: async () => {
      const res = await client.get(`/pipelines/${id}`);
      return res.data;
    },
    refetchInterval: () => {
      const sinceWs = Date.now() - lastWsUpdate.current;
      if (wsConnected && sinceWs < 5000) return false;
      return 5000;
    },
  });

  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['pipelines', 'logs', id, selectedStage?.id],
    queryFn: async () => {
      const res = await client.get(`/pipelines/${id}/stages/${selectedStage.id}/logs`);
      return res.data;
    },
    enabled: !!id && !!selectedStage?.id,
  });

  const stagesSorted = useMemo(() => {
    const base = run?.stages ? [...run.stages] : [];
    if (!liveStages) return base.sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0));
    const merged = base.map((s: any) => {
      const live = liveStages.find((l: any) => l.stage_key === s.stage_key);
      return live ? { ...s, ...live } : s;
    });
    for (const l of liveStages) {
      if (!merged.find((m: any) => m.stage_key === l.stage_key)) {
        merged.push({ ...l, name: l.stage_key });
      }
    }
    return merged.sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0));
  }, [run?.stages, liveStages]);

  const effectiveRun = liveRun || run;
  const blockedStage = useMemo(() => {
    return stagesSorted.find((s: any) => s.status === STATUS.BLOCKED || s.status === STATUS.FAILED);
  }, [stagesSorted]);

  // Auto-trigger Void AI analysis when a stage fails or is blocked
  const autoAnalyzePipeline = useVoidStore((s) => s.autoAnalyzePipeline);
  const prevFailedStage = useRef<string | null>(null);
  useEffect(() => {
    if (blockedStage && blockedStage.stage_key !== prevFailedStage.current) {
      prevFailedStage.current = blockedStage.stage_key;
      autoAnalyzePipeline(id || '', blockedStage.name || blockedStage.stage_key);
    }
  }, [blockedStage, id, autoAnalyzePipeline]);

  if (isLoading && !effectiveRun) {
    return <div className="skeleton" style={{ height: '400px', borderRadius: '12px' }} />;
  }

  if (!run && !liveRun) {
    return (
      <div style={{ textAlign: 'center', padding: '48px' }}>
        <h2 style={{ color: 'var(--sf-danger)' }}>Pipeline run not found</h2>
        <button onClick={() => navigate('/pipelines')} style={{ marginTop: '16px' }}>
          Back to List
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={() => navigate('/pipelines')} style={{ background: 'transparent', border: 'none', color: 'var(--sf-text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--sf-ink)', margin: 0 }}>
            Pipeline Run #{effectiveRun.run_number}
          </h1>
          <p style={{ color: 'var(--sf-text-muted)', margin: '2px 0 0 0', fontSize: '13px' }}>
            {effectiveRun.repo_name} | {effectiveRun.branch} | {effectiveRun.commit_sha?.substring(0, 8)}
          </p>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <Badge variant={effectiveRun.action_taken === 'BLOCK' ? 'failed' : effectiveRun.status === STATUS.RUNNING ? 'warning' : 'success'}>
            {effectiveRun.action_taken === 'BLOCK' ? 'BLOCKED' : effectiveRun.status}
          </Badge>
        </div>
      </div>

      {/* Enterprise Execution Timeline */}
      <div style={{ backgroundColor: 'var(--sf-bg-card)', border: '1px solid var(--sf-border)', borderRadius: '12px', padding: '24px', overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: 0, minWidth: 'max-content', alignItems: 'flex-start' }}>
          {stagesSorted.map((stage: any, idx: number) => {
            const meta = STATUS_META[stage.status] || STATUS_META[STATUS.WAITING];
            const isLast = idx === stagesSorted.length - 1;
            const isActive = stage.status === STATUS.RUNNING;

            return (
              <React.Fragment key={stage.id || stage.stage_key}>
                <div
                  onClick={() => setSelectedStage(stage)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    gap: '8px', padding: '16px 12px', minWidth: '120px',
                    cursor: 'pointer', position: 'relative',
                    backgroundColor: meta.bg, borderRadius: '8px',
                    border: `1px solid ${meta.color}33`,
                    transition: 'transform 150ms ease, box-shadow 150ms ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 4px 12px ${meta.color}44`; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  {/* Icon */}
                  <div style={{ color: meta.color }}>
                    {meta.icon}
                  </div>

                  {/* Name */}
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#E2E8F0', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    {stage.name}
                  </div>

                  {/* Status badge */}
                  <div style={{ fontSize: '9px', fontWeight: 600, color: meta.color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {meta.label}
                  </div>

                  {/* Duration */}
                  {stage.duration && stage.duration !== '0s' && (
                    <div style={{ fontSize: '10px', color: '#64748B', fontFamily: 'var(--sf-font-mono)' }}>
                      {stage.duration}
                    </div>
                  )}

                  {/* Running pulse */}
                  {isActive && (
                    <div className="pulse-glow" style={{ position: 'absolute', inset: -2, borderRadius: '8px', pointerEvents: 'none' }} />
                  )}
                </div>

                {/* Connector */}
                {!isLast && (
                  <div style={{ display: 'flex', alignItems: 'center', padding: '0 4px', marginTop: '40px' }}>
                    <div style={{
                      width: '24px', height: '2px',
                      backgroundColor: stage.status === STATUS.PASSED ? '#10B981' : isFailure(stage.status) ? '#EF4444' : '#334155',
                    }} />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Blocked Pipeline Section — detailed failure analysis */}
      {blockedStage && (
        <div style={{ backgroundColor: '#7F1D1D15', border: '1px solid #EF4444', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <AlertTriangle size={20} color="#EF4444" />
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#EF4444', margin: 0 }}>
              Pipeline Blocked at {blockedStage.name}
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>Status</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#EF4444' }}>BLOCKED</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>Blocked Stage</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#E2E8F0' }}>{blockedStage.name}</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>Reason</div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: '#E2E8F0' }}>{blockedStage.detail || 'Security policy violation'}</div>
            </div>
            {blockedStage.exit_code !== null && blockedStage.exit_code !== undefined && (
              <div>
                <div style={{ fontSize: '10px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' }}>Exit Code</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#E2E8F0', fontFamily: 'var(--sf-font-mono)' }}>{blockedStage.exit_code}</div>
              </div>
            )}
          </div>

          <button
            onClick={() => setExpandedBlocked(expandedBlocked === blockedStage.id ? null : blockedStage.id)}
            style={{ background: 'transparent', border: `1px solid #334155`, color: '#94A3B8', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {expandedBlocked === blockedStage.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {expandedBlocked === blockedStage.id ? 'Hide Details' : 'View Block Details'}
          </button>

          {expandedBlocked === blockedStage.id && (
            <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#0F172A', borderRadius: '8px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#F59E0B', margin: '0 0 12px 0' }}>Suggested Remediation</h4>
              <div style={{ fontSize: '12px', color: '#94A3B8', lineHeight: 1.6 }}>
                <p>1. Review the scan findings for {blockedStage.name} in the Security Center.</p>
                <p>2. Fix the identified vulnerabilities or update policy rules.</p>
                <p>3. Re-run the pipeline from the Pipelines page.</p>
                <p>4. Verify the fix passes all stages before deploying to production.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Metadata Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', backgroundColor: 'var(--sf-bg-card)', border: '1px solid var(--sf-border)', borderRadius: '12px', padding: '20px' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--sf-text-secondary)', textTransform: 'uppercase' }}>Commit</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--sf-text-primary)', marginTop: '4px', fontFamily: 'var(--sf-font-mono)' }}>{effectiveRun.commit_sha?.substring(0, 8) || 'HEAD'}</div>
        </div>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--sf-text-secondary)', textTransform: 'uppercase' }}>Message</div>
          <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--sf-text-primary)', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{effectiveRun.commit_message || 'Manual scan trigger'}</div>
        </div>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--sf-text-secondary)', textTransform: 'uppercase' }}>Policy</div>
          <div style={{ marginTop: '4px' }}><Badge variant={effectiveRun.action_taken === 'BLOCK' ? 'failed' : 'success'}>{effectiveRun.action_taken || 'ALLOW'}</Badge></div>
        </div>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--sf-text-secondary)', textTransform: 'uppercase' }}>Duration</div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--sf-text-primary)', marginTop: '4px' }}>{effectiveRun.duration || 45}s</div>
        </div>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--sf-text-secondary)', textTransform: 'uppercase' }}>Branch</div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--sf-text-primary)', marginTop: '4px' }}>{effectiveRun.branch}</div>
        </div>
      </div>

      {/* All Stages Detail Table */}
      <div style={{ backgroundColor: 'var(--sf-bg-card)', border: '1px solid var(--sf-border)', borderRadius: '12px', padding: '20px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--sf-text-primary)', margin: '0 0 16px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Stage Details ({stagesSorted.length})
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {stagesSorted.map((stage: any) => {
            const meta = STATUS_META[stage.status] || STATUS_META[STATUS.WAITING];
            return (
              <div
                key={stage.id || stage.stage_key}
                onClick={() => setSelectedStage(stage)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 16px',
                  backgroundColor: '#0F172A', borderRadius: '8px', cursor: 'pointer',
                  border: `1px solid transparent`,
                  transition: 'border-color 150ms ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = meta.color + '44'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; }}
              >
                <div style={{ color: meta.color }}>{meta.icon}</div>
                <div style={{ flex: 1, fontSize: '13px', fontWeight: 600, color: '#E2E8F0' }}>{stage.name}</div>
                <Badge variant={
                  stage.status === STATUS.PASSED ? 'passed' :
                  stage.status === STATUS.FAILED || stage.status === STATUS.BLOCKED ? 'failed' :
                  stage.status === STATUS.RUNNING ? 'running' : 'neutral'
                }>{meta.label}</Badge>
                {stage.duration && stage.duration !== '0s' && (
                  <div style={{ fontSize: '12px', color: '#64748B', fontFamily: 'var(--sf-font-mono)' }}>{stage.duration}</div>
                )}
                {stage.detail && (
                  <div style={{ fontSize: '11px', color: '#64748B', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stage.detail}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Logs Drawer with inline remediation for blocked/failed stages */}
      <DrawerPanel isOpen={!!selectedStage} onClose={() => setSelectedStage(null)} title={`${selectedStage?.name || 'Stage'} Console Logs`}>
        <div style={{ height: '400px', marginBottom: selectedStage && isFailure(selectedStage.status) ? '16px' : '0' }}>
          {logsLoading ? (
            <div className="skeleton" style={{ height: '100%', borderRadius: '8px' }} />
          ) : (
            <LogViewer logs={logsData?.logs || 'No logs recorded.'} fileName={`${selectedStage?.name || 'stage'}.log`} />
          )}
        </div>
        {selectedStage && isFailure(selectedStage.status) && (
          <div style={{ borderTop: '1px solid var(--sf-border)', paddingTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <AlertTriangle size={16} color="#EF4444" />
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#EF4444', margin: 0 }}>
                Remediation for {selectedStage.name}
              </h4>
            </div>
            <div style={{ fontSize: '12px', color: '#94A3B8', lineHeight: 1.6 }}>
              {selectedStage.detail && (
                <p style={{ margin: '0 0 8px 0' }}><strong>Root cause:</strong> {selectedStage.detail}</p>
              )}
              {selectedStage.exit_code !== null && selectedStage.exit_code !== undefined && (
                <p style={{ margin: '0 0 8px 0' }}><strong>Exit code:</strong> {selectedStage.exit_code}</p>
              )}
              <p style={{ margin: '0 0 8px 0' }}><strong>Recommended steps:</strong></p>
              <ol style={{ margin: '0 0 12px 0', paddingLeft: '16px' }}>
                <li>Review the scan findings for {selectedStage.name} in Security Center</li>
                <li>Fix the identified vulnerabilities or update policy rules</li>
                <li>Re-run the pipeline from the Pipelines page</li>
                <li>Verify the fix passes all stages before deploying to production</li>
              </ol>
            </div>
          </div>
        )}
      </DrawerPanel>

      <style>{`
        @keyframes sf-spin-slow {
          to { transform: rotate(360deg); }
        }
        .sf-spin-icon {
          animation: sf-spin-slow 1.5s linear infinite;
        }
        .pulse-glow {
          animation: pulseGlow 2s ease-in-out infinite;
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 4px var(--sf-accent); }
          50% { box-shadow: 0 0 12px var(--sf-accent); }
        }
      `}</style>
    </div>
  );
}
