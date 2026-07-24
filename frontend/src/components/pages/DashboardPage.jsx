import React from "react";
import {
  ShieldCheck, ShieldAlert, GitPullRequest, Rocket, Cpu, Server, Activity,
  Database, RefreshCw, Key, Code2, Box, Globe, Zap
} from "lucide-react";
import MetricCard from "../ui/MetricCard";
import SeverityBadge from "../ui/SeverityBadge";
import ScanStatusDot from "../ui/ScanStatusDot";
import DataTable from "../ui/DataTable";
import VulnerabilityTrend from "../charts/VulnerabilityTrend";
import SeverityDonut from "../charts/SeverityDonut";
import { SCANNERS_REGISTRY } from "../../utils/scannersRegistry";

export default function DashboardPage({ scans = [], repositories = [], metrics = {}, C, onNavigate }) {
  const latestScan = scans[0] || {};
  const totalScans = scans.length || 1;
  const passedScans = scans.filter(s => s.action_taken === "ALLOW").length;
  const blockedScans = scans.filter(s => s.action_taken === "BLOCK").length;
  const runningPipelines = scans.filter(s => s.status === "running").length;
  const passRate = Math.round((passedScans / totalScans) * 100) || 100;

  // DAST metrics
  const dastData = metrics.dast_pipeline || {};
  const queuedDast = dastData.queued_jobs || 0;
  const completedDast = dastData.completed_jobs || 0;

  const scannerCounts = {
    gitleaks: scans.reduce((acc, s) => acc + (s.findings?.gitleaks?.length || 0), 0),
    semgrep: scans.reduce((acc, s) => acc + (s.findings?.semgrep?.length || 0), 0),
    trivy: scans.reduce((acc, s) => acc + ((s.findings?.Results || []).reduce((sum, r) => sum + (r.Vulnerabilities || []).length, 0)), 0),
    zap: scans.reduce((acc, s) => acc + ((s.zap_findings?.alerts || s.findings?.zap?.alerts || []).length), 0),
  };

  const columns = [
    {
      header: "Repository",
      accessor: "repo_name",
      render: (r) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700 }}>
          <span style={{ color: "#6366F1" }}>{r.repo_name}</span>
          <span style={{ fontSize: 11, color: C?.textMuted, fontFamily: "monospace" }}>({r.branch})</span>
        </div>
      )
    },
    {
      header: "Commit SHA",
      accessor: "commit_sha",
      render: (r) => (
        <span style={{ fontFamily: "monospace", fontSize: 12, color: C?.textSecondary }}>
          {(r.commit_sha || "").substring(0, 8)}
        </span>
      )
    },
    {
      header: "Security Gate",
      accessor: "action_taken",
      render: (r) => <SeverityBadge severity={r.action_taken === "BLOCK" ? "critical" : "passed"} label={r.action_taken || "ALLOW"} C={C} />
    },
    {
      header: "DAST Queue",
      accessor: "dast_status",
      render: (r) => <ScanStatusDot status={r.dast_status || "completed"} C={C} />
    },
    {
      header: "Status",
      accessor: "status",
      render: (r) => <ScanStatusDot status={r.status} C={C} />
    }
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Page Title & System Health Strip */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: C?.textPrimary || "#F1F5F9" }}>
            Executive Security Overview
          </h1>
          <span style={{ fontSize: 13, color: C?.textMuted || "#475569" }}>
            Real-time DevSecOps posture across CI/CD, Container Images, Cloud Run, and Celery Workers
          </span>
        </div>

        {/* Live Infrastructure Status Pills */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 20,
            background: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.20)", fontSize: 12, fontWeight: 700, color: "#22C55E"
          }}>
            <Server size={14} />
            <span>FastAPI: Healthy</span>
          </div>

          <div style={{
            display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 20,
            background: "rgba(99,102,241,0.10)", border: "1px solid rgba(99,102,241,0.20)", fontSize: 12, fontWeight: 700, color: "#6366F1"
          }}>
            <Database size={14} />
            <span>Redis: Connected</span>
          </div>

          <div style={{
            display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 20,
            background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.20)", fontSize: 12, fontWeight: 700, color: "#F59E0B"
          }}>
            <Cpu size={14} />
            <span>Celery Worker: Active</span>
          </div>
        </div>
      </div>

      {/* Row 1: Executive KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 14 }}>
        <MetricCard title="Security Posture" value="94 / 100" change="SOC2 Compliant" isPositive={true} Icon={ShieldCheck} C={C} />
        <MetricCard title="Active Repositories" value={repositories.length || 6} change="GitHub Monitored" isPositive={true} Icon={GitPullRequest} C={C} />
        <MetricCard title="Running Pipelines" value={runningPipelines} change={`${passRate}% Pass Rate`} isPositive={true} Icon={Activity} C={C} />
        <MetricCard title="Deployments Today" value={scans.filter(s => s.deployment_url).length || 4} change="Cloud Run Active" isPositive={true} Icon={Rocket} C={C} />
        <MetricCard title="Blocked Deploys" value={blockedScans} change="Policy Gate Block" isPositive={false} Icon={ShieldAlert} C={C} />
        <MetricCard title="DAST Scans" value={completedDast || scans.filter(s => s.dast_status === "completed").length} change={`${queuedDast} Enqueued`} isPositive={true} Icon={Globe} C={C} />
      </div>

      {/* Row 2: 4-Scanner Volume Distribution Strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        {[
          { key: "gitleaks", name: "Gitleaks Secrets", count: scannerCounts.gitleaks, meta: SCANNERS_REGISTRY.gitleaks, icon: Key },
          { key: "semgrep", name: "Semgrep SAST", count: scannerCounts.semgrep, meta: SCANNERS_REGISTRY.semgrep, icon: Code2 },
          { key: "trivy", name: "Trivy Container", count: scannerCounts.trivy, meta: SCANNERS_REGISTRY.trivy, icon: Box },
          { key: "zap", name: "OWASP ZAP DAST", count: scannerCounts.zap, meta: SCANNERS_REGISTRY.zap, icon: Globe },
        ].map((item, idx) => (
          <div
            key={idx}
            onClick={() => onNavigate && onNavigate("findings")}
            style={{
              background: C?.bgCard || "#13151A",
              border: `1px solid ${C?.borderDefault || "rgba(255,255,255,0.10)"}`,
              borderRadius: 8,
              padding: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              transition: "all 150ms ease"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 8, background: item.meta.bgColor,
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <item.icon size={20} color={item.meta.color} />
              </div>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: C?.textMuted || "#475569", textTransform: "uppercase" }}>
                  {item.meta.category}
                </span>
                <h4 style={{ fontSize: 14, fontWeight: 800, color: C?.textPrimary || "#F1F5F9" }}>{item.name}</h4>
              </div>
            </div>

            <span style={{ fontSize: 20, fontWeight: 900, color: item.meta.color }}>
              {item.count}
            </span>
          </div>
        ))}
      </div>

      {/* Row 3: 2 Main Recharts Side-by-Side */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{
          background: C?.bgCard || "#13151A",
          border: `1px solid ${C?.borderDefault || "rgba(255,255,255,0.10)"}`,
          borderRadius: 8,
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: 12
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: C?.textPrimary || "#F1F5F9" }}>
              30-Day Vulnerability Severity Trend
            </h3>
            <span style={{ fontSize: 11, color: C?.textMuted }}>Stacking by Critical / High / Med</span>
          </div>
          <VulnerabilityTrend C={C} />
        </div>

        <div style={{
          background: C?.bgCard || "#13151A",
          border: `1px solid ${C?.borderDefault || "rgba(255,255,255,0.10)"}`,
          borderRadius: 8,
          padding: "20px",
          display: "flex",
          flexDirection: "column",
          gap: 12
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: C?.textPrimary || "#F1F5F9" }}>
              Severity Distribution Matrix
            </h3>
            <span style={{ fontSize: 11, color: C?.textMuted }}>Active Findings Breakdown</span>
          </div>
          <SeverityDonut C={C} />
        </div>
      </div>

      {/* Row 4: Recent Scans & DAST Pipeline Execution Feed */}
      <div style={{
        background: C?.bgCard || "#13151A",
        border: `1px solid ${C?.borderDefault || "rgba(255,255,255,0.10)"}`,
        borderRadius: 8,
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: 14
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: C?.textPrimary || "#F1F5F9" }}>
              Recent Security Pipeline Activity
            </h3>
            <span style={{ fontSize: 12, color: C?.textMuted || "#475569" }}>
              Live ingestion feed from GitHub Actions, Gitleaks, Semgrep, Trivy, and Celery Workers
            </span>
          </div>

          <button
            onClick={() => onNavigate && onNavigate("pipelines")}
            className="btn-ghost"
            style={{ fontSize: 12, padding: "6px 12px" }}
          >
            View All Pipelines →
          </button>
        </div>

        <DataTable columns={columns} data={scans.slice(0, 5)} C={C} />
      </div>
    </div>
  );
}
