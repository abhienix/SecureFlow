import React, { useState, useMemo } from "react";
import {
  GitBranch, Terminal, Cpu, Shield, Lock, Globe, Zap,
  Clock, CheckCircle, XCircle, Loader2, AlertTriangle, SkipForward, Sparkles
} from "lucide-react";
import SeverityBadge from "../ui/SeverityBadge";
import ScanStatusDot from "../ui/ScanStatusDot";

const PIPELINE_STAGES = [
  { key: "checkout", label: "Checkout", Icon: GitBranch, desc: "Clone repo & verify commit SHA" },
  { key: "code_scan", label: "Code Scan", Icon: Terminal, desc: "Gitleaks secrets + Semgrep SAST" },
  { key: "docker", label: "Docker Build", Icon: Cpu, desc: "Multi-stage container build" },
  { key: "trivy", label: "Trivy Scan", Icon: Shield, desc: "Container CVE vulnerability audit" },
  { key: "policy", label: "Policy Gate", Icon: Lock, desc: "policy.yaml gate evaluation" },
  { key: "deploy", label: "Cloud Run", Icon: Globe, desc: "Deploy revision to Google Cloud Run" },
  { key: "zap", label: "ZAP DAST", Icon: Zap, desc: "OWASP ZAP dynamic web scan" },
];

const STATUS_MAP = {
  PASS: { color: "#10b981", bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.3)", Icon: CheckCircle, label: "Passed" },
  BLOCK: { color: "#ef4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)", Icon: XCircle, label: "Blocked" },
  FAILED: { color: "#ef4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.3)", Icon: XCircle, label: "Failed" },
  QUEUED: { color: "#3b82f6", bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.3)", Icon: Loader2, label: "Queued" },
  PENDING: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)", Icon: Clock, label: "Pending" },
  SKIPPED: { color: "#64748b", bg: "rgba(100,116,139,0.12)", border: "rgba(100,116,139,0.2)", Icon: SkipForward, label: "Skipped" },
};

function getStageConfig(res) {
  return STATUS_MAP[(res || "").toUpperCase()] || STATUS_MAP.PENDING;
}

export default function PipelinesPage({ scans = [], C }) {
  const [selectedScanId, setSelectedScanId] = useState(scans[0]?.id || null);
  const [viewTab, setViewTab] = useState("timeline"); // "timeline" | "why_blocked"

  const activeScan = useMemo(() => {
    return scans.find(s => s.id === selectedScanId) || scans[0] || {};
  }, [scans, selectedScanId]);

  const steps = activeScan.pipeline_steps || {};
  const isBlocked = activeScan.action_taken === "BLOCK";

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: C?.ink || "#f8fafc", margin: "0 0 4px 0" }}>
            3D Security Pipeline Execution Engine
          </h1>
          <div style={{ fontSize: 13, color: C?.inkLow || "#64748b" }}>
            Interactive stage flow, real-time WebSocket telemetry, and Policy Gate decision analysis
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div style={{ display: "flex", gap: 6, background: C?.bgSurface || "#111827", padding: 4, borderRadius: 10, border: `1px solid ${C?.border || "#1e293b"}` }}>
          <button
            onClick={() => setViewTab("timeline")}
            style={{
              padding: "6px 14px", borderRadius: 8, border: "none",
              background: viewTab === "timeline" ? (C?.accent || "#6366F1") : "transparent",
              color: viewTab === "timeline" ? "#ffffff" : (C?.inkLow || "#64748b"),
              fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 150ms ease"
            }}
          >
            3D Stage Timeline
          </button>

          <button
            onClick={() => setViewTab("why_blocked")}
            style={{
              padding: "6px 14px", borderRadius: 8, border: "none",
              background: viewTab === "why_blocked" ? (C?.red || "#ef4444") : "transparent",
              color: viewTab === "why_blocked" ? "#ffffff" : (C?.inkLow || "#64748b"),
              fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 150ms ease",
              display: "flex", alignItems: "center", gap: 6
            }}
          >
            <AlertTriangle size={13} />
            <span>Why Blocked?</span>
            {isBlocked && (
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ffffff" }} />
            )}
          </button>
        </div>
      </div>

      {/* Select Pipeline Run Bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, overflowX: "auto", paddingBottom: 4
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C?.inkMuted, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Select Run:
        </span>
        {scans.slice(0, 8).map(scan => {
          const isSel = (scan.id === activeScan.id);
          const isBlk = scan.action_taken === "BLOCK";
          return (
            <button
              key={scan.id}
              onClick={() => { setSelectedScanId(scan.id); }}
              style={{
                padding: "6px 12px", borderRadius: 8, cursor: "pointer",
                border: `1px solid ${isSel ? (C?.accent || "#6366F1") : (C?.border || "#1e293b")}`,
                background: isSel ? (C?.accentSoft || "rgba(99,102,241,0.12)") : (C?.bgCard || "#0f172a"),
                color: isSel ? (C?.ink || "#f8fafc") : (C?.inkMid || "#94a3b8"),
                fontSize: 12, fontWeight: 600, fontFamily: C?.mono || "monospace",
                display: "flex", alignItems: "center", gap: 8
              }}
            >
              <span style={{
                width: 7, height: 7, borderRadius: "50%",
                background: isBlk ? "#ef4444" : "#10b981"
              }} />
              <span>{(scan.commit_sha || "HEAD").substring(0, 7)}</span>
              <span style={{ fontSize: 10, color: C?.inkMuted }}>#{scan.id}</span>
            </button>
          );
        })}
      </div>

      {/* Run Summary Strip */}
      <div style={{
        padding: 16, background: C?.bgCard || "#0f172a", border: `1px solid ${C?.border || "#1e293b"}`,
        borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, background: C?.accentSoft || "rgba(99,102,241,0.12)",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <GitBranch size={20} color={C?.accent || "#6366F1"} />
          </div>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: C?.ink || "#f8fafc", margin: 0 }}>
              {activeScan.repo_name || "abhienix/SecureFlow"}
            </h3>
            <div style={{ fontSize: 12, color: C?.inkLow || "#64748b", marginTop: 2 }}>
              Branch: <strong style={{ color: C?.inkMid }}>{activeScan.branch || "main"}</strong> | SHA: <span style={{ fontFamily: C?.mono }}>{(activeScan.commit_sha || "HEAD").substring(0, 8)}</span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: 11, color: C?.inkMuted, textTransform: "uppercase", fontWeight: 700 }}>Security Gate</span>
            <div style={{ marginTop: 2 }}>
              <SeverityBadge severity={isBlocked ? "critical" : "passed"} label={activeScan.action_taken || "ALLOW"} C={C} />
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: 11, color: C?.inkMuted, textTransform: "uppercase", fontWeight: 700 }}>DAST Status</span>
            <div style={{ marginTop: 2 }}>
              <ScanStatusDot status={activeScan.dast_status || "completed"} C={C} />
            </div>
          </div>
        </div>
      </div>

      {/* VIEW TAB 1: 3D Isometric Pipeline Stage Flow */}
      {viewTab === "timeline" && (
        <div style={{
          background: C?.bgCard || "#0f172a", border: `1px solid ${C?.border || "#1e293b"}`,
          borderRadius: 16, padding: 24, boxShadow: C?.shadowLg
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C?.inkMuted, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 20 }}>
            Interactive 3D Stage Flow Execution Node Map
          </div>

          {/* 3D Isometric Stage Node Cards Grid */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, position: "relative"
          }}>
            {PIPELINE_STAGES.map((stage, i) => {
              const step = steps[stage.key];
              const cfg = getStageConfig(step?.result);
              const Icon = stage.Icon;
              const StatusIcon = cfg.Icon;
              const isRunning = step?.result === "RUNNING" || step?.result === "QUEUED";

              return (
                <div
                  key={stage.key}
                  style={{
                    background: C?.bgSurface || "#111827",
                    border: `1px solid ${cfg.border}`,
                    borderRadius: 12, padding: 14,
                    display: "flex", flexDirection: "column", gap: 10,
                    boxShadow: isRunning ? `0 0 20px ${cfg.color}40` : "0 4px 12px rgba(0,0,0,0.15)",
                    transform: isRunning ? "translateY(-4px)" : "none",
                    transition: "all 200ms ease", position: "relative"
                  }}
                >
                  {/* Top Node Header */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8, background: cfg.bg,
                      display: "flex", alignItems: "center", justifyContent: "center"
                    }}>
                      <Icon size={15} color={cfg.color} />
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 800, color: C?.inkMuted }}>
                      0{i + 1}
                    </span>
                  </div>

                  {/* Stage Name */}
                  <div>
                    <h4 style={{ fontSize: 13, fontWeight: 800, color: C?.ink || "#f8fafc", margin: "0 0 2px 0" }}>
                      {stage.label}
                    </h4>
                    <span style={{ fontSize: 10, color: C?.inkLow || "#64748b", display: "block" }}>
                      {stage.desc}
                    </span>
                  </div>

                  {/* Bottom Status Indicator */}
                  <div style={{
                    marginTop: "auto", paddingTop: 8, borderTop: `1px solid ${C?.border || "#1e293b"}`,
                    display: "flex", alignItems: "center", justifyContent: "space-between"
                  }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: cfg.color, textTransform: "uppercase" }}>
                      {cfg.label}
                    </span>
                    <StatusIcon size={12} color={cfg.color} className={isRunning ? "spin" : ""} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detailed Log Breakdown per Stage */}
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${C?.border || "#1e293b"}` }}>
            <h4 style={{ fontSize: 14, fontWeight: 800, color: C?.ink || "#f8fafc", marginBottom: 12 }}>
              Stage Execution Telemetry Logs
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {PIPELINE_STAGES.map(stage => {
                const step = steps[stage.key];
                const cfg = getStageConfig(step?.result);
                return (
                  <div key={stage.key} style={{
                    padding: "10px 14px", borderRadius: 8, background: C?.bgSurface || "#111827",
                    border: `1px solid ${C?.border || "#1e293b"}`, display: "flex", alignItems: "center", justifyContent: "space-between"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: cfg.color }} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: C?.ink || "#f8fafc" }}>{stage.label}</span>
                      <span style={{ fontSize: 12, color: C?.inkLow || "#64748b" }}>— {step?.detail || stage.desc}</span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 800, color: cfg.color, padding: "2px 8px", borderRadius: 4, background: cfg.bg }}>
                      {cfg.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VIEW TAB 2: Why Blocked? Policy Gate Decision Analysis */}
      {viewTab === "why_blocked" && (
        <div style={{
          background: C?.bgCard || "#0f172a", border: `1px solid ${isBlocked ? (C?.redBorder || "rgba(239,68,68,0.3)") : (C?.border || "#1e293b")}`,
          borderRadius: 16, padding: 24, boxShadow: C?.shadowLg
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <AlertTriangle size={22} color={isBlocked ? (C?.red || "#ef4444") : (C?.green || "#10b981")} />
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 900, color: C?.ink || "#f8fafc", margin: 0 }}>
                Policy Gate Decision Analysis: {isBlocked ? "DEPLOYMENT BLOCKED" : "DEPLOYMENT PASSED"}
              </h3>
              <span style={{ fontSize: 12, color: C?.inkLow || "#64748b" }}>
                Root cause evaluation according to active declarative rules in `policy.yaml`
              </span>
            </div>
          </div>

          {isBlocked ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{
                padding: 16, borderRadius: 10, background: C?.redSoft || "rgba(239,68,68,0.12)",
                border: `1px solid ${C?.redBorder || "rgba(239,68,68,0.25)"}`, color: C?.red || "#ef4444", fontSize: 13, lineHeight: 1.5
              }}>
                <strong>🚫 Security Gate Policy Enforcement Triggered:</strong>
                <p style={{ margin: "6px 0 0 0" }}>
                  {activeScan.ai_explanation || "Gitleaks secret scanner or Trivy container CVE score exceeded the max allowed CVSS threshold (CVSS >= 7.0) set in policy.yaml."}
                </p>
              </div>

              <div style={{
                padding: 16, borderRadius: 10, background: C?.bgSurface || "#111827",
                border: `1px solid ${C?.border || "#1e293b"}`, display: "flex", flexDirection: "column", gap: 10
              }}>
                <h4 style={{ fontSize: 14, fontWeight: 800, color: C?.ink || "#f8fafc", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
                  <Sparkles size={16} color={C?.accent || "#6366F1"} /> Recommended Fix Patch
                </h4>
                <div style={{ fontSize: 13, color: C?.inkMid || "#94a3b8", lineHeight: 1.5 }}>
                  {activeScan.ai_fix || "Rotate exposed credentials immediately, remove hardcoded secret strings from git commit history using git-filter-repo, and enforce environment variables."}
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              padding: 24, borderRadius: 10, background: C?.greenSoft || "rgba(16,185,129,0.12)",
              border: `1px solid ${C?.greenBorder || "rgba(16,185,129,0.25)"}`, color: C?.green || "#10b981", fontSize: 13, textAlign: "center"
            }}>
              <CheckCircle size={32} style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 16, fontWeight: 800 }}>Pipeline Passed Policy Gate Evaluation</div>
              <p style={{ margin: "4px 0 0 0", color: C?.inkMid }}>
                No critical CVSS violations or plain-text secrets were detected. Deployment authorized.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
