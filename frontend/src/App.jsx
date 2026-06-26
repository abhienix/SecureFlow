/**
 * SecureFlow — App.jsx (Complete)
 * AI-Powered Security Gate for CI/CD — live dashboard
 */

import React, {
  useState, useEffect, useCallback, useMemo,
} from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  Shield, Activity, CheckCircle, XCircle, AlertTriangle, Zap,
  RefreshCw, ThumbsUp, ThumbsDown,
  ChevronDown, ChevronUp, Clock, TrendingUp,
  GitPullRequest, Sparkles,
  GitBranch, Flame, ListChecks, Loader2,
} from "lucide-react";

// --- Design tokens ----------------------------------------------------------
const C = {
  bg: "#080c10", bgCard: "#0d1117", bgHover: "#131a22", bgSurface: "#161b22",
  bgElevated: "#1c2330", border: "#1e2d3d", borderBright: "#2a3f55",
  ink: "#e6edf3", inkMid: "#8b949e", inkLow: "#3d4f61",
  teal: "#00d9a6", tealSoft: "#00d9a615", tealBord: "#00d9a635", tealDim: "#003d2e",
  blue: "#58a6ff", blueSoft: "#58a6ff12", blueDim: "#0a2040",
  green: "#3fb950", greenSoft: "#3fb95015",
  red: "#f85149", redSoft: "#f8514912", redBord: "#5c1a1a",
  amber: "#f0883e", amberSoft: "#f0883e12", amberBord: "#7a3800",
  violet: "#bc8cff", violetSoft: "#bc8cff12", violetBord: "#4a1a8a",
  mono: "'JetBrains Mono','Fira Mono','Consolas',monospace",
  sans: "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
};

const BACKEND = "https://secureflow-backend-1083585992526.us-central1.run.app";

const TABS = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "pipeline", label: "Pipeline", icon: GitPullRequest },
  { id: "feed", label: "Scan Feed", icon: ListChecks },
  { id: "metrics", label: "Metrics", icon: TrendingUp },
];

const PIPELINE_STAGES = [
  { key: "checkout", label: "Checkout" },
  { key: "code_scan", label: "Code Scan" },
  { key: "docker", label: "Docker Build" },
  { key: "trivy", label: "Trivy Scan" },
  { key: "policy", label: "Policy Gate" },
  { key: "deploy", label: "Deploy" },
];

function resultToStatus(result) {
  if (!result) return "pending";
  const r = String(result).toUpperCase();
  if (["PASS", "SCANNED", "ALLOW"].includes(r)) return "passed";
  if (["FAIL", "FAILED", "BLOCK"].includes(r)) return "failed";
  if (r === "RUNNING") return "running";
  if (r === "SKIPPED") return "skipped";
  return "passed";
}

function normaliseScan(raw) {
  const steps = raw.pipeline_steps || {};
  const pipeline = PIPELINE_STAGES.map(({ key, label }) => {
    const info = steps[key] || {};
    return {
      id: key,
      name: label,
      status: resultToStatus(info.result || info.status),
      result: info.result || info.status || "",
      detail: info.detail || "",
    };
  });

  let vuln_breakdown = raw.vuln_breakdown || null;
  if (!vuln_breakdown && raw.findings?.Results) {
    const allVulns = [];
    (raw.findings.Results || []).forEach((r) => {
      (r.Vulnerabilities || []).forEach((v) => allVulns.push(v));
    });
    const fixable = allVulns.filter((v) => v.FixedVersion);
    vuln_breakdown = {
      total: allVulns.length,
      fixable_count: fixable.length,
      app_count: allVulns.filter((v) => v.Type === "gobinary" || v.Type === "pip").length,
      base_image_count: allVulns.filter((v) => !v.FixedVersion).length,
      fixable_details: fixable.slice(0, 6).map((v) => ({
        id: v.VulnerabilityID,
        package: v.PkgName,
        severity: v.Severity,
        fix: v.FixedVersion || "-",
        cvss: v.CVSS ? Math.max(...Object.values(v.CVSS).map((c) => c.V3Score || c.V2Score || 0)) : 0,
      })),
      base_image_note: allVulns.filter((v) => !v.FixedVersion).length > 8
        ? "Most CVEs originate from the base image."
        : undefined,
    };
  }

  return {
    ...raw,
    pipeline,
    vuln_breakdown,
    ai_confidence: raw.ai_confidence
      ?? (raw.risk_score != null ? Math.min(99, Math.max(60, Math.floor(raw.risk_score * 10))) : null),
    status: raw.status || "complete",
  };
}

// --- Formatters -------------------------------------------------------------
const fmt = (iso) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "-");
const fmtFull = (iso) => (iso
  ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
  : "-");
const relTime = (iso) => {
  if (!iso) return "-";
  const m = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
};

const severityColor = (s) => ({
  CRITICAL: C.red, HIGH: C.amber, MEDIUM: C.blue, LOW: C.inkMid, CLEAN: C.teal, UNKNOWN: C.inkMid,
}[String(s || "").toUpperCase()] || C.inkMid);

const riskColor = (n) => (n >= 7 ? C.red : n >= 4 ? C.amber : C.teal);

const TT = { background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 12, color: C.ink };

// --- Primitive Components ---------------------------------------------------
const EmptyState = ({ text, icon: Icon }) => (
  <div style={{ color: C.inkLow, padding: "48px 0", textAlign: "center", fontSize: 14 }}>
    {Icon && <Icon size={28} style={{ marginBottom: 10, opacity: 0.5 }} />}
    <div>{text}</div>
  </div>
);

const Badge = ({ color, children, small }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 4,
    padding: small ? "2px 8px" : "4px 10px",
    borderRadius: 999, fontSize: small ? 10 : 11, fontWeight: 700,
    background: color + "15", color, border: `1px solid ${color}30`,
    fontFamily: C.mono, whiteSpace: "nowrap",
  }}>{children}</span>
);

const Card = ({ children, glow }) => (
  <div style={{
    background: C.bgCard, borderRadius: 14, border: `1px solid ${glow ? C.tealBord : C.border}`,
    padding: "20px", marginBottom: 16, boxShadow: glow ? `0 0 20px ${C.teal}15` : "none",
  }}>{children}</div>
);

const SectionTitle = ({ children, accent }) => (
  <div style={{
    fontSize: 10, fontWeight: 800, color: accent || C.inkLow,
    letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12,
    display: "flex", alignItems: "center", gap: 6,
  }}>
    {accent && <div style={{ width: 4, height: 12, background: accent, borderRadius: 2 }} />}
    {children}
  </div>
);

const StatusDot = ({ status }) => {
  const color = status === "running" ? C.blue : status === "failed" ? C.red : C.teal;
  return (
    <span style={{
      display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: color,
      animation: status === "running" ? "pulseBlue 1.5s infinite" : "none",
    }} />
  );
};

// Global CSS
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap');
  body { background: ${C.bg}; color: ${C.ink}; font-family: ${C.sans}; }
  .spin { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulseBlue { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 4px; }
`;

if (typeof document !== "undefined" && !document.getElementById("sf-global-css")) {
  const style = document.createElement("style");
  style.id = "sf-global-css";
  style.textContent = GLOBAL_CSS;
  document.head.appendChild(style);
}

// --- Major Components -------------------------------------------------------

const HealthRing = ({ score, size = 120 }) => {
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 75 ? C.teal : score >= 50 ? C.amber : C.red;

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.bgSurface} strokeWidth={10} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex", alignItems: "center",
        justifyContent: "center", flexDirection: "column",
      }}>
        <div style={{ fontSize: 28, fontWeight: 900, fontFamily: C.mono }}>{score}</div>
        <div style={{ fontSize: 9, color, fontWeight: 700, letterSpacing: "0.05em" }}>HEALTH</div>
      </div>
    </div>
  );
};

const RiskBar = ({ score }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <div style={{ flex: 1, height: 6, background: C.bgSurface, borderRadius: 4, overflow: "hidden" }}>
      <div style={{
        width: `${Math.min(100, score * 10)}%`, height: "100%",
        background: riskColor(score), transition: "width 0.6s",
      }} />
    </div>
    <span style={{ fontFamily: C.mono, fontSize: 13, color: riskColor(score) }}>{score}</span>
  </div>
);

const VulnBreakdown = ({ breakdown }) => {
  const [open, setOpen] = useState(false);
  if (!breakdown) return null;

  const { total = 0, fixable_count = 0, fixable_details = [] } = breakdown;
  if (total === 0) return null;

  return (
    <div style={{ marginTop: 12, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", padding: "10px 14px", background: C.bgSurface, border: "none",
          cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center",
          fontSize: 12, color: C.ink,
        }}
      >
        <span>{total} vulnerabilities · {fixable_count} fixable</span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && (
        <div style={{ padding: "12px 14px", background: C.bgCard, fontSize: 13 }}>
          {fixable_details.length === 0 && (
            <div style={{ color: C.inkMid }}>No fixable CVEs in the top findings — most originate from the base image.</div>
          )}
          {fixable_details.map((v, i) => (
            <div key={v.id || i} style={{
              padding: "8px 0",
              borderBottom: i < fixable_details.length - 1 ? `1px solid ${C.border}` : "none",
            }}>
              <Badge color={severityColor(v.severity)} small>{v.severity}</Badge>
              <span style={{ marginLeft: 8, fontFamily: C.mono }}>{v.id}</span>
              <div style={{ color: C.inkMid, marginTop: 4 }}>{v.package} → fix: {v.fix}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Pipeline Stage Nodes
function PipelineMiniNodes({ pipeline }) {
  if (!pipeline?.length) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, margin: "12px 0", overflowX: "auto" }}>
      {pipeline.map((stage, i) => {
        const color = stage.status === "passed" ? C.teal
          : stage.status === "failed" ? C.red
            : stage.status === "running" ? C.blue
              : C.inkMid;
        return (
          <React.Fragment key={stage.id}>
            <div style={{ textAlign: "center", minWidth: 56 }}>
              <div style={{
                width: 26, height: 26, borderRadius: "50%", border: `2px solid ${color}`,
                background: color + "10", margin: "0 auto", display: "flex",
                alignItems: "center", justifyContent: "center", color, fontSize: 13,
              }}>
                {stage.status === "passed" ? <CheckCircle size={14} />
                  : stage.status === "failed" ? <XCircle size={14} />
                    : stage.status === "running" ? <Loader2 size={14} className="spin" />
                      : "·"}
              </div>
              <div style={{ fontSize: 9, color: C.inkMid, marginTop: 4 }}>{stage.name}</div>
            </div>
            {i < pipeline.length - 1 && (
              <div style={{ height: 2, flex: 1, background: C.border, marginTop: 12, minWidth: 12 }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// --- Commit Card -------------------------------------------------------------

const CommitCard = ({ scan, feedback, onFeedback, onOpenWhyBlocked, onOpenDetail }) => {
  const [expanded, setExpanded] = useState(false);
  const blocked = scan.action_taken === "BLOCK";
  const isRunning = scan.status === "running";
  const isTimeout = scan.status === "timeout";
  const accentColor = isRunning ? C.blue : isTimeout ? C.amber : blocked ? C.red : C.teal;
  const myFeedback = feedback?.[scan.id];

  return (
    <div style={{
      background: C.bgCard, borderRadius: 14, border: `1px solid ${C.border}`,
      borderLeft: `4px solid ${accentColor}`, padding: "16px", marginBottom: 12,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
            <span style={{ fontFamily: C.mono, color: C.blue, fontSize: 13 }}>{scan.commit_sha?.slice(0, 8)}</span>
            {isRunning && <Badge color={C.blue}>SCANNING</Badge>}
            {isTimeout && <Badge color={C.amber}>TIMED OUT</Badge>}
            {!isRunning && !isTimeout && <Badge color={blocked ? C.red : C.teal}>{scan.action_taken || "ALLOW"}</Badge>}
            {scan.severity && scan.severity !== "UNKNOWN" && <Badge color={severityColor(scan.severity)}>{scan.severity}</Badge>}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {scan.commit_message || scan.repo_name}
          </div>
          <div style={{ fontSize: 11, color: C.inkMid, display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
            <GitBranch size={11} /> {scan.repo_name} · {scan.branch} · {relTime(scan.created_at || scan.started_at)}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          {blocked && (
            <button
              onClick={() => onOpenWhyBlocked(scan)}
              style={{
                padding: "6px 12px", borderRadius: 8, background: C.redSoft,
                border: `1px solid ${C.redBord}`, color: C.red, fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}
            >
              Why blocked?
            </button>
          )}
          <button
            onClick={() => setExpanded((e) => !e)}
            style={{
              padding: "6px 12px", borderRadius: 8, background: C.bgSurface,
              border: `1px solid ${C.border}`, color: C.ink, fontSize: 12, cursor: "pointer",
            }}
          >
            {expanded ? "Hide" : "Details"}
          </button>
        </div>
      </div>

      <PipelineMiniNodes pipeline={scan.pipeline} />

      {isRunning && (
        <div style={{
          marginTop: 4, padding: "8px 14px", background: C.blueSoft, borderRadius: 8,
          border: `1px solid ${C.blue}30`, fontSize: 12, color: C.blue,
        }}>
          Pipeline in progress — auto-refreshing live
        </div>
      )}

      {expanded && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
          {scan.pipeline.map((stage) => (
            <div key={stage.id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13 }}>
              <span style={{ color: C.inkMid }}>{stage.name}</span>
              <span style={{ color: stage.status === "failed" ? C.red : stage.status === "passed" ? C.teal : C.inkLow }}>
                {stage.result || stage.status}
              </span>
            </div>
          ))}

          {scan.vuln_breakdown && <VulnBreakdown breakdown={scan.vuln_breakdown} />}

          {scan.ai_explanation && (
            <div style={{
              marginTop: 12, padding: 14, background: C.violetSoft, borderRadius: 10,
              border: `1px solid ${C.violetBord}`, fontSize: 13, lineHeight: 1.5,
            }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center", color: C.violet, fontWeight: 700, marginBottom: 6, fontSize: 11 }}>
                <Zap size={12} /> AI ANALYSIS
              </div>
              {scan.ai_explanation}
            </div>
          )}

          {!isRunning && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>
              <span style={{ fontSize: 11, color: C.inkLow }}>Was this assessment accurate?</span>
              <button
                onClick={() => onFeedback(scan.id, "accept")}
                style={{
                  display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 8,
                  background: myFeedback === "accept" ? C.greenSoft : C.bgSurface,
                  border: `1px solid ${myFeedback === "accept" ? C.green : C.border}`,
                  color: myFeedback === "accept" ? C.green : C.inkMid, fontSize: 12, cursor: "pointer",
                }}
              >
                <ThumbsUp size={12} /> Accurate
              </button>
              <button
                onClick={() => onFeedback(scan.id, "reject")}
                style={{
                  display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 8,
                  background: myFeedback === "reject" ? C.redSoft : C.bgSurface,
                  border: `1px solid ${myFeedback === "reject" ? C.red : C.border}`,
                  color: myFeedback === "reject" ? C.red : C.inkMid, fontSize: 12, cursor: "pointer",
                }}
              >
                <ThumbsDown size={12} /> Incorrect
              </button>
            </div>
          )}

          {onOpenDetail && (
            <button
              onClick={() => onOpenDetail(scan)}
              style={{
                marginTop: 14, width: "100%", padding: "10px", borderRadius: 8, background: "transparent",
                border: `1px solid ${C.border}`, color: C.inkMid, fontSize: 12, cursor: "pointer",
              }}
            >
              Open full detail panel
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// Why Blocked Modal
const WhyBlockedModal = ({ scan, onClose }) => {
  if (!scan) return null;
  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 200,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: C.bgCard, padding: 24, borderRadius: 16, maxWidth: 500, width: "100%",
          border: `1px solid ${C.redBord}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.red, marginBottom: 12 }}>
          <AlertTriangle size={20} />
          <h2 style={{ margin: 0, fontSize: 17 }}>Why was this blocked?</h2>
        </div>
        <div style={{ fontSize: 13, color: C.inkMid, marginBottom: 10, fontFamily: C.mono }}>
          {scan.repo_name} · {scan.commit_sha?.slice(0, 8)}
        </div>
        <p style={{ lineHeight: 1.6, color: C.ink }}>{scan.ai_explanation || "Policy violation detected."}</p>
        <button
          onClick={onClose}
          style={{
            marginTop: 20, padding: "10px 20px", background: C.red, color: "white",
            border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600,
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
};

// Scan Detail Slide-in
function ScanDetail({ scan, onClose, feedback, onFeedback, onWhyBlocked }) {
  if (!scan) return null;
  return (
    <div style={{
      position: "fixed", top: 0, right: 0, width: 460, maxWidth: "100vw", height: "100vh",
      background: C.bgCard, borderLeft: `1px solid ${C.border}`, zIndex: 250,
      overflowY: "auto", padding: 24,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>{scan.repo_name}</h2>
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", color: C.inkMid, fontSize: 20, cursor: "pointer" }}
        >
          ×
        </button>
      </div>
      <div style={{ fontFamily: C.mono, color: C.blue, fontSize: 13, marginBottom: 4 }}>{scan.commit_sha}</div>
      <div style={{ fontSize: 13, color: C.inkMid, marginBottom: 16 }}>{scan.commit_message}</div>
      <PipelineMiniNodes pipeline={scan.pipeline} />
      {scan.vuln_breakdown && <VulnBreakdown breakdown={scan.vuln_breakdown} />}
      {scan.ai_explanation && (
        <div style={{
          marginTop: 12, padding: 14, background: C.violetSoft, borderRadius: 10,
          border: `1px solid ${C.violetBord}`, fontSize: 13, lineHeight: 1.5,
        }}>
          {scan.ai_explanation}
        </div>
      )}
      {scan.action_taken === "BLOCK" && (
        <button
          onClick={() => onWhyBlocked(scan)}
          style={{
            background: C.red, color: "white", padding: "12px", width: "100%",
            borderRadius: 10, marginTop: 20, border: "none", cursor: "pointer", fontWeight: 600,
          }}
        >
          Why Blocked?
        </button>
      )}
    </div>
  );
}

// --- AI Copilot side panel ----------------------------------------------------

function AICopilot({ scans }) {
  const blocked = scans.filter((s) => s.action_taken === "BLOCK");
  const running = scans.filter((s) => s.status === "running");
  const recentWithAI = scans.filter((s) => s.ai_explanation).slice(0, 5);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <Sparkles size={18} color={C.teal} />
        <h3 style={{ margin: 0, fontSize: 16 }}>AI Copilot</h3>
      </div>

      <Card>
        <SectionTitle accent={C.teal}>Right now</SectionTitle>
        <div style={{ fontSize: 13, lineHeight: 1.6, color: C.ink }}>
          {running.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <StatusDot status="running" /> <strong>{running.length}</strong> pipeline{running.length > 1 ? "s" : ""} currently scanning.
            </div>
          )}
          {blocked.length > 0 ? (
            <div>
              <Flame size={13} color={C.red} style={{ verticalAlign: "middle", marginRight: 4 }} />
              <strong style={{ color: C.red }}>{blocked.length}</strong> commit{blocked.length > 1 ? "s" : ""} currently blocked. Review the "Why blocked?" reason on each before merging.
            </div>
          ) : (
            <div style={{ color: C.inkMid }}>No active blocks. Pipeline is clear.</div>
          )}
        </div>
      </Card>

      <Card>
        <SectionTitle accent={C.violet}>Recent AI findings</SectionTitle>
        {recentWithAI.length === 0 && <EmptyState text="No AI analysis yet — findings appear here once a scan with vulnerabilities completes." />}
        {recentWithAI.map((s) => (
          <div key={s.id} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${C.border}`, fontSize: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontFamily: C.mono, color: C.blue }}>{s.commit_sha?.slice(0, 8)}</span>
              <span style={{ color: C.inkLow }}>{relTime(s.created_at)}</span>
            </div>
            <div style={{ color: C.inkMid, lineHeight: 1.5 }}>
              {s.ai_explanation.length > 140 ? `${s.ai_explanation.slice(0, 140)}…` : s.ai_explanation}
            </div>
          </div>
        ))}
      </Card>

      <Card>
        <SectionTitle accent={C.amber}>Ask about your pipeline</SectionTitle>
        <div style={{ fontSize: 12, color: C.inkMid, lineHeight: 1.6 }}>
          Live Q&A isn't wired up yet — this panel currently summarizes what the policy engine
          and scanners have already found. Hook this up to your AI fallback chain
          (Groq → Gemini → Ollama) to answer free-form questions about specific commits.
        </div>
      </Card>
    </div>
  );
}

// --- Tabs ---------------------------------------------------------------------

function OverviewTab({ scans, healthScore, avgRisk, blocked, allowed, running }) {
  const recentForChart = useMemo(() => {
    return [...scans]
      .filter((s) => s.status !== "running")
      .slice(0, 14)
      .reverse()
      .map((s) => ({
        name: s.commit_sha?.slice(0, 6) || "-",
        risk: s.risk_score || 0,
      }));
  }, [scans]);

  const actionSplit = [
    { name: "Allowed", value: allowed.length, color: C.teal },
    { name: "Blocked", value: blocked.length, color: C.red },
  ];

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)", gap: 16, marginBottom: 16 }}>
        <Card>
          <SectionTitle accent={C.teal}>Pipeline health</SectionTitle>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <HealthRing score={healthScore} size={96} />
            <div style={{ fontSize: 12, color: C.inkMid, lineHeight: 1.6 }}>
              Based on block rate and average risk score across all completed scans.
            </div>
          </div>
        </Card>

        <Card>
          <SectionTitle accent={C.amber}>Average risk</SectionTitle>
          <div style={{ fontSize: 32, fontWeight: 900, fontFamily: C.mono, color: riskColor(parseFloat(avgRisk)) }}>
            {avgRisk}<span style={{ fontSize: 14, color: C.inkLow }}>/10</span>
          </div>
          <div style={{ marginTop: 10 }}>
            <RiskBar score={parseFloat(avgRisk)} />
          </div>
        </Card>

        <Card>
          <SectionTitle accent={C.blue}>Allow vs block</SectionTitle>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <ResponsiveContainer width={90} height={90}>
              <PieChart>
                <Pie data={actionSplit} dataKey="value" innerRadius={28} outerRadius={42} paddingAngle={3}>
                  {actionSplit.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div style={{ fontSize: 12 }}>
              <div style={{ color: C.teal, fontWeight: 700 }}>{allowed.length} allowed</div>
              <div style={{ color: C.red, fontWeight: 700, marginTop: 4 }}>{blocked.length} blocked</div>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <SectionTitle accent={C.violet}>Risk score — last {recentForChart.length} runs</SectionTitle>
        {recentForChart.length === 0 ? (
          <EmptyState text="No completed runs yet." />
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={recentForChart}>
              <defs>
                <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.violet} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={C.violet} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
              <XAxis dataKey="name" stroke={C.inkLow} fontSize={10} />
              <YAxis stroke={C.inkLow} fontSize={10} domain={[0, 10]} />
              <Tooltip contentStyle={TT} />
              <Area type="monotone" dataKey="risk" stroke={C.violet} fill="url(#riskGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>

      <SectionTitle accent={C.teal}>Latest activity</SectionTitle>
      {scans.slice(0, 5).map((scan) => (
        <CommitCard
          key={scan.id}
          scan={scan}
          onFeedback={() => {}}
          onOpenWhyBlocked={() => {}}
        />
      ))}
    </div>
  );
}

function PipelineTab({ scans, onOpenWhyBlocked, feedback, onFeedback, onOpenDetail }) {
  const running = scans.filter((s) => s.status === "running");
  const recent = scans.filter((s) => s.status !== "running").slice(0, 20);

  return (
    <div>
      {running.length > 0 && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <StatusDot status="running" />
            <span style={{ fontSize: 11, fontWeight: 800, color: C.blue, letterSpacing: "0.08em" }}>
              LIVE — {running.length} RUNNING
            </span>
          </div>
          {running.map((scan) => (
            <CommitCard
              key={scan.id}
              scan={scan}
              feedback={feedback}
              onFeedback={onFeedback}
              onOpenWhyBlocked={onOpenWhyBlocked}
              onOpenDetail={onOpenDetail}
            />
          ))}
          <div style={{ height: 1, background: C.border, margin: "20px 0" }} />
        </>
      )}

      <SectionTitle accent={C.teal}>Recent runs</SectionTitle>
      {recent.length === 0 && <EmptyState text="No completed pipeline runs yet." icon={GitPullRequest} />}
      {recent.map((scan) => (
        <CommitCard
          key={scan.id}
          scan={scan}
          feedback={feedback}
          onFeedback={onFeedback}
          onOpenWhyBlocked={onOpenWhyBlocked}
          onOpenDetail={onOpenDetail}
        />
      ))}
    </div>
  );
}

function ScanFeedTab({ scans, onOpenWhyBlocked, feedback, onFeedback, onOpenDetail }) {
  const [filter, setFilter] = useState("all");

  const filtered = scans.filter((s) => {
    if (filter === "all") return true;
    if (filter === "blocked") return s.action_taken === "BLOCK";
    if (filter === "allowed") return s.action_taken === "ALLOW";
    if (filter === "running") return s.status === "running";
    return true;
  });

  const filters = [
    { id: "all", label: "All" },
    { id: "allowed", label: "Allowed" },
    { id: "blocked", label: "Blocked" },
    { id: "running", label: "Running" },
  ];

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            style={{
              padding: "6px 14px", borderRadius: 999, fontSize: 12, cursor: "pointer",
              background: filter === f.id ? C.tealSoft : C.bgSurface,
              border: `1px solid ${filter === f.id ? C.tealBord : C.border}`,
              color: filter === f.id ? C.teal : C.inkMid, fontWeight: 600,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 && <EmptyState text="No scans match this filter." icon={ListChecks} />}
      {filtered.map((scan) => (
        <CommitCard
          key={scan.id}
          scan={scan}
          feedback={feedback}
          onFeedback={onFeedback}
          onOpenWhyBlocked={onOpenWhyBlocked}
          onOpenDetail={onOpenDetail}
        />
      ))}
    </div>
  );
}

function MetricsTab({ scans }) {
  const completed = scans.filter((s) => s.status !== "running");

  const severityCounts = useMemo(() => {
    const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, CLEAN: 0 };
    completed.forEach((s) => {
      const sev = (s.severity || "CLEAN").toUpperCase();
      if (counts[sev] !== undefined) counts[sev] += 1;
    });
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value, color: severityColor(name) }));
  }, [completed]);

  const dailyVolume = useMemo(() => {
    const byDay = {};
    completed.forEach((s) => {
      const day = fmt(s.created_at);
      byDay[day] = (byDay[day] || 0) + 1;
    });
    return Object.entries(byDay).map(([name, count]) => ({ name, count })).slice(-10);
  }, [completed]);

  const blockRate = completed.length
    ? ((completed.filter((s) => s.action_taken === "BLOCK").length / completed.length) * 100).toFixed(0)
    : "0";

  const avgConfidence = useMemo(() => {
    const withConf = completed.filter((s) => s.ai_confidence != null);
    if (!withConf.length) return null;
    return Math.round(withConf.reduce((a, s) => a + s.ai_confidence, 0) / withConf.length);
  }, [completed]);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 16, marginBottom: 16 }}>
        <Card>
          <SectionTitle accent={C.red}>Block rate</SectionTitle>
          <div style={{ fontSize: 32, fontWeight: 900, fontFamily: C.mono, color: C.red }}>{blockRate}%</div>
          <div style={{ fontSize: 11, color: C.inkLow, marginTop: 4 }}>of {completed.length} completed scans</div>
        </Card>
        <Card>
          <SectionTitle accent={C.violet}>AI confidence</SectionTitle>
          <div style={{ fontSize: 32, fontWeight: 900, fontFamily: C.mono, color: C.violet }}>
            {avgConfidence != null ? `${avgConfidence}%` : "—"}
          </div>
          <div style={{ fontSize: 11, color: C.inkLow, marginTop: 4 }}>average across AI-analyzed scans</div>
        </Card>
        <Card>
          <SectionTitle accent={C.teal}>Total scans</SectionTitle>
          <div style={{ fontSize: 32, fontWeight: 900, fontFamily: C.mono, color: C.teal }}>{completed.length}</div>
          <div style={{ fontSize: 11, color: C.inkLow, marginTop: 4 }}>all-time completed</div>
        </Card>
      </div>

      <Card>
        <SectionTitle accent={C.amber}>Severity distribution</SectionTitle>
        {severityCounts.length === 0 ? (
          <EmptyState text="No severity data yet." />
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={severityCounts}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
              <XAxis dataKey="name" stroke={C.inkLow} fontSize={10} />
              <YAxis stroke={C.inkLow} fontSize={10} allowDecimals={false} />
              <Tooltip contentStyle={TT} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {severityCounts.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card>
        <SectionTitle accent={C.blue}>Scan volume by day</SectionTitle>
        {dailyVolume.length === 0 ? (
          <EmptyState text="No scan history yet." />
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={dailyVolume}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
              <XAxis dataKey="name" stroke={C.inkLow} fontSize={10} />
              <YAxis stroke={C.inkLow} fontSize={10} allowDecimals={false} />
              <Tooltip contentStyle={TT} />
              <Bar dataKey="count" fill={C.blue} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  );
}

// --- Main App Component -----------------------------------------------------

export default function App() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedScan, setSelectedScan] = useState(null);
  const [whyBlockedScan, setWhyBlockedScan] = useState(null);
  const [showCopilot, setShowCopilot] = useState(false);
  const [feedback, setFeedback] = useState({});

  const fetchScans = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND}/api/scan-results`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      const normalised = Array.isArray(data) ? data.map(normaliseScan) : [];
      setScans(normalised);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // WebSocket + polling fallback
  useEffect(() => {
    let ws;
    let pollInterval;
    let reconnectTimer;

    const connectWS = () => {
      const WS_URL = BACKEND.replace(/^http/, "ws") + "/ws/scans";
      ws = new WebSocket(WS_URL);

      ws.onopen = () => console.log("WebSocket connected");
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "ping") return; // keepalive only, no need to refetch
        } catch {
          // fall through to refetch if message wasn't parseable
        }
        fetchScans();
      };
      ws.onclose = () => {
        reconnectTimer = setTimeout(connectWS, 4000);
      };
      ws.onerror = () => ws.close();
    };

    connectWS();
    pollInterval = setInterval(fetchScans, 12000);
    fetchScans();

    return () => {
      clearInterval(pollInterval);
      clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, [fetchScans]);

  const submitFeedback = useCallback(async (scanId, type) => {
    setFeedback((prev) => ({ ...prev, [scanId]: type }));
    try {
      await fetch(`${BACKEND}/api/scan-results/${scanId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: type === "accept" ? "accurate" : "incorrect" }),
      });
    } catch (e) {
      console.warn("Feedback failed", e);
    }
  }, []);

  // Derived stats
  const running = scans.filter((s) => s.status === "running");
  const completed = scans.filter((s) => s.status !== "running");
  const blocked = completed.filter((s) => s.action_taken === "BLOCK");
  const allowed = completed.filter((s) => s.action_taken === "ALLOW");

  const avgRisk = completed.length
    ? (completed.reduce((a, s) => a + (s.risk_score || 0), 0) / completed.length).toFixed(1)
    : "0";

  const healthScore = Math.max(0, Math.min(100,
    Math.round(100 - (blocked.length / (completed.length || 1)) * 40 - parseFloat(avgRisk) * 6)));

  return (
    <>
      {whyBlockedScan && <WhyBlockedModal scan={whyBlockedScan} onClose={() => setWhyBlockedScan(null)} />}

      <div style={{ minHeight: "100vh", background: C.bg, color: C.ink, fontFamily: C.sans }}>
        <header style={{
          position: "sticky", top: 0, zIndex: 100, background: "rgba(8,12,16,0.95)",
          backdropFilter: "blur(12px)", borderBottom: `1px solid ${C.border}`, padding: "12px 24px",
          display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Shield size={22} color={C.teal} />
            <span style={{ fontSize: 18, fontWeight: 800 }}>SecureFlow</span>
          </div>

          <nav style={{ display: "flex", gap: 8 }}>
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: "8px 16px", borderRadius: 8,
                    background: isActive ? C.bgSurface : "transparent",
                    border: isActive ? `1px solid ${C.teal}` : "1px solid transparent",
                    color: isActive ? C.ink : C.inkMid,
                    display: "flex", alignItems: "center", gap: 6, fontWeight: 600, cursor: "pointer",
                  }}
                >
                  <Icon size={16} /> {tab.label}
                </button>
              );
            })}
          </nav>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
            {running.length > 0 && (
              <Badge color={C.blue}>{running.length} running</Badge>
            )}
            <button
              onClick={() => setShowCopilot(!showCopilot)}
              style={{
                padding: "6px 14px", borderRadius: 8, cursor: "pointer",
                background: showCopilot ? C.tealSoft : C.bgSurface, border: `1px solid ${C.tealBord}`,
                color: C.teal, display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600,
              }}
            >
              <Sparkles size={16} /> AI Copilot
            </button>
            <button
              onClick={fetchScans}
              title="Refresh now"
              style={{ padding: 8, background: "none", border: "none", color: C.inkMid, cursor: "pointer" }}
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </header>

        <main style={{ padding: "24px", maxWidth: 1400, margin: "0 auto" }}>
          {loading ? (
            <EmptyState text="Loading scans…" icon={Loader2} />
          ) : (
            <>
              {activeTab === "overview" && (
                <OverviewTab
                  scans={scans}
                  healthScore={healthScore}
                  avgRisk={avgRisk}
                  blocked={blocked}
                  allowed={allowed}
                  running={running}
                />
              )}
              {activeTab === "pipeline" && (
                <PipelineTab
                  scans={scans}
                  feedback={feedback}
                  onFeedback={submitFeedback}
                  onOpenWhyBlocked={setWhyBlockedScan}
                  onOpenDetail={setSelectedScan}
                />
              )}
              {activeTab === "feed" && (
                <ScanFeedTab
                  scans={scans}
                  feedback={feedback}
                  onFeedback={submitFeedback}
                  onOpenWhyBlocked={setWhyBlockedScan}
                  onOpenDetail={setSelectedScan}
                />
              )}
              {activeTab === "metrics" && <MetricsTab scans={scans} />}
            </>
          )}
        </main>
      </div>

      {selectedScan && (
        <ScanDetail
          scan={selectedScan}
          onClose={() => setSelectedScan(null)}
          feedback={feedback}
          onFeedback={submitFeedback}
          onWhyBlocked={setWhyBlockedScan}
        />
      )}

      {showCopilot && (
        <div style={{
          position: "fixed", right: 0, top: 0, width: 360, maxWidth: "100vw", height: "100vh",
          background: C.bgCard, borderLeft: `1px solid ${C.border}`, zIndex: 300, padding: 20, overflowY: "auto",
        }}>
          <AICopilot scans={scans} />
        </div>
      )}
    </>
  );
}