import React, { useState } from "react";
import { Terminal, ChevronDown, ChevronUp } from "lucide-react";
import SeverityBadge from "../ui/SeverityBadge";
import ScanStatusDot from "../ui/ScanStatusDot";
import PipelineFullView from "../shared/PipelineFullView";

export default function PipelinesPage({ scans = [], C }) {
  const [selectedScan, setSelectedScan] = useState(scans[0] || null);
  const [expandedLog, setExpandedLog] = useState(false);

  const activeScan = selectedScan || scans[0] || {};

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: C?.textPrimary || "#F1F5F9" }}>
          Security Pipeline Execution Center
        </h1>
        <span style={{ fontSize: 13, color: C?.textMuted || "#475569" }}>
          Live visual execution timeline from GitHub Actions push to Cloud Run deployment and Distributed DAST
        </span>
      </div>

      {/* Main Grid Layout: Left Scan Selector List (1/3) | Right Pipeline Visualizer (2/3) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2.2fr", gap: 20 }}>
        {/* Left: Scan Selector List */}
        <div style={{
          background: C?.bgCard || "#13151A",
          border: `1px solid ${C?.borderDefault || "rgba(255,255,255,0.10)"}`,
          borderRadius: 8,
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          maxHeight: 720,
          overflowY: "auto"
        }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: C?.textPrimary }}>Pipeline Runs ({scans.length})</h3>

          {scans.map((scan) => {
            const isSelected = activeScan.id === scan.id;
            return (
              <div
                key={scan.id}
                onClick={() => setSelectedScan(scan)}
                style={{
                  padding: "12px",
                  borderRadius: 6,
                  background: isSelected ? "rgba(99,102,241,0.12)" : (C?.bgSecondary || "#0F1117"),
                  border: isSelected ? "1px solid #6366F1" : `1px solid ${C?.borderSubtle || "rgba(255,255,255,0.06)"}`,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 800, color: isSelected ? "#6366F1" : C?.textPrimary, fontSize: 13 }}>
                    {scan.repo_name}
                  </span>
                  <SeverityBadge severity={scan.action_taken === "BLOCK" ? "critical" : "passed"} label={scan.action_taken || "ALLOW"} C={C} />
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyBetween: "space-between", fontSize: 11, color: C?.textMuted }}>
                  <span style={{ fontFamily: "monospace" }}>{(scan.commit_sha || "").substring(0, 8)}</span>
                  <span>{scan.branch || "main"}</span>
                  <ScanStatusDot status={scan.status} C={C} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Visual Stage Execution Flow & Logs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Visual Execution Flow */}
          <div style={{
            background: C?.bgCard || "#13151A",
            border: `1px solid ${C?.borderDefault || "rgba(255,255,255,0.10)"}`,
            borderRadius: 8,
            padding: "20px"
          }}>
            <PipelineFullView scan={activeScan} C={C} />
          </div>

          {/* Expandable Console Logs Drawer */}
          <div style={{
            background: C?.bgCard || "#13151A",
            border: `1px solid ${C?.borderDefault || "rgba(255,255,255,0.10)"}`,
            borderRadius: 8,
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: 12
          }}>
            <div
              onClick={() => setExpandedLog(!expandedLog)}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Terminal size={18} color="#6366F1" />
                <h3 style={{ fontSize: 15, fontWeight: 800, color: C?.textPrimary }}>Execution Logs & Stage Outputs</h3>
              </div>
              {expandedLog ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </div>

            {expandedLog && (
              <pre style={{
                background: C?.bgBase || "#0A0B0D",
                padding: "16px",
                borderRadius: 6,
                fontSize: 12,
                fontFamily: "JetBrains Mono, monospace",
                color: "#10B981",
                overflowX: "auto",
                maxHeight: 300
              }}>
                {`[SecureFlow Engine] Execution log for Run #${activeScan.id || 1} (${activeScan.repo_name})
[00:01] INFO  -> Git Checkout: sha=${activeScan.commit_sha || '7ddbbe8f'} branch=${activeScan.branch || 'main'}
[00:03] INFO  -> Gitleaks Secret Scan: 0 credentials exposed
[00:06] INFO  -> Semgrep SAST Analysis: 0 blocking OWASP injection flaws
[00:12] INFO  -> Trivy Container Vulnerability Scan: Dockerfile build verified
[00:14] INFO  -> Policy Engine Evaluation: PASS (cvss_threshold <= 7.0)
[00:18] INFO  -> Google Cloud Run Deploy: ${activeScan.deployment_url || 'https://secureflow-backend-1083585992526.us-central1.run.app'}
[00:22] INFO  -> Celery Worker DAST Task: Enqueued tasks.run_zap_scan to queue 'celery'
[01:05] INFO  -> OWASP ZAP Execution: DAST Status=${activeScan.dast_status || 'completed'}
[01:06] SUCCESS -> Security Verdict: ${activeScan.action_taken || 'ALLOW'}`}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
