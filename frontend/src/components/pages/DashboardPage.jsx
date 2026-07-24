import React, { useMemo } from "react";
import {
  ShieldCheck, ShieldAlert, GitPullRequest, Activity,
  Server, Database, Cpu, Key, Code2, Box, Globe, TrendingUp, TrendingDown
} from "lucide-react";
import MetricCard from "../ui/MetricCard";
import SeverityBadge from "../ui/SeverityBadge";
import ScanStatusDot from "../ui/ScanStatusDot";
import DataTable from "../ui/DataTable";
import VulnerabilityTrend from "../charts/VulnerabilityTrend";
import SeverityDonut from "../charts/SeverityDonut";

export default function DashboardPage({ scans = [], repositories = [], metrics = {}, C }) {
  const stats = useMemo(() => {
    const totalScans = scans.length || 1;
    const passed = scans.filter(s => s.action_taken === "ALLOW").length;
    const blocked = scans.filter(s => s.action_taken === "BLOCK").length;
    const running = scans.filter(s => s.status === "running").length;
    const passRate = Math.round((passed / totalScans) * 100);
    const dast = metrics.dast_pipeline || {};

    // Scanner finding counts
    const scannerCounts = {
      gitleaks: scans.reduce((a, s) => a + (s.findings?.gitleaks?.length || 0), 0),
      semgrep: scans.reduce((a, s) => a + (s.findings?.semgrep?.length || 0), 0),
      trivy: scans.reduce((a, s) => a + ((s.findings?.Results || []).reduce((sum, r) => sum + (r.Vulnerabilities || []).length, 0)), 0),
      zap: scans.reduce((a, s) => a + ((s.zap_findings?.alerts || s.findings?.zap?.alerts || []).length), 0),
    };
    const totalFindings = Object.values(scannerCounts).reduce((a, b) => a + b, 0);

    // Security score
    const securityScore = Math.max(0, Math.min(100, 100 - (blocked * 5) - (totalFindings * 0.5)));

    return { totalScans, passed, blocked, running, passRate, dast, scannerCounts, totalFindings, securityScore };
  }, [scans, metrics]);

  const recentColumns = [
    {
      header: "Repository", accessor: "repo_name",
      render: (r) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontWeight: 600, color: C.ink }}>{r.repo_name}</span>
          <span style={{ fontSize: 11, color: C.inkMuted, fontFamily: C.mono }}>({r.branch})</span>
        </div>
      ),
    },
    {
      header: "Commit", accessor: "commit_sha",
      render: (r) => (
        <span style={{ fontFamily: C.mono, fontSize: 12, color: C.inkMid }}>
          {(r.commit_sha || "").substring(0, 8)}
        </span>
      ),
    },
    {
      header: "Gate", accessor: "action_taken",
      render: (r) => <SeverityBadge severity={r.action_taken === "BLOCK" ? "critical" : "passed"} label={r.action_taken || "ALLOW"} C={C} />,
    },
    {
      header: "DAST", accessor: "dast_status",
      render: (r) => <ScanStatusDot status={r.dast_status || "not_queued"} C={C} />,
    },
    {
      header: "Status", accessor: "status",
      render: (r) => <ScanStatusDot status={r.status} C={C} />,
    },
  ];

  const SCANNERS = [
    { key: "gitleaks", label: "Secrets", Icon: Key, color: C.red, soft: C.redSoft },
    { key: "semgrep", label: "SAST", Icon: Code2, color: C.amber, soft: C.amberSoft },
    { key: "trivy", label: "Container", Icon: Box, color: C.blue, soft: C.blueSoft },
    { key: "zap", label: "DAST", Icon: Globe, color: C.violet, soft: C.violetSoft },
  ];

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Page Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.ink }}>Security Command Center</h1>
          <p style={{ fontSize: 13, color: C.inkLow, marginTop: 4 }}>
            Real-time DevSecOps posture across CI/CD, containers, and cloud infrastructure
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { label: "FastAPI", color: C.green, Icon: Server },
            { label: "Redis", color: C.accent, Icon: Database },
            { label: "Workers", color: C.green, Icon: Cpu },
          ].map(s => (
            <div key={s.label} style={{
              display: "flex", alignItems: "center", gap: 5, padding: "5px 10px",
              borderRadius: 20, fontSize: 11, fontWeight: 600,
              background: `${s.color}15`, border: `1px solid ${s.color}30`, color: s.color,
            }}>
              <s.Icon size={12} /> {s.label}
            </div>
          ))}
        </div>
      </div>

      {/* Row 1: KPI Cards */}
      <div className="sf-grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 14 }}>
        <MetricCard title="Security Score" value={`${Math.round(stats.securityScore)}%`}
          change={stats.securityScore >= 80 ? "Healthy" : "Needs Attention"}
          isPositive={stats.securityScore >= 80} Icon={ShieldCheck} C={C} />
        <MetricCard title="Repositories" value={repositories.length || 1}
          change="Active" isPositive={true} Icon={Activity} C={C} />
        <MetricCard title="Pipeline Runs" value={stats.totalScans}
          change={`${stats.running} running`} isPositive={true} Icon={GitPullRequest} C={C} />
        <MetricCard title="Pass Rate" value={`${stats.passRate}%`}
          change={`${stats.passed} passed`} isPositive={stats.passRate >= 75} Icon={TrendingUp} C={C} />
        <MetricCard title="Blocked" value={stats.blocked}
          change={stats.blocked > 0 ? "Action Required" : "All Clear"}
          isPositive={stats.blocked === 0} Icon={ShieldAlert} C={C} />
        <MetricCard title="Findings" value={stats.totalFindings}
          change={`${stats.scannerCounts.gitleaks} secrets`}
          isPositive={stats.totalFindings === 0} Icon={TrendingDown} C={C} />
      </div>

      {/* Row 2: Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 16 }}>Security Trend</h3>
          <VulnerabilityTrend scans={scans} C={C} />
        </div>
        <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 16 }}>Severity Distribution</h3>
          <SeverityDonut scans={scans} C={C} />
        </div>
      </div>

      {/* Row 3: Scanner Breakdown */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {SCANNERS.map(sc => (
          <div key={sc.key} style={{
            background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12,
            padding: 16, display: "flex", alignItems: "center", gap: 14,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, background: sc.soft,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <sc.Icon size={20} color={sc.color} />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: C.ink }}>{stats.scannerCounts[sc.key]}</div>
              <div style={{ fontSize: 12, color: C.inkLow, fontWeight: 500 }}>{sc.label} Findings</div>
            </div>
          </div>
        ))}
      </div>

      {/* Row 4: Recent Scans Table */}
      <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 16 }}>Recent Pipeline Activity</h3>
        {scans.length > 0 ? (
          <DataTable columns={recentColumns} data={scans.slice(0, 10)} C={C} />
        ) : (
          <div style={{ padding: 40, textAlign: "center", color: C.inkMuted, fontSize: 13 }}>
            No pipeline runs yet. Push a commit to trigger the security pipeline.
          </div>
        )}
      </div>
    </div>
  );
}
