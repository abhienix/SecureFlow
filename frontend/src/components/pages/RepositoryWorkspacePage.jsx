import React, { useState } from "react";
import {
  ArrowLeft, FolderGit2, ShieldAlert, Terminal, Rocket, Key, Code2, Box, Globe, FileText, Sparkles, CheckCircle2
} from "lucide-react";
import MetricCard from "../ui/MetricCard";
import SeverityBadge from "../ui/SeverityBadge";
import ScanStatusDot from "../ui/ScanStatusDot";
import DataTable from "../ui/DataTable";
import VulnerabilityTrend from "../charts/VulnerabilityTrend";
import AIAnalysisBlock from "../shared/AIAnalysisBlock";

export default function RepositoryWorkspacePage({ repo, scans = [], onBack, C }) {
  const [activeTab, setActiveTab] = useState("overview");

  const repoScans = scans.filter(s => s.repo_name === (repo?.name || repo?.repo_name) || !repo);
  const targetRepo = repo || { name: "abhienix/SecureFlow", default_branch: "main" };
  const latestScan = repoScans[0] || scans[0] || {};

  const TABS = [
    { id: "overview", label: "Overview", Icon: FolderGit2 },
    { id: "pipelines", label: "Pipeline History", Icon: Terminal },
    { id: "deployments", label: "Deployment History", Icon: Rocket },
    { id: "secrets", label: "Secrets (Gitleaks)", Icon: Key },
    { id: "sast", label: "SAST (Semgrep)", Icon: Code2 },
    { id: "container", label: "Container (Trivy)", Icon: Box },
    { id: "dast", label: "DAST (OWASP ZAP)", Icon: Globe },
    { id: "policies", label: "Policy Overrides", Icon: FileText },
    { id: "aisummary", label: "AI Summary", Icon: Sparkles },
    { id: "cwe_owasp", label: "CWE/OWASP Coverage", Icon: CheckCircle2 }
  ];

  // Helper table columns
  const pipelineColumns = [
    { header: "Run ID", accessor: "id", render: (r) => <span style={{ fontFamily: "monospace", color: "#6366F1", fontWeight: 700 }}>#{r.id}</span> },
    { header: "Commit SHA", accessor: "commit_sha", render: (r) => <span style={{ fontFamily: "monospace" }}>{(r.commit_sha || "").substring(0, 8)}</span> },
    { header: "Branch", accessor: "branch" },
    { header: "Policy Gate", accessor: "action_taken", render: (r) => <SeverityBadge severity={r.action_taken === "BLOCK" ? "critical" : "passed"} label={r.action_taken || "ALLOW"} C={C} /> },
    { header: "DAST Status", accessor: "dast_status", render: (r) => <ScanStatusDot status={r.dast_status || "completed"} C={C} /> },
    { header: "Pipeline Status", accessor: "status", render: (r) => <ScanStatusDot status={r.status} C={C} /> }
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Top Back Navigation Bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={onBack}
          style={{
            display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: C?.bgCard || "#13151A",
            border: `1px solid ${C?.borderDefault || "rgba(255,255,255,0.10)"}`, borderRadius: 6, color: C?.textPrimary,
            fontSize: 12, fontWeight: 700, cursor: "pointer"
          }}
        >
          <ArrowLeft size={14} />
          <span>Back to Repositories</span>
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <FolderGit2 size={18} color="#6366F1" />
          <h2 style={{ fontSize: 18, fontWeight: 900, color: C?.textPrimary || "#F1F5F9" }}>
            {targetRepo.name || targetRepo.repo_name} Workspace
          </h2>
        </div>
      </div>

      {/* Workspace Tabs Navigation */}
      <div style={{
        display: "flex", alignItems: "center", gap: 4, borderBottom: `1px solid ${C?.borderSubtle || "rgba(255,255,255,0.06)"}`,
        overflowX: "auto"
      }}>
        {TABS.map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", border: "none", background: "transparent",
                color: isActive ? "#F1F5F9" : (C?.textMuted || "#475569"), fontSize: 13, fontWeight: isActive ? 700 : 500,
                borderBottom: isActive ? "2px solid #6366F1" : "2px solid transparent", cursor: "pointer", whiteSpace: "nowrap"
              }}
            >
              <Icon size={16} color={isActive ? "#6366F1" : (C?.textMuted || "#475569")} />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ background: C?.bgCard || "#13151A", border: `1px solid ${C?.borderDefault}`, borderRadius: 8, padding: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: C?.textPrimary, marginBottom: 12 }}>Repository Security Score Trend</h3>
                <VulnerabilityTrend C={C} />
              </div>
              <div style={{ background: C?.bgCard || "#13151A", border: `1px solid ${C?.borderDefault}`, borderRadius: 8, padding: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: C?.textPrimary, marginBottom: 12 }}>Recent Repository Pipelines</h3>
                <DataTable columns={pipelineColumns} data={repoScans.slice(0, 5)} C={C} />
              </div>
            </div>

            <div>
              <AIAnalysisBlock scan={latestScan} C={C} />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PIPELINES */}
      {activeTab === "pipelines" && (
        <div style={{ background: C?.bgCard || "#13151A", border: `1px solid ${C?.borderDefault}`, borderRadius: 8, padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: C?.textPrimary, marginBottom: 12 }}>Pipeline Execution History</h3>
          <DataTable columns={pipelineColumns} data={repoScans} C={C} />
        </div>
      )}

      {/* TAB 3: DEPLOYMENTS */}
      {activeTab === "deployments" && (
        <div style={{ background: C?.bgCard || "#13151A", border: `1px solid ${C?.borderDefault}`, borderRadius: 8, padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: C?.textPrimary, marginBottom: 12 }}>Cloud Run Deployment Revisions</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {repoScans.filter(s => s.deployment_url).map(s => (
              <div key={s.id} style={{ display: "flex", justifyContent: "space-between", padding: 12, background: C?.bgSecondary, borderRadius: 6 }}>
                <div>
                  <span style={{ fontWeight: 700, color: C?.textPrimary }}>secureflow-backend-{(s.commit_sha || "v1").substring(0, 7)}</span>
                  <span style={{ display: "block", fontSize: 11, color: C?.textMuted }}>{s.deployment_url}</span>
                </div>
                <SeverityBadge severity={s.action_taken === "BLOCK" ? "critical" : "passed"} label={s.action_taken || "ALLOW"} C={C} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: SECRETS (GITLEAKS) */}
      {activeTab === "secrets" && (
        <div style={{ background: C?.bgCard || "#13151A", border: `1px solid ${C?.borderDefault}`, borderRadius: 8, padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: C?.textPrimary, marginBottom: 12 }}>Gitleaks Credential Scan Results</h3>
          <pre style={{ background: C?.bgSecondary, padding: 16, borderRadius: 6, fontSize: 12, color: C?.textSecondary, overflowX: "auto" }}>
            {JSON.stringify((latestScan.findings || {}).gitleaks || [], null, 2)}
          </pre>
        </div>
      )}

      {/* TAB 5: SAST (SEMGREP) */}
      {activeTab === "sast" && (
        <div style={{ background: C?.bgCard || "#13151A", border: `1px solid ${C?.borderDefault}`, borderRadius: 8, padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: C?.textPrimary, marginBottom: 12 }}>Semgrep SAST Code Vulnerability Results</h3>
          <pre style={{ background: C?.bgSecondary, padding: 16, borderRadius: 6, fontSize: 12, color: C?.textSecondary, overflowX: "auto" }}>
            {JSON.stringify((latestScan.findings || {}).semgrep || [], null, 2)}
          </pre>
        </div>
      )}

      {/* TAB 6: CONTAINER (TRIVY) */}
      {activeTab === "container" && (
        <div style={{ background: C?.bgCard || "#13151A", border: `1px solid ${C?.borderDefault}`, borderRadius: 8, padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: C?.textPrimary, marginBottom: 12 }}>Trivy Container Image CVE Results</h3>
          <pre style={{ background: C?.bgSecondary, padding: 16, borderRadius: 6, fontSize: 12, color: C?.textSecondary, overflowX: "auto" }}>
            {JSON.stringify((latestScan.findings || {}).Results || [], null, 2)}
          </pre>
        </div>
      )}

      {/* TAB 7: DAST (OWASP ZAP) */}
      {activeTab === "dast" && (
        <div style={{ background: C?.bgCard || "#13151A", border: `1px solid ${C?.borderDefault}`, borderRadius: 8, padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: C?.textPrimary, marginBottom: 12 }}>OWASP ZAP DAST Target Probe Results</h3>
          <pre style={{ background: C?.bgSecondary, padding: 16, borderRadius: 6, fontSize: 12, color: C?.textSecondary, overflowX: "auto" }}>
            {JSON.stringify(latestScan.zap_findings || (latestScan.findings || {}).zap || {}, null, 2)}
          </pre>
        </div>
      )}

      {/* TAB 8: POLICIES */}
      {activeTab === "policies" && (
        <div style={{ background: C?.bgCard || "#13151A", border: `1px solid ${C?.borderDefault}`, borderRadius: 8, padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: C?.textPrimary, marginBottom: 12 }}>Applied Security Policy Gate Rules</h3>
          <p style={{ fontSize: 13, color: C?.textMuted }}>CVSS Threshold: 7.0 (Block on CRITICAL & HIGH vulnerabilities)</p>
        </div>
      )}

      {/* TAB 9: AI SUMMARY */}
      {activeTab === "aisummary" && (
        <div style={{ background: C?.bgCard || "#13151A", border: `1px solid ${C?.borderDefault}`, borderRadius: 8, padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: C?.textPrimary, marginBottom: 12 }}>AI Remediation & Security Verdict</h3>
          <p style={{ fontSize: 13, color: C?.textSecondary }}>{latestScan.ai_explanation || "No policy violations detected."}</p>
        </div>
      )}

      {/* TAB 10: CWE / OWASP COVERAGE */}
      {activeTab === "cwe_owasp" && (
        <div style={{ background: C?.bgCard || "#13151A", border: `1px solid ${C?.borderDefault}`, borderRadius: 8, padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: C?.textPrimary, marginBottom: 12 }}>OWASP Top 10 & CWE Standard Mapping</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ background: C?.bgSecondary, padding: 14, borderRadius: 6 }}>
              <span style={{ fontWeight: 700, color: C?.textPrimary }}>OWASP A03:2021-Injection</span>
              <span style={{ display: "block", fontSize: 11, color: C?.textMuted }}>Checked by Semgrep & ZAP</span>
            </div>
            <div style={{ background: C?.bgSecondary, padding: 14, borderRadius: 6 }}>
              <span style={{ fontWeight: 700, color: C?.textPrimary }}>OWASP A07:2021-Authentication Failures</span>
              <span style={{ display: "block", fontSize: 11, color: C?.textMuted }}>Checked by Gitleaks</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
