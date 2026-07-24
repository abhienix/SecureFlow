import React, { useState, useMemo } from "react";
import {
  GitBranch, Terminal, Cpu, Shield, Lock, Globe, Zap, ChevronDown, ChevronRight,
  Clock, CheckCircle, XCircle, Loader2, AlertTriangle, SkipForward
} from "lucide-react";
import SeverityBadge from "../ui/SeverityBadge";

const PIPELINE_STAGES = [
  { key: "checkout", label: "Checkout", Icon: GitBranch, description: "Clone repository and fetch commit history" },
  { key: "code_scan", label: "Code Scan", Icon: Terminal, description: "Gitleaks secrets + Semgrep SAST analysis" },
  { key: "docker", label: "Docker Build", Icon: Cpu, description: "Build container image from Dockerfile" },
  { key: "trivy", label: "Trivy Scan", Icon: Shield, description: "Container vulnerability scanning (CVE detection)" },
  { key: "policy", label: "Policy Gate", Icon: Lock, description: "Evaluate security policy (policy.yaml) thresholds" },
  { key: "deploy", label: "Cloud Run Deploy", Icon: Globe, description: "Deploy to Google Cloud Run production" },
  { key: "zap", label: "ZAP DAST", Icon: Zap, description: "OWASP ZAP dynamic application security testing" },
];

const STATUS_CONFIG = {
  PASS: { color: "#10b981", bg: "rgba(16,185,129,0.12)", Icon: CheckCircle, label: "Passed" },
  BLOCK: { color: "#ef4444", bg: "rgba(239,68,68,0.12)", Icon: XCircle, label: "Blocked" },
  FAILED: { color: "#ef4444", bg: "rgba(239,68,68,0.12)", Icon: XCircle, label: "Failed" },
  QUEUED: { color: "#3b82f6", bg: "rgba(59,130,246,0.12)", Icon: Loader2, label: "Queued" },
  PENDING: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", Icon: Clock, label: "Pending" },
  SKIPPED: { color: "#64748b", bg: "rgba(100,116,139,0.12)", Icon: SkipForward, label: "Skipped" },
  skipped: { color: "#64748b", bg: "rgba(100,116,139,0.12)", Icon: SkipForward, label: "Skipped" },
  WARN: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", Icon: AlertTriangle, label: "Warning" },
};

function getStatusConfig(result) {
  return STATUS_CONFIG[(result || "").toUpperCase()] || STATUS_CONFIG.PENDING;
}

function PipelineTimeline({ scan, C, isExpanded, onToggle }) {
  const steps = scan.pipeline_steps || {};

  return (
    <div style={{
      background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12,
      overflow: "hidden", transition: "all 200ms ease",
    }}>
      {/* Pipeline Header */}
      <button onClick={onToggle} style={{
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 20px", background: "transparent", border: "none", cursor: "pointer",
        color: C.ink, textAlign: "left",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: scan.status === "running" ? "#3b82f6" : scan.action_taken === "BLOCK" ? "#ef4444" : "#10b981",
            boxShadow: scan.status === "running" ? "0 0 8px rgba(59,130,246,0.5)" : "none",
          }} />
          <div>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{scan.repo_name}</span>
            <span style={{ fontSize: 12, fontFamily: C.mono, color: C.inkMid, marginLeft: 10 }}>
              {(scan.commit_sha || "").substring(0, 8)}
            </span>
          </div>
          <span style={{ fontSize: 11, color: C.inkLow, fontWeight: 500, padding: "2px 8px", borderRadius: 6, background: C.bgElevated }}>
            {scan.branch}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* Mini stage indicators */}
          <div style={{ display: "flex", gap: 3 }}>
            {PIPELINE_STAGES.map(stage => {
              const step = steps[stage.key];
              const cfg = getStatusConfig(step?.result);
              return (
                <div key={stage.key} title={`${stage.label}: ${step?.result || "pending"}`} style={{
                  width: 20, height: 4, borderRadius: 2, background: cfg.color, opacity: step ? 1 : 0.2,
                  transition: "all 300ms ease",
                }} />
              );
            })}
          </div>

          <SeverityBadge
            severity={scan.action_taken === "BLOCK" ? "critical" : scan.status === "running" ? "info" : "passed"}
            label={scan.action_taken || scan.status || "PENDING"} C={C}
          />

          {isExpanded ? <ChevronDown size={16} color={C.inkMid} /> : <ChevronRight size={16} color={C.inkMid} />}
        </div>
      </button>

      {/* Expanded Pipeline Timeline */}
      {isExpanded && (
        <div style={{ padding: "0 20px 20px", borderTop: `1px solid ${C.border}` }}>
          {/* Commit info */}
          <div style={{ padding: "12px 0", fontSize: 12, color: C.inkLow }}>
            {scan.commit_message && (
              <span style={{ fontStyle: "italic" }}>"{(scan.commit_message || "").substring(0, 100)}"</span>
            )}
            {scan.started_at && (
              <span style={{ marginLeft: 12, fontFamily: C.mono }}>{new Date(scan.started_at).toLocaleString()}</span>
            )}
          </div>

          {/* Stage Timeline */}
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {PIPELINE_STAGES.map((stage, i) => {
              const step = steps[stage.key];
              const cfg = getStatusConfig(step?.result);
              const StageIcon = stage.Icon;
              const StatusIcon = cfg.Icon;
              const isLast = i === PIPELINE_STAGES.length - 1;

              return (
                <div key={stage.key} style={{ display: "flex", gap: 16 }}>
                  {/* Vertical connector */}
                  <div style={{
                    display: "flex", flexDirection: "column", alignItems: "center", width: 32,
                  }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, background: cfg.bg,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      border: `1px solid ${cfg.color}30`, transition: "all 300ms ease",
                    }}>
                      <StatusIcon size={14} color={cfg.color}
                        style={step?.result === "QUEUED" ? { animation: "spin 1s linear infinite" } : {}} />
                    </div>
                    {!isLast && (
                      <div style={{
                        width: 2, flex: 1, minHeight: 16, background: step ? cfg.color + "40" : C.border,
                        transition: "all 300ms ease",
                      }} />
                    )}
                  </div>

                  {/* Stage content */}
                  <div style={{ flex: 1, paddingBottom: isLast ? 0 : 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                      <StageIcon size={13} color={C.inkMid} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{stage.label}</span>
                      <span style={{
                        fontSize: 10, fontWeight: 600, color: cfg.color,
                        padding: "1px 6px", borderRadius: 4, background: cfg.bg,
                      }}>
                        {cfg.label}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: C.inkLow, lineHeight: 1.4 }}>
                      {step?.detail || stage.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PipelinesPage({ scans = [], C }) {
  const [expandedId, setExpandedId] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");

  const filtered = useMemo(() => {
    if (filterStatus === "all") return scans;
    if (filterStatus === "running") return scans.filter(s => s.status === "running");
    if (filterStatus === "blocked") return scans.filter(s => s.action_taken === "BLOCK");
    if (filterStatus === "passed") return scans.filter(s => s.action_taken === "ALLOW");
    return scans;
  }, [scans, filterStatus]);

  const counts = useMemo(() => ({
    all: scans.length,
    running: scans.filter(s => s.status === "running").length,
    passed: scans.filter(s => s.action_taken === "ALLOW").length,
    blocked: scans.filter(s => s.action_taken === "BLOCK").length,
  }), [scans]);

  const FILTERS = [
    { key: "all", label: "All Pipelines" },
    { key: "running", label: "Running" },
    { key: "passed", label: "Passed" },
    { key: "blocked", label: "Blocked" },
  ];

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: C.ink }}>Security Pipelines</h1>
        <p style={{ fontSize: 13, color: C.inkLow, marginTop: 4 }}>
          CI/CD pipeline execution history with per-stage security gate visualization
        </p>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: 6, borderBottom: `1px solid ${C.border}`, paddingBottom: 0 }}>
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilterStatus(f.key)} style={{
            padding: "8px 14px", fontSize: 13, fontWeight: filterStatus === f.key ? 600 : 500,
            color: filterStatus === f.key ? C.ink : C.inkLow, background: "none", border: "none",
            borderBottom: filterStatus === f.key ? `2px solid ${C.accent}` : "2px solid transparent",
            cursor: "pointer", transition: "all 150ms",
          }}>
            {f.label}
            <span style={{
              marginLeft: 6, fontSize: 11, padding: "1px 6px", borderRadius: 10,
              background: C.bgElevated, color: C.inkMid, fontWeight: 600,
            }}>{counts[f.key]}</span>
          </button>
        ))}
      </div>

      {/* Pipeline List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.length > 0 ? (
          filtered.slice(0, 20).map(scan => (
            <PipelineTimeline
              key={scan.id}
              scan={scan}
              C={C}
              isExpanded={expandedId === scan.id}
              onToggle={() => setExpandedId(expandedId === scan.id ? null : scan.id)}
            />
          ))
        ) : (
          <div style={{
            padding: 60, textAlign: "center", color: C.inkMuted, fontSize: 14,
            background: C.bgCard, borderRadius: 12, border: `1px solid ${C.border}`,
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
            <p style={{ fontWeight: 600, color: C.inkMid }}>No pipeline runs found</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>Push a commit to trigger the SecureFlow security pipeline</p>
          </div>
        )}
      </div>
    </div>
  );
}
