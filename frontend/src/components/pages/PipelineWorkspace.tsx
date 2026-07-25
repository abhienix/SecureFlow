import React, { useState, useMemo } from 'react';
import {
  GitBranch, Terminal, Cpu, Shield, Lock, Globe, Zap,
  Clock, CheckCircle, XCircle, Loader2, AlertTriangle, SkipForward, Sparkles,
} from 'lucide-react';
import { Card, CardHeader } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';
import { useScans } from '../../hooks/useApi';
import type { ScanResult, PipelineSteps } from '../../types';

const PIPELINE_STAGES = [
  { key: 'checkout', label: 'Checkout', Icon: GitBranch, desc: 'Clone repo & verify commit SHA' },
  { key: 'code_scan', label: 'Code Scan', Icon: Terminal, desc: 'Gitleaks secrets + Semgrep SAST' },
  { key: 'docker', label: 'Docker Build', Icon: Cpu, desc: 'Multi-stage container build' },
  { key: 'trivy', label: 'Trivy Scan', Icon: Shield, desc: 'Container CVE vulnerability audit' },
  { key: 'policy', label: 'Policy Gate', Icon: Lock, desc: 'policy.yaml gate evaluation' },
  { key: 'deploy', label: 'Cloud Run', Icon: Globe, desc: 'Deploy revision to Google Cloud Run' },
  { key: 'zap', label: 'ZAP DAST', Icon: Zap, desc: 'OWASP ZAP dynamic web scan' },
];

const STATUS_MAP: Record<string, { color: string; bg: string; border: string; Icon: typeof CheckCircle; label: string }> = {
  PASS: { color: 'var(--sf-green)', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', Icon: CheckCircle, label: 'Passed' },
  BLOCK: { color: 'var(--sf-red)', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', Icon: XCircle, label: 'Blocked' },
  FAILED: { color: 'var(--sf-red)', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', Icon: XCircle, label: 'Failed' },
  QUEUED: { color: 'var(--sf-blue)', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)', Icon: Loader2, label: 'Queued' },
  PENDING: { color: 'var(--sf-amber)', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', Icon: Clock, label: 'Pending' },
  SKIPPED: { color: 'var(--sf-ink-low)', bg: 'rgba(100,116,139,0.12)', border: 'rgba(100,116,139,0.2)', Icon: SkipForward, label: 'Skipped' },
};

function getStageConfig(res?: string) {
  return STATUS_MAP[(res || '').toUpperCase()] || STATUS_MAP.PENDING;
}

export default function PipelineWorkspace() {
  const { data: rawScans, isLoading } = useScans();
  const scans = useMemo(() => rawScans || [], [rawScans]);
  const [selectedScanId, setSelectedScanId] = useState<number | null>(null);
  const [viewTab, setViewTab] = useState<'timeline' | 'why_blocked'>('timeline');

  const activeScan: ScanResult | undefined = useMemo(() => {
    return scans.find((s) => s.id === selectedScanId) || scans[0];
  }, [scans, selectedScanId]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Skeleton width={400} height={32} />
        <Skeleton height={60} />
        <Skeleton height={300} />
      </div>
    );
  }

  if (!activeScan) {
    return (
      <Card style={{ padding: 40, textAlign: 'center' }}>
        <AlertTriangle size={32} color="var(--sf-ink-low)" style={{ margin: '0 auto 16px', display: 'block' }} />
        <div style={{ fontSize: 14, color: 'var(--sf-ink-mid)' }}>No pipeline runs found. Push a commit to trigger the security pipeline.</div>
      </Card>
    );
  }

  const steps: PipelineSteps = activeScan.pipeline_steps || {};
  const isBlocked = activeScan.action_taken === 'BLOCK';

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--sf-ink)', margin: '0 0 4px 0' }}>Security Pipeline Execution Engine</h1>
          <p style={{ fontSize: 13, color: 'var(--sf-ink-low)' }}>Interactive stage flow, real-time WebSocket telemetry, and Policy Gate decision analysis</p>
        </div>
        <div style={{ display: 'flex', gap: 6, background: 'var(--sf-bg-surface)', padding: 4, borderRadius: 10, border: '1px solid var(--sf-border)' }}>
          <button onClick={() => setViewTab('timeline')}
            style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: viewTab === 'timeline' ? 'var(--sf-accent)' : 'transparent', color: viewTab === 'timeline' ? '#fff' : 'var(--sf-ink-low)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            Stage Timeline
          </button>
          <button onClick={() => setViewTab('why_blocked')}
            style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: viewTab === 'why_blocked' ? 'var(--sf-red)' : 'transparent', color: viewTab === 'why_blocked' ? '#fff' : 'var(--sf-ink-low)', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={13} /> Why Blocked?
            {isBlocked && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
          </button>
        </div>
      </div>

      {/* Select Pipeline Run Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--sf-ink-low)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Select Run:</span>
        {scans.slice(0, 8).map((scan) => {
          const isSel = scan.id === activeScan.id;
          const isBlk = scan.action_taken === 'BLOCK';
          return (
            <button key={scan.id} onClick={() => setSelectedScanId(scan.id)}
              style={{ padding: '6px 12px', borderRadius: 8, cursor: 'pointer', border: `1px solid ${isSel ? 'var(--sf-accent)' : 'var(--sf-border)'}`, background: isSel ? 'var(--sf-accent-soft)' : 'var(--sf-bg-card)', color: isSel ? 'var(--sf-ink)' : 'var(--sf-ink-mid)', fontSize: 12, fontWeight: 600, fontFamily: 'var(--sf-font-mono)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: isBlk ? 'var(--sf-red)' : 'var(--sf-green)' }} />
              <span>{(scan.commit_sha || 'HEAD').substring(0, 7)}</span>
              <span style={{ fontSize: 10, color: 'var(--sf-ink-low)' }}>#{scan.id}</span>
            </button>
          );
        })}
      </div>

      {/* Run Summary Strip */}
      <Card style={{ padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--sf-accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GitBranch size={20} color="var(--sf-accent)" />
          </div>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--sf-ink)', margin: 0 }}>{activeScan.repo_name || 'abhienix/SecureFlow'}</h3>
            <div style={{ fontSize: 12, color: 'var(--sf-ink-low)', marginTop: 2 }}>
              Branch: <strong style={{ color: 'var(--sf-ink-mid)' }}>{activeScan.branch || 'main'}</strong> | SHA: <span style={{ fontFamily: 'var(--sf-font-mono)' }}>{(activeScan.commit_sha || 'HEAD').substring(0, 8)}</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: 11, color: 'var(--sf-ink-low)', textTransform: 'uppercase', fontWeight: 700 }}>Security Gate</span>
            <div style={{ marginTop: 2 }}><Badge variant={isBlocked ? 'blocked' : 'passed'}>{activeScan.action_taken || 'ALLOW'}</Badge></div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: 11, color: 'var(--sf-ink-low)', textTransform: 'uppercase', fontWeight: 700 }}>DAST Status</span>
            <div style={{ marginTop: 2, fontSize: 12, fontWeight: 600, color: 'var(--sf-ink)' }}>{activeScan.dast_status || 'completed'}</div>
          </div>
        </div>
      </Card>

      {/* VIEW TAB 1: Stage Timeline */}
      {viewTab === 'timeline' && (
        <Card style={{ padding: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--sf-ink-low)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 20 }}>Interactive Stage Flow Execution Node Map</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
            {PIPELINE_STAGES.map((stage, i) => {
              const step = steps[stage.key];
              const cfg = getStageConfig(step?.result);
              const Icon = stage.Icon;
              const StatusIcon = cfg.Icon;
              const isRunning = step?.result === 'RUNNING' || step?.result === 'QUEUED';
              return (
                <div key={stage.key} style={{ background: 'var(--sf-bg-surface)', border: `1px solid ${cfg.border}`, borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 10, boxShadow: isRunning ? `0 0 20px ${cfg.color}40` : '0 4px 12px rgba(0,0,0,0.15)', transform: isRunning ? 'translateY(-4px)' : 'none', transition: 'all 200ms ease' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={15} color={cfg.color} />
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 800, color: 'var(--sf-ink-low)' }}>0{i + 1}</span>
                  </div>
                  <div>
                    <h4 style={{ fontSize: 13, fontWeight: 800, color: 'var(--sf-ink)', margin: '0 0 2px 0' }}>{stage.label}</h4>
                    <span style={{ fontSize: 10, color: 'var(--sf-ink-low)', display: 'block' }}>{stage.desc}</span>
                  </div>
                  <div style={{ marginTop: 'auto', paddingTop: 8, borderTop: '1px solid var(--sf-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: cfg.color, textTransform: 'uppercase' }}>{cfg.label}</span>
                    <StatusIcon size={12} color={cfg.color} className={isRunning ? 'spin' : ''} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detailed Log Breakdown */}
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--sf-border)' }}>
            <h4 style={{ fontSize: 14, fontWeight: 800, color: 'var(--sf-ink)', marginBottom: 12 }}>Stage Execution Telemetry Logs</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {PIPELINE_STAGES.map((stage) => {
                const step = steps[stage.key];
                const cfg = getStageConfig(step?.result);
                return (
                  <div key={stage.key} style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--sf-bg-surface)', border: '1px solid var(--sf-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color }} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--sf-ink)' }}>{stage.label}</span>
                      <span style={{ fontSize: 12, color: 'var(--sf-ink-low)' }}>— {step?.detail || stage.desc}</span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 800, color: cfg.color, padding: '2px 8px', borderRadius: 4, background: cfg.bg }}>{cfg.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {/* VIEW TAB 2: Why Blocked? */}
      {viewTab === 'why_blocked' && (
        <Card style={{ padding: 24, border: `1px solid ${isBlocked ? 'var(--sf-red-border)' : 'var(--sf-border)'}` }}>
          <CardHeader
            title={`Policy Gate Decision Analysis: ${isBlocked ? 'DEPLOYMENT BLOCKED' : 'DEPLOYMENT PASSED'}`}
            subtitle="Root cause evaluation according to active declarative rules in policy.yaml"
            action={isBlocked ? <AlertTriangle size={22} color="var(--sf-red)" /> : <CheckCircle size={22} color="var(--sf-green)" />}
          />
          {isBlocked ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
              <div style={{ padding: 16, borderRadius: 10, background: 'var(--sf-red-soft)', border: '1px solid var(--sf-red-border)', color: 'var(--sf-red)', fontSize: 13, lineHeight: 1.5 }}>
                <strong>Security Gate Policy Enforcement Triggered:</strong>
                <p style={{ margin: '6px 0 0 0' }}>{activeScan.ai_explanation || 'Gitleaks secret scanner or Trivy container CVE score exceeded the max allowed CVSS threshold (CVSS >= 7.0) set in policy.yaml.'}</p>
              </div>
              <div style={{ padding: 16, borderRadius: 10, background: 'var(--sf-bg-surface)', border: '1px solid var(--sf-border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <h4 style={{ fontSize: 14, fontWeight: 800, color: 'var(--sf-ink)', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Sparkles size={16} color="var(--sf-accent)" /> Recommended Fix Patch
                </h4>
                <div style={{ fontSize: 13, color: 'var(--sf-ink-mid)', lineHeight: 1.5 }}>
                  {activeScan.ai_fix || 'Rotate exposed credentials immediately, remove hardcoded secret strings from git commit history using git-filter-repo, and enforce environment variables.'}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 16, padding: 24, borderRadius: 10, background: 'var(--sf-green-soft)', border: '1px solid var(--sf-green-border)', color: 'var(--sf-green)', fontSize: 13, textAlign: 'center' }}>
              <CheckCircle size={32} style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 16, fontWeight: 800 }}>Pipeline Passed Policy Gate Evaluation</div>
              <p style={{ margin: '4px 0 0 0', color: 'var(--sf-ink-mid)' }}>No critical CVSS violations or plain-text secrets were detected. Deployment authorized.</p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
