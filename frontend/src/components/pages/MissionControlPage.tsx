import React, { useMemo } from 'react';
import {
  ShieldCheck, ShieldAlert, Activity, TrendingUp, Key, Code2, Box, Globe,
  CheckCircle2, ArrowRight
} from 'lucide-react';
import { Card, CardHeader } from '../ui/Card';
import { Badge, severityToVariant } from '../ui/Badge';
import { MetricCard } from '../ui/MetricCard';
import { RiskGauge } from '../ui/RiskGauge';
import { Skeleton, MetricSkeleton } from '../ui/Skeleton';
import { useScans, useFindings } from '../../hooks/useApi';

// ─── Stats Computation ──────────────────────────────────────────────

interface MissionStats {
  totalScans: number;
  passed: number;
  blocked: number;
  running: number;
  passRate: number;
  securityScore: number;
  scannerCounts: { gitleaks: number; semgrep: number; trivy: number; zap: number };
  totalFindings: number;
  activeThreats: ThreatItem[];
}

interface ThreatItem {
  id: number;
  repo: string;
  commit: string;
  severity: string;
  scanner: string;
  message: string;
  age: string;
}

function computeStats(scans: any[], findings: any[]): MissionStats {
  const totalScans = scans.length || 1;
  const passed = scans.filter((s) => s.action_taken === 'ALLOW').length;
  const blocked = scans.filter((s) => s.action_taken === 'BLOCK').length;
  const running = scans.filter((s) => s.status === 'running').length;
  const passRate = Math.round((passed / totalScans) * 100);

  const scannerCounts = {
    gitleaks: scans.reduce((a, s) => a + (s.findings?.gitleaks?.length || 0), 0),
    semgrep: scans.reduce((a, s) => a + (s.findings?.semgrep?.length || 0), 0),
    trivy: scans.reduce(
      (a, s) => a + ((s.findings?.Results || []).reduce((sum: number, r: any) => sum + (r.Vulnerabilities || []).length, 0)),
      0
    ),
    zap: scans.reduce(
      (a, s) => a + ((s.zap_findings?.alerts || s.findings?.zap?.alerts || []).length),
      0
    ),
  };
  const totalFindings = Object.values(scannerCounts).reduce((a, b) => a + b, 0);

  // Weighted security score
  const deductions = (blocked * 2) + (scannerCounts.gitleaks * 3) + (scannerCounts.semgrep * 1) + (scannerCounts.trivy * 0.05);
  const securityScore = Math.max(0, Math.min(100, Math.round(100 - deductions)));

  // Active threats: recent blocked scans
  const activeThreats: ThreatItem[] = scans
    .filter((s) => s.action_taken === 'BLOCK')
    .slice(0, 5)
    .map((s) => {
      let scanner = 'Policy Engine';
      if (s.findings?.gitleaks?.length) scanner = 'Gitleaks';
      else if (s.findings?.semgrep?.length) scanner = 'Semgrep';
      else if (s.findings?.Results?.length) scanner = 'Trivy';
      else if (s.zap_findings?.alerts?.length) scanner = 'OWASP ZAP';

      const ageMs = Date.now() - new Date(s.created_at).getTime();
      const ageH = Math.floor(ageMs / 3600000);
      const age = ageH < 1 ? 'just now' : ageH < 24 ? `${ageH}h ago` : `${Math.floor(ageH / 24)}d ago`;

      return {
        id: s.id,
        repo: s.repo_name || 'unknown',
        commit: (s.commit_sha || '').substring(0, 8),
        severity: s.severity || 'HIGH',
        scanner,
        message: s.ai_explanation || `Blocked by ${scanner}`,
        age,
      };
    });

  return { totalScans, passed, blocked, running, passRate, securityScore, scannerCounts, totalFindings, activeThreats };
}

// ─── Pipeline Heatmap ───────────────────────────────────────────────

function PipelineHeatmap({ scans }: { scans: any[] }) {
  const heatmap = useMemo(() => {
    const repos = [...new Set(scans.map((s) => s.repo_name || 'unknown'))].slice(0, 8);
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (13 - i));
      d.setHours(0, 0, 0, 0);
      return d;
    });

    return repos.map((repo) => ({
      repo,
      cells: days.map((day) => {
        const next = new Date(day);
        next.setDate(next.getDate() + 1);
        const dayScans = scans.filter((s) => {
          const sd = new Date(s.created_at);
          return s.repo_name === repo && sd >= day && sd < next;
        });
        if (dayScans.length === 0) return { status: 'empty', count: 0 };
        const hasBlock = dayScans.some((s) => s.action_taken === 'BLOCK');
        const hasRunning = dayScans.some((s) => s.status === 'running');
        if (hasRunning) return { status: 'running', count: dayScans.length };
        if (hasBlock) return { status: 'blocked', count: dayScans.length };
        return { status: 'passed', count: dayScans.length };
      }),
    }));
  }, [scans]);

  return (
    <Card>
      <CardHeader title="Pipeline Activity Heatmap" subtitle="Last 14 days activity per repository" />
      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 420 }}>
          {/* Day labels */}
          <div style={{ display: 'flex', gap: 3, marginBottom: 6, paddingLeft: 120 }}>
            {heatmap[0]?.cells.map((_, i) => {
              const d = new Date();
              d.setDate(d.getDate() - (13 - i));
              return (
                <div key={i} style={{ width: 28, textAlign: 'center', fontSize: 9, color: 'var(--sf-ink-low)', fontWeight: 600 }}>
                  {d.getDate()}
                </div>
              );
            })}
          </div>
          {/* Repo rows */}
          {heatmap.map((row) => (
            <div key={row.repo} style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 3 }}>
              <div style={{ width: 120, fontSize: 11, fontWeight: 600, color: 'var(--sf-ink-mid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {row.repo.split('/').pop()}
              </div>
              {row.cells.map((cell, i) => (
                <div
                  key={i}
                  className={`sf-v2-heatmap-cell sf-v2-heatmap-cell--${cell.status}`}
                  style={{ width: 28, height: 28 }}
                  title={`${row.repo} — ${cell.count} scan(s)`}
                />
              ))}
            </div>
          ))}
          {heatmap.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--sf-ink-low)', fontSize: 13 }}>
              No pipeline data yet.
            </div>
          )}
        </div>
      </div>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 11, color: 'var(--sf-ink-low)' }}>
        {[
          { label: 'Passed', cls: 'sf-v2-heatmap-cell--passed' },
          { label: 'Blocked', cls: 'sf-v2-heatmap-cell--blocked' },
          { label: 'Running', cls: 'sf-v2-heatmap-cell--running' },
          { label: 'No scans', cls: 'sf-v2-heatmap-cell--empty' },
        ].map((l) => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div className={`sf-v2-heatmap-cell ${l.cls}`} style={{ width: 12, height: 12 }} />
            {l.label}
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────

export default function MissionControlPage() {
  const { data: rawScans, isLoading: scansLoading } = useScans();
  const { data: findings } = useFindings();

  const scans = useMemo(() => rawScans || [], [rawScans]);
  const stats = useMemo(() => computeStats(scans, findings || []), [scans, findings]);

  if (scansLoading) {
    return (
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Skeleton width={300} height={32} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          {Array.from({ length: 4 }).map((_, i) => <MetricSkeleton key={i} />)}
        </div>
        <div className="sf-v2-grid-2">
          <Skeleton height={260} />
          <Skeleton height={260} />
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ─── Header ─── */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--sf-ink)', margin: 0 }}>
          Mission Control
        </h1>
        <p style={{ fontSize: 13, color: 'var(--sf-ink-low)', marginTop: 4 }}>
          Real-time security posture & pipeline decision intelligence
        </p>
      </div>

      {/* ─── Streamlined KPI Cards (4 Cards) ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <MetricCard
          title="Security Score"
          value={`${stats.securityScore}%`}
          change={stats.securityScore >= 80 ? 'Optimal' : 'Needs Attention'}
          isPositive={stats.securityScore >= 80}
          Icon={ShieldCheck}
          iconColor="var(--sf-green)"
        />
        <MetricCard
          title="Pipeline Runs"
          value={stats.totalScans}
          change={`${stats.running} currently running`}
          isPositive={true}
          Icon={Activity}
          iconColor="var(--sf-accent)"
        />
        <MetricCard
          title="Pass Rate"
          value={`${stats.passRate}%`}
          change={`${stats.passed} passed`}
          isPositive={stats.passRate >= 75}
          Icon={TrendingUp}
          iconColor="var(--sf-green)"
        />
        <MetricCard
          title="Security Blockers"
          value={stats.blocked}
          change={`${stats.totalFindings} total findings`}
          isPositive={stats.blocked === 0}
          Icon={ShieldAlert}
          iconColor="var(--sf-red)"
        />
      </div>

      {/* ─── Core Operational Stream & Posture Grid ─── */}
      <div className="sf-v2-grid-2">
        {/* Active Threat Stream */}
        <Card>
          <CardHeader
            title="Active Pipeline Threats"
            subtitle="Recent blocked pipelines requiring attention"
            action={stats.activeThreats.length > 0 ? <Badge variant="blocked">{stats.activeThreats.length} Blocked</Badge> : undefined}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {stats.activeThreats.length > 0 ? stats.activeThreats.map((t) => (
              <div key={t.id} className="sf-v2-threat-item" style={{ padding: '12px 14px' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--sf-red)', flexShrink: 0, boxShadow: '0 0 8px var(--sf-red)' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--sf-ink)' }}>{t.repo.split('/').pop()}</span>
                    <Badge variant={severityToVariant(t.severity)}>{t.severity}</Badge>
                    <span style={{ fontSize: 11, color: 'var(--sf-ink-low)' }}>{t.scanner}</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--sf-ink-low)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.message.substring(0, 90)}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                  <span style={{ fontSize: 11, color: 'var(--sf-ink-muted)' }}>{t.age}</span>
                  <a href="/findings" style={{ fontSize: 11, fontWeight: 600, color: 'var(--sf-accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 2 }}>
                    Details <ArrowRight size={12} />
                  </a>
                </div>
              </div>
            )) : (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--sf-green)', fontSize: 13, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={36} color="var(--sf-green)" />
                <span style={{ fontWeight: 700, fontSize: 14 }}>All Security Gates Clear</span>
                <span style={{ color: 'var(--sf-ink-low)' }}>No active threats or blocked commits detected across your repositories.</span>
              </div>
            )}
          </div>
        </Card>

        {/* Posture & Scanner Breakdown */}
        <Card style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <CardHeader title="Scanner Vulnerability Breakdown" subtitle="Total findings grouped by scanner module" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              {[
                { key: 'gitleaks', label: 'Secrets (Gitleaks)', Icon: Key, color: 'var(--sf-red)', count: stats.scannerCounts.gitleaks },
                { key: 'semgrep', label: 'SAST (Semgrep)', Icon: Code2, color: 'var(--sf-amber)', count: stats.scannerCounts.semgrep },
                { key: 'trivy', label: 'Container (Trivy)', Icon: Box, color: 'var(--sf-blue)', count: stats.scannerCounts.trivy },
                { key: 'zap', label: 'DAST (OWASP ZAP)', Icon: Globe, color: 'var(--sf-violet)', count: stats.scannerCounts.zap },
              ].map((s) => (
                <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 'var(--sf-radius)', background: 'var(--sf-bg-surface)', border: '1px solid var(--sf-border)' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 'var(--sf-radius-sm)', background: `${s.color}1a`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <s.Icon size={18} color={s.color} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--sf-ink)' }}>{s.count}</div>
                    <div style={{ fontSize: 11, color: 'var(--sf-ink-low)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 8, borderTop: '1px solid var(--sf-border)' }}>
            <RiskGauge score={stats.securityScore} size={150} label="Security Posture" />
          </div>
        </Card>
      </div>

      {/* ─── Pipeline Activity Heatmap ─── */}
      <PipelineHeatmap scans={scans} />
    </div>
  );
}
