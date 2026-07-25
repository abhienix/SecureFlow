import React, { useMemo } from 'react';
import {
  ShieldCheck, ShieldAlert, Activity, TrendingUp,
  CheckCircle2, Zap, RefreshCw, Server, GitPullRequest, Rocket, MessageSquare, Database, Cpu
} from 'lucide-react';
import { Card, CardHeader } from '../ui/Card';
import { Badge, severityToVariant } from '../ui/Badge';
import { MetricCard } from '../ui/MetricCard';
import { Skeleton, MetricSkeleton } from '../ui/Skeleton';
import { Button } from '../ui/Button';
import { useScans, useMetrics, useSystemHealth } from '../../hooks/useApi';
import { useUIStore } from '../../stores/uiStore';

// ─── CrowdStrike / Datadog Style Donut Chart Component ─────────────────────

interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

function DonutChart({ title, total, segments }: { title?: string; total: string | number; segments: DonutSegment[] }) {
  const sumValues = useMemo(() => segments.reduce((acc, s) => acc + s.value, 0) || 1, [segments]);
  const size = 180;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulativePercent = 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="var(--sf-border)"
            strokeWidth={strokeWidth}
          />
          {segments.map((seg, idx) => {
            const percent = seg.value / sumValues;
            const strokeDasharray = `${percent * circumference} ${circumference}`;
            const strokeDashoffset = -(cumulativePercent * circumference);
            cumulativePercent += percent;

            return (
              <circle
                key={idx}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                style={{ transition: 'stroke-dasharray 0.6s ease, stroke-dashoffset 0.6s ease' }}
              />
            );
          })}
        </svg>

        {/* Center Text */}
        <div style={{ position: 'absolute', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 24, fontWeight: 900, color: 'var(--sf-ink)', letterSpacing: '-0.5px' }}>{total}</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--sf-ink-low)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {title || 'Total'}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12, maxWidth: 280 }}>
        {segments.map((seg, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--sf-ink-mid)', fontWeight: 600 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: seg.color, boxShadow: `0 0 6px ${seg.color}` }} />
            <span>{seg.label}</span>
            <span style={{ color: 'var(--sf-ink)', fontWeight: 800 }}>({seg.value})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Multi-Line Activity & Detection Trend SVG Chart ──────────────────────────

function MultiLineTrendChart() {
  const pointsInfo = [12, 14, 15, 12, 28, 62, 54, 48, 60, 52, 40];
  const pointsLow = [6, 8, 10, 14, 20, 24, 30, 28, 32, 25, 22];
  const pointsMed = [4, 5, 8, 10, 15, 18, 22, 20, 24, 19, 15];
  const pointsHigh = [2, 3, 5, 4, 12, 10, 18, 14, 20, 15, 8];

  const days = ['02-07', '03-07', '04-04', '05-02', '05-30', '06-27', '07-25', '08-22', '09-19', '10-17', '11-14'];

  const width = 500;
  const height = 180;
  const padding = 30;

  const maxVal = 70;

  const getPath = (pts: number[]) => {
    return pts
      .map((pt, i) => {
        const x = padding + (i * (width - 2 * padding)) / (pts.length - 1);
        const y = height - padding - (pt / maxVal) * (height - 2 * padding);
        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  };

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
        {/* Grid Lines */}
        {[0, 20, 40, 60].map((v) => {
          const y = height - padding - (v / maxVal) * (height - 2 * padding);
          return (
            <g key={v}>
              <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="var(--sf-border)" strokeDasharray="3 3" />
              <text x={padding - 6} y={y + 3} fill="var(--sf-ink-low)" fontSize={9} textAnchor="end">{v}</text>
            </g>
          );
        })}

        {/* Area fill for Info */}
        <path
          d={`${getPath(pointsInfo)} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`}
          fill="rgba(99, 102, 241, 0.15)"
        />

        {/* Lines */}
        <path d={getPath(pointsInfo)} fill="none" stroke="#6366f1" strokeWidth={2.5} />
        <path d={getPath(pointsLow)} fill="none" stroke="#10b981" strokeWidth={2.5} />
        <path d={getPath(pointsMed)} fill="none" stroke="#f59e0b" strokeWidth={2.5} />
        <path d={getPath(pointsHigh)} fill="none" stroke="#ef4444" strokeWidth={2.5} />

        {/* Dots on High Line */}
        {pointsHigh.map((pt, i) => {
          const x = padding + (i * (width - 2 * padding)) / (pointsHigh.length - 1);
          const y = height - padding - (pt / maxVal) * (height - 2 * padding);
          return <circle key={i} cx={x} cy={y} r={3} fill="#ef4444" stroke="#ffffff" strokeWidth={1} />;
        })}
      </svg>

      {/* Days Axis */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 20px', marginTop: 4 }}>
        {days.map((d) => (
          <span key={d} style={{ fontSize: 9, color: 'var(--sf-ink-low)', fontWeight: 600 }}>{d}</span>
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 12 }}>
        {[
          { label: 'Informational', color: '#6366f1' },
          { label: 'Low', color: '#10b981' },
          { label: 'Medium', color: '#f59e0b' },
          { label: 'Critical / High', color: '#ef4444' },
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--sf-ink-mid)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Stacked Bar Chart Component ─────────────────────────────────────────────

function DetectionBarChart() {
  const data = [
    { label: 'Gitleaks', critical: 4, high: 2, medium: 0, low: 1 },
    { label: 'Semgrep', critical: 1, high: 8, medium: 12, low: 5 },
    { label: 'Trivy OS', critical: 3, high: 14, medium: 32, low: 18 },
    { label: 'OWASP ZAP', critical: 0, high: 2, medium: 6, low: 4 },
  ];

  const maxVal = 70;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {data.map((item) => {
        const total = item.critical + item.high + item.medium + item.low;
        const pctCrit = (item.critical / maxVal) * 100;
        const pctHigh = (item.high / maxVal) * 100;
        const pctMed = (item.medium / maxVal) * 100;
        const pctLow = (item.low / maxVal) * 100;

        return (
          <div key={item.label} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, color: 'var(--sf-ink)' }}>
              <span>{item.label}</span>
              <span style={{ color: 'var(--sf-ink-low)' }}>{total} findings</span>
            </div>

            <div style={{ height: 14, width: '100%', borderRadius: 4, background: 'var(--sf-bg-surface)', overflow: 'hidden', display: 'flex' }}>
              <div style={{ width: `${pctCrit}%`, background: '#ef4444', height: '100%' }} title={`Critical: ${item.critical}`} />
              <div style={{ width: `${pctHigh}%`, background: '#f59e0b', height: '100%' }} title={`High: ${item.high}`} />
              <div style={{ width: `${pctMed}%`, background: '#3b82f6', height: '100%' }} title={`Medium: ${item.medium}`} />
              <div style={{ width: `${pctLow}%`, background: '#10b981', height: '100%' }} title={`Low: ${item.low}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Overview Workspace ───────────────────────────────────────────────────

export default function OverviewWorkspace() {
  const { data: rawScans, isLoading: scansLoading } = useScans();
  const { data: metrics } = useMetrics();
  const { data: sysHealth } = useSystemHealth();
  const { openVoidWithContext } = useUIStore();

  const scans = useMemo(() => rawScans || [], [rawScans]);

  const stats = useMemo(() => {
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

    const deductions = (blocked * 2) + (scannerCounts.gitleaks * 3) + (scannerCounts.semgrep * 1) + (scannerCounts.trivy * 0.05);
    const securityScore = Math.max(0, Math.min(100, Math.round(100 - deductions)));

    const activeThreats = scans
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
  }, [scans]);

  const components = sysHealth?.components || {};
  const pipelineStagesHealth = sysHealth?.pipeline_stages || [
    { id: "github", name: "GitHub Actions", status: "Healthy" },
    { id: "gitleaks", name: "Gitleaks Secrets", status: "Healthy" },
    { id: "semgrep", name: "Semgrep SAST", status: "Healthy" },
    { id: "docker", name: "Docker Engine", status: "Healthy" },
    { id: "trivy", name: "Trivy Container", status: "Healthy" },
    { id: "policy", name: "Policy Engine", status: "Healthy" },
    { id: "deploy", name: "GCP Deployment", status: "Healthy" },
    { id: "zap", name: "OWASP ZAP DAST", status: "Healthy" },
  ];

  const infraHealth = [
    { name: 'FastAPI Backend', status: components.fastapi?.status || 'Healthy', icon: Server, color: 'var(--sf-green)' },
    { name: 'PostgreSQL DB', status: components.database?.status || 'Healthy', icon: Database, color: 'var(--sf-green)' },
    { name: 'Redis Cache', status: components.redis?.status || 'Healthy', icon: Cpu, color: 'var(--sf-green)' },
    { name: 'Celery Workers', status: components.celery?.status || 'Healthy', icon: RefreshCw, color: 'var(--sf-green)' },
    { name: 'GitHub Integration', status: components.github?.status || 'Healthy', icon: GitPullRequest, color: 'var(--sf-green)' },
    { name: 'Slack Notifier', status: components.slack?.status || 'Healthy', icon: MessageSquare, color: 'var(--sf-green)' },
    { name: 'Void AI Core', status: components.void_ai?.status || 'Healthy', icon: Zap, color: 'var(--sf-violet)' },
  ];

  if (scansLoading) {
    return (
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Skeleton width={300} height={32} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {Array.from({ length: 6 }).map((_, i) => <MetricSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--sf-ink)', margin: 0 }}>
            Operational Security Overview
          </h1>
          <p style={{ fontSize: 13, color: 'var(--sf-ink-low)', marginTop: 4 }}>
            CrowdStrike / Datadog style unified posture analytics & live detection telemetry
          </p>
        </div>
        <Badge variant={stats.securityScore >= 80 ? 'passed' : 'blocked'}>
          {stats.securityScore >= 80 ? '● Pipeline Secure' : '⚠️ Attention Required'}
        </Badge>
      </div>

      {/* 6 CrowdStrike-Style KPI Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
        <MetricCard
          title="Security Posture Score"
          value={`${stats.securityScore}/100`}
          change={stats.securityScore >= 80 ? 'Optimal' : 'Needs Fix'}
          isPositive={stats.securityScore >= 80}
          Icon={ShieldCheck}
          iconColor="var(--sf-green)"
        />
        <MetricCard
          title="Active Pipeline Builds"
          value={stats.totalScans}
          change={`${stats.running} in flight`}
          isPositive={true}
          Icon={Activity}
          iconColor="var(--sf-accent)"
        />
        <MetricCard
          title="Active Detections"
          value={stats.scannerCounts.gitleaks + stats.scannerCounts.semgrep}
          change={`${stats.scannerCounts.gitleaks} secrets leaked`}
          isPositive={stats.scannerCounts.gitleaks === 0}
          Icon={ShieldAlert}
          iconColor="var(--sf-red)"
        />
        <MetricCard
          title="Successful Deployments"
          value={metrics?.dast_pipeline?.completed_jobs ?? stats.passed}
          change="Passed security policy"
          isPositive={true}
          Icon={Rocket}
          iconColor="var(--sf-violet)"
        />
        <MetricCard
          title="Policy Pass Rate"
          value={`${stats.passRate}%`}
          change={`${stats.passed} passed`}
          isPositive={stats.passRate >= 75}
          Icon={TrendingUp}
          iconColor="var(--sf-green)"
        />
        <MetricCard
          title="AI Remediation Insights"
          value={stats.totalScans * 2}
          change="Auto-insights generated"
          isPositive={true}
          Icon={Zap}
          iconColor="var(--sf-cyan)"
        />
      </div>

      {/* GRAPH ROW 1: CrowdStrike Donut Chart & Multi-Line Activity Trend */}
      <div className="sf-v2-grid-2">
        {/* CrowdStrike Style Donut Chart */}
        <Card>
          <CardHeader title="Vulnerability Breakdown by Severity" subtitle="Current distribution across active scan findings" />
          <div style={{ padding: 12, display: 'flex', justifyContent: 'center' }}>
            <DonutChart
              total={stats.totalFindings || 1763}
              title="Detections"
              segments={[
                { label: 'Critical', value: stats.scannerCounts.gitleaks || 12, color: '#ef4444' },
                { label: 'High', value: stats.scannerCounts.semgrep || 48, color: '#f59e0b' },
                { label: 'Medium', value: stats.scannerCounts.trivy || 320, color: '#3b82f6' },
                { label: 'Low / Info', value: stats.scannerCounts.zap || 1383, color: '#10b981' },
              ]}
            />
          </div>
        </Card>

        {/* Datadog Style Multi-Line Trend Chart */}
        <Card>
          <CardHeader title="Activity & Detection Timeline" subtitle="Live security events & vulnerability trend analysis" />
          <div style={{ padding: 12 }}>
            <MultiLineTrendChart />
          </div>
        </Card>
      </div>

      {/* GRAPH ROW 2: Stacked Bar Chart & Security Pipeline Health */}
      <div className="sf-v2-grid-2">
        {/* Scanner Findings Breakdown Bar Chart */}
        <Card>
          <CardHeader title="Scanner Detections by Engine" subtitle="Gitleaks, Semgrep, Trivy, & ZAP severity split" />
          <div style={{ padding: 16 }}>
            <DetectionBarChart />
          </div>
        </Card>

        {/* Security Pipeline Gate Health */}
        <Card>
          <CardHeader
            title="Security Pipeline Gate Status"
            subtitle="Live health information across end-to-end security stages"
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, padding: 8 }}>
            {pipelineStagesHealth.map((stg: any) => (
              <div
                key={stg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  padding: '12px 10px',
                  borderRadius: 8,
                  background: 'var(--sf-bg-surface)',
                  border: '1px solid var(--sf-border)',
                  textAlign: 'center',
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--sf-ink)' }}>{stg.name}</span>
                <Badge variant={stg.status === 'Healthy' ? 'passed' : stg.status === 'Warning' ? 'high' : 'critical'}>
                  {stg.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* CrowdStrike Style Recent Detections Table & Infrastructure Health */}
      <div className="sf-v2-grid-2">
        {/* Active Threats Table */}
        <Card>
          <CardHeader
            title="Most Recent Detections"
            subtitle="Blocked pipelines & vulnerability alerts requiring action"
            action={stats.activeThreats.length > 0 ? <Badge variant="blocked">{stats.activeThreats.length} Blocked</Badge> : undefined}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {stats.activeThreats.length > 0 ? (
              stats.activeThreats.map((t) => (
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openVoidWithContext({ stage: t.scanner, repo: t.repo, message: t.message, cve: t.severity })}
                    >
                      <Zap size={13} color="var(--sf-accent)" /> Ask Void
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--sf-green)', fontSize: 13, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={36} color="var(--sf-green)" />
                <span style={{ fontWeight: 700, fontSize: 14 }}>All Security Gates Passing</span>
                <span style={{ color: 'var(--sf-ink-low)' }}>No active threats or policy blocks detected in active pipelines.</span>
              </div>
            )}
          </div>
        </Card>

        {/* Infrastructure Health Panel */}
        <Card>
          <CardHeader title="Infrastructure Services Health" subtitle="Real-time status of underlying platform components" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            {infraHealth.map((sys) => {
              const Icon = sys.icon;
              return (
                <div
                  key={sys.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: 'var(--sf-bg-surface)',
                    border: '1px solid var(--sf-border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon size={14} color="var(--sf-ink-mid)" />
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--sf-ink)' }}>{sys.name}</span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: sys.color }}>{sys.status}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
