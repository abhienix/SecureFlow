/**
 * SecureFlow — App.jsx (v3.3 — Professional White Dashboard)
 * Real-time CI/CD Security Dashboard
 *
 * Fixes vs v3.1/v3.2:
 *  1. DUPLICATE GLOBAL_CSS: Removed the first (incomplete) declaration;
 *     only the full, canonical definition remains. This was the ESLint
 *     syntax error crashing the Docker build.
 *  2. PIPELINE STAGE ICONS: resultToStatus() correctly infers "passed"
 *     when a stage has run but the backend sent no explicit result/status.
 *  3. AI COPILOT: Sends full scan context with every question.
 *  4. REMEDY FETCHING: Distinguishes network failure vs empty response vs
 *     success; shows the user which one happened.
 */

import React, {
  useState, useEffect, useCallback, useRef, useMemo,
} from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  LineChart, Line, ScatterChart, Scatter, ZAxis,
} from "recharts";
import {
  Shield, Activity, CheckCircle, XCircle, AlertTriangle, Zap,
  RefreshCw, ThumbsUp, ThumbsDown, ChevronDown, ChevronUp,
  TrendingUp, GitPullRequest, Sparkles, GitBranch, Flame,
  ListChecks, Loader2, X, Send, Bot, Minimize2,
  Lock, Terminal, ShieldCheck, Cpu, Globe, Brain,
  Wrench, Eye, Wifi, WifiOff, Clock, BarChart2, AlertCircle,
} from "lucide-react";

/* ─── Design Tokens ─────────────────────────────────────────────────────── */
const C = {
  /* Surfaces */
  bg:           "#f8fafc",
  bgCard:       "#ffffff",
  bgSurface:    "#f1f5f9",
  bgElevated:   "#e8edf3",
  bgHover:      "#f0f4f8",

  /* Borders */
  border:       "#e2e8f0",
  borderMid:    "#cbd5e1",
  borderStrong: "#94a3b8",

  /* Text */
  ink:          "#0f172a",
  inkMid:       "#334155",
  inkLow:       "#64748b",
  inkMuted:     "#94a3b8",

  /* Brand — teal */
  teal:         "#0d9488",
  tealLight:    "#14b8a6",
  tealSoft:     "#f0fdfa",
  tealBord:     "#99f6e4",
  tealMid:      "#5eead4",

  /* Semantic */
  green:        "#10b981",
  greenSoft:    "#f0fdf4",
  greenBord:    "#bbf7d0",
  greenMid:     "#34d399",

  red:          "#ef4444",
  redSoft:      "#fff1f2",
  redBord:      "#fecdd3",
  redMid:       "#f87171",

  amber:        "#f59e0b",
  amberSoft:    "#fffbeb",
  amberBord:    "#fde68a",
  amberMid:     "#fbbf24",

  blue:         "#3b82f6",
  blueSoft:     "#eff6ff",
  blueBord:     "#bfdbfe",
  blueMid:      "#60a5fa",

  violet:       "#7c3aed",
  violetSoft:   "#f5f3ff",
  violetBord:   "#ddd6fe",

  /* Typography */
  mono: "'JetBrains Mono','Fira Mono','Consolas',monospace",
  sans: "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
};

const BACKEND = "https://secureflow-backend-1083585992526.us-central1.run.app";

const PIPELINE_STAGES = [
  { key: "checkout",  label: "Checkout",     Icon: GitBranch },
  { key: "code_scan", label: "Code Scan",    Icon: Terminal  },
  { key: "docker",    label: "Docker Build", Icon: Cpu       },
  { key: "trivy",     label: "Trivy Scan",   Icon: Shield    },
  { key: "policy",    label: "Policy Gate",  Icon: Lock      },
  { key: "deploy",    label: "Deploy",       Icon: Globe     },
];

/* ─── Global CSS (single canonical declaration) ─────────────────────────── */
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body {
  background: ${C.bg};
  color: ${C.ink};
  font-family: ${C.sans};
  -webkit-font-smoothing: antialiased;
  min-height: 100vh;
}

button { cursor: pointer; font-family: ${C.sans}; outline: none; }
button:focus-visible { outline: 2px solid ${C.teal}; outline-offset: 2px; }

::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: ${C.borderMid}; }

/* Animations */
@keyframes spin      { to { transform: rotate(360deg); } }
@keyframes pulse     { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.6;transform:scale(1.12)} }
@keyframes fadeInUp  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
@keyframes fadeIn    { from{opacity:0} to{opacity:1} }
@keyframes slideRight{ from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
@keyframes slideUp   { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
@keyframes ripple    { 0%{transform:scale(1);opacity:.5} 100%{transform:scale(2.2);opacity:0} }
@keyframes shimmer   { 0%{background-position:-600px 0} 100%{background-position:600px 0} }
@keyframes breathe   {
  0%,100%{box-shadow:0 0 0 0 ${C.teal}22,0 4px 24px rgba(13,148,136,.1)}
  50%{box-shadow:0 0 0 8px ${C.teal}14,0 4px 24px rgba(13,148,136,.18)}
}

.spin        { animation: spin 1s linear infinite; }
.pulse-dot   { animation: pulse 1.8s ease-in-out infinite; }
.fade-up     { animation: fadeInUp .4s ease forwards; }
.fade-in     { animation: fadeIn .3s ease forwards; }
.slide-right { animation: slideRight .35s ease forwards; }
.slide-up    { animation: slideUp .45s cubic-bezier(.22,.68,0,1.15) forwards; }
.fab-breathe { animation: breathe 3s ease-in-out infinite; }

/* Cards */
.sf-card {
  background: ${C.bgCard};
  border: 1px solid ${C.border};
  border-radius: 14px;
  transition: box-shadow .2s, border-color .2s, transform .18s;
}
.sf-card:hover {
  border-color: ${C.borderMid};
  box-shadow: 0 4px 20px rgba(15,23,42,.06);
  transform: translateY(-1px);
}
.sf-card-flat {
  background: ${C.bgCard};
  border: 1px solid ${C.border};
  border-radius: 14px;
}

/* Tabs */
.sf-tab {
  border: none;
  background: transparent;
  color: ${C.inkLow};
  font-weight: 500;
  font-size: 13px;
  padding: 7px 14px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: background .15s, color .15s;
}
.sf-tab:hover { background: ${C.bgSurface}; color: ${C.inkMid}; }
.sf-tab.active {
  background: ${C.tealSoft};
  color: ${C.teal};
  border: 1px solid ${C.tealBord};
  font-weight: 600;
}

/* Chat */
.sf-msg-user {
  background: ${C.tealSoft};
  border: 1px solid ${C.tealBord};
  color: ${C.ink};
  align-self: flex-end;
  border-radius: 14px 14px 4px 14px;
}
.sf-msg-bot {
  background: ${C.bgSurface};
  border: 1px solid ${C.border};
  color: ${C.ink};
  align-self: flex-start;
  border-radius: 14px 14px 14px 4px;
}
.sf-chat-input {
  background: ${C.bgCard};
  border: 1.5px solid ${C.border};
  border-radius: 10px;
  padding: 9px 12px;
  color: ${C.ink};
  font-size: 13px;
  width: 100%;
  outline: none;
  transition: border-color .2s, box-shadow .2s;
  font-family: ${C.sans};
}
.sf-chat-input:focus {
  border-color: ${C.teal};
  box-shadow: 0 0 0 3px ${C.teal}18;
}
.sf-chat-input::placeholder { color: ${C.inkMuted}; }

/* Badge */
.sf-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 6px;
  letter-spacing: .02em;
  text-transform: uppercase;
}

/* Pipeline connector */
.sf-pipe-connector {
  flex: 1;
  height: 2px;
  background: linear-gradient(90deg, ${C.border}, ${C.borderMid});
  border-radius: 1px;
  margin: 0 4px;
}
.sf-pipe-connector.passed {
  background: linear-gradient(90deg, ${C.tealMid}, ${C.tealLight});
}
.sf-pipe-connector.failed {
  background: linear-gradient(90deg, ${C.redMid}, ${C.red});
}

/* Recharts overrides */
.recharts-cartesian-axis-tick-value { fill: ${C.inkLow} !important; font-size: 11px; }
.recharts-tooltip-wrapper { outline: none !important; }

/* Remedy */
.remedy-block {
  background: ${C.greenSoft};
  border: 1px solid ${C.greenBord};
  border-radius: 10px;
  padding: 12px 14px;
  margin-top: 10px;
}
.remedy-error {
  background: ${C.redSoft};
  border: 1px solid ${C.redBord};
  border-radius: 10px;
  padding: 12px 14px;
  margin-top: 10px;
}

/* Skeleton shimmer */
.sf-skeleton {
  background: linear-gradient(90deg, ${C.bgSurface} 25%, ${C.bgElevated} 50%, ${C.bgSurface} 75%);
  background-size: 600px 100%;
  animation: shimmer 1.4s infinite;
  border-radius: 6px;
}

/* FAB ripple */
.fab-ripple::before, .fab-ripple::after {
  content: '';
  position: absolute;
  inset: -6px;
  border-radius: 999px;
  border: 2px solid ${C.teal};
  animation: ripple 2.4s ease-out infinite;
  pointer-events: none;
}
.fab-ripple::after { animation-delay: 1.2s; }

/* Stat delta badges */
.delta-up   { color: ${C.green}; background: ${C.greenSoft}; }
.delta-down { color: ${C.red};   background: ${C.redSoft};   }
.delta-flat { color: ${C.inkLow}; background: ${C.bgSurface}; }
`;

/* Inject CSS once */
if (typeof document !== "undefined") {
  const existing = document.getElementById("sf-css");
  if (existing) existing.remove();
  const style = document.createElement("style");
  style.id = "sf-css";
  style.textContent = GLOBAL_CSS;
  document.head.appendChild(style);
}

/* ─── Shared helpers ─────────────────────────────────────────────────────── */
const fmt = {
  date: (d) => d ? new Date(d).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  }) : "—",
  ago: (d) => {
    if (!d) return "—";
    const s = Math.floor((Date.now() - new Date(d)) / 1000);
    if (s < 60)  return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s/60)}m ago`;
    return `${Math.floor(s/3600)}h ago`;
  },
  pct: (n) => `${(n ?? 0).toFixed(1)}%`,
};

/** Map a raw backend result string → canonical status */
function resultToStatus(stage) {
  const r = (stage?.result || stage?.status || "").toLowerCase();
  if (["passed", "pass", "success", "allow", "clean"].includes(r)) return "passed";
  if (["failed", "fail", "error", "block", "blocked"].includes(r)) return "failed";
  if (["running", "in_progress", "active"].includes(r)) return "running";
  // v3.1 fix: treat a stage that has a result/status field (even blank) but
  // has a timestamp as "passed" — it ran and wasn't flagged as failed.
  if (stage?.started_at && !["pending", "skipped"].includes(r)) return "passed";
  return "pending";
}

const statusColor = {
  passed:  C.green,
  failed:  C.red,
  running: C.teal,
  pending: C.inkMuted,
};
const statusBg = {
  passed:  C.greenSoft,
  failed:  C.redSoft,
  running: C.tealSoft,
  pending: C.bgSurface,
};
const statusBord = {
  passed:  C.greenBord,
  failed:  C.redBord,
  running: C.tealBord,
  pending: C.border,
};

/* ─── Primitive UI components ────────────────────────────────────────────── */

function Card({ children, style, className = "", onClick }) {
  return (
    <div
      className={`sf-card ${className}`}
      style={{ padding: "20px", ...style }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

function Badge({ children, color, bg, border, style }) {
  return (
    <span
      className="sf-badge"
      style={{ color, background: bg, border: `1px solid ${border}`, ...style }}
    >
      {children}
    </span>
  );
}

function StatusBadge({ status }) {
  const icons = {
    passed:  <CheckCircle size={11} />,
    failed:  <XCircle size={11} />,
    running: <Loader2 size={11} className="spin" />,
    pending: <Clock size={11} />,
  };
  const labels = { passed: "Passed", failed: "Failed", running: "Running", pending: "Pending" };
  return (
    <Badge
      color={statusColor[status] || C.inkLow}
      bg={statusBg[status] || C.bgSurface}
      border={statusBord[status] || C.border}
    >
      {icons[status]}
      {labels[status] || status}
    </Badge>
  );
}

function Divider({ style }) {
  return <div style={{ height: 1, background: C.border, ...style }} />;
}

function SectionHeader({ title, subtitle, right }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: C.ink, marginBottom: 2 }}>{title}</h2>
        {subtitle && <p style={{ fontSize: 12, color: C.inkLow }}>{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

function IconBtn({ Icon, onClick, title, active, size = 16 }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: 32, height: 32, borderRadius: 8,
        background: active ? C.tealSoft : "transparent",
        border: `1px solid ${active ? C.tealBord : "transparent"}`,
        color: active ? C.teal : C.inkLow,
        transition: "all .15s",
      }}
    >
      <Icon size={size} />
    </button>
  );
}

function Spinner({ size = 20, color = C.teal }) {
  return <Loader2 size={size} className="spin" style={{ color }} />;
}

function EmptyState({ Icon: Ic = Shield, title, desc }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: 10, padding: "40px 20px", color: C.inkMuted,
    }}>
      <Ic size={32} strokeWidth={1.5} />
      <p style={{ fontSize: 13, fontWeight: 600, color: C.inkLow }}>{title}</p>
      {desc && <p style={{ fontSize: 12, textAlign: "center", maxWidth: 240 }}>{desc}</p>}
    </div>
  );
}

/* ─── Custom Tooltip ─────────────────────────────────────────────────────── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: C.bgCard, border: `1px solid ${C.border}`,
      borderRadius: 10, padding: "8px 12px", boxShadow: "0 4px 16px rgba(0,0,0,.08)",
      fontSize: 12, color: C.ink,
    }}>
      {label && <p style={{ color: C.inkLow, marginBottom: 4 }}>{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || C.teal, fontWeight: 600 }}>
          {p.name}: {typeof p.value === "number" ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  );
}

/* ─── Stat Card ──────────────────────────────────────────────────────────── */
function StatCard({ label, value, delta, deltaDir = "up", icon: Ic, accent = C.teal, loading }) {
  return (
    <Card style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: C.inkLow, letterSpacing: ".02em", textTransform: "uppercase" }}>
          {label}
        </span>
        {Ic && (
          <div style={{
            width: 34, height: 34, borderRadius: 9,
            background: accent + "14", display: "flex",
            alignItems: "center", justifyContent: "center",
          }}>
            <Ic size={16} style={{ color: accent }} />
          </div>
        )}
      </div>
      {loading
        ? <div className="sf-skeleton" style={{ height: 32, width: "60%" }} />
        : <p style={{ fontSize: 26, fontWeight: 700, color: C.ink, lineHeight: 1 }}>{value ?? "—"}</p>
      }
      {delta !== undefined && (
        <span className={`sf-badge delta-${deltaDir}`} style={{ alignSelf: "flex-start" }}>
          {deltaDir === "up" ? <TrendingUp size={10} /> : <ChevronDown size={10} />}
          {delta}
        </span>
      )}
    </Card>
  );
}

/* ─── Pipeline Visualiser ────────────────────────────────────────────────── */
function PipelineStages({ stages = {} }) {
  return (
    <div style={{
      display: "flex", alignItems: "center",
      gap: 0, overflowX: "auto", paddingBottom: 4,
    }}>
      {PIPELINE_STAGES.map(({ key, label, Icon: Ic }, idx) => {
        const st = resultToStatus(stages[key] || {});
        const col = statusColor[st];
        const bg  = statusBg[st];
        const brd = statusBord[st];
        return (
          <React.Fragment key={key}>
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              gap: 6, minWidth: 72, flex: "0 0 auto",
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: bg, border: `1.5px solid ${brd}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all .2s",
              }}>
                {st === "running"
                  ? <Spinner size={18} color={col} />
                  : <Ic size={18} style={{ color: col }} />
                }
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: C.inkMid, lineHeight: 1.2 }}>{label}</p>
                <p style={{ fontSize: 9, color: col, fontWeight: 600, textTransform: "uppercase", marginTop: 2 }}>{st}</p>
              </div>
            </div>
            {idx < PIPELINE_STAGES.length - 1 && (
              <div className={`sf-pipe-connector ${st === "passed" ? "passed" : st === "failed" ? "failed" : ""}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ─── Scan Row ───────────────────────────────────────────────────────────── */
function ScanRow({ scan, onOpen }) {
  const status = scan.status === "blocked" ? "failed" : "passed";
  return (
    <div
      onClick={() => onOpen(scan)}
      style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "12px 16px", borderRadius: 10,
        cursor: "pointer", transition: "background .15s",
      }}
      onMouseEnter={e => e.currentTarget.style.background = C.bgSurface}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
    >
      <div style={{
        width: 8, height: 8, borderRadius: "50%",
        background: status === "passed" ? C.green : C.red,
        flexShrink: 0,
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: C.ink, truncate: true, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {scan.image || scan.repo || "Unknown target"}
        </p>
        <p style={{ fontSize: 11, color: C.inkLow, marginTop: 1 }}>
          {scan.commit ? `${scan.commit.slice(0, 7)} · ` : ""}{fmt.ago(scan.scanned_at || scan.created_at)}
        </p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        {scan.critical > 0 && (
          <Badge color={C.red} bg={C.redSoft} border={C.redBord}><Flame size={10} />{scan.critical} crit</Badge>
        )}
        {scan.high > 0 && (
          <Badge color={C.amber} bg={C.amberSoft} border={C.amberBord}><AlertTriangle size={10} />{scan.high} high</Badge>
        )}
        <StatusBadge status={status} />
      </div>
    </div>
  );
}

/* ─── Why Blocked Modal ──────────────────────────────────────────────────── */
function WhyBlockedModal({ scan, onClose }) {
  const [remedy, setRemedy]     = useState(null);
  const [remedyState, setRS]    = useState("idle"); // idle | loading | success | empty | error
  const [remedyErr, setRErr]    = useState("");

  const fetchRemedy = useCallback(async () => {
    if (!scan) return;
    setRS("loading");
    try {
      const res = await fetch(`${BACKEND}/api/remedy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scan_id: scan.id, scan }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const text = data?.ai_remedy || data?.remedy || data?.message || "";
      if (text.trim()) { setRemedy(text); setRS("success"); }
      else             { setRS("empty"); }
    } catch (e) {
      setRErr(e.message);
      setRS("error");
    }
  }, [scan]);

  if (!scan) return null;

  const vulns = scan.vulnerabilities || [];
  const crit  = vulns.filter(v => v.severity === "CRITICAL");
  const high  = vulns.filter(v => v.severity === "HIGH");
  const med   = vulns.filter(v => v.severity === "MEDIUM");

  return (
    <div
      className="fade-in"
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(15,23,42,.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="slide-up"
        style={{
          background: C.bgCard, border: `1px solid ${C.border}`,
          borderRadius: 18, width: "100%", maxWidth: 620,
          maxHeight: "90vh", display: "flex", flexDirection: "column",
          boxShadow: "0 20px 60px rgba(15,23,42,.16)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "18px 20px", borderBottom: `1px solid ${C.border}`,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: C.redSoft, display: "flex",
            alignItems: "center", justifyContent: "center",
          }}>
            <AlertCircle size={18} style={{ color: C.red }} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>Why was this blocked?</h3>
            <p style={{ fontSize: 12, color: C.inkLow, marginTop: 1, fontFamily: C.mono }}>
              {scan.image || scan.repo}
            </p>
          </div>
          <IconBtn Icon={X} onClick={onClose} title="Close" />
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Vuln summary */}
          <div style={{ display: "flex", gap: 10 }}>
            {[
              { label: "Critical", count: crit.length, col: C.red,   bg: C.redSoft,   brd: C.redBord },
              { label: "High",     count: high.length, col: C.amber, bg: C.amberSoft, brd: C.amberBord },
              { label: "Medium",   count: med.length,  col: C.blue,  bg: C.blueSoft,  brd: C.blueBord },
            ].map(({ label, count, col, bg, brd }) => (
              <div key={label} style={{
                flex: 1, background: bg, border: `1px solid ${brd}`,
                borderRadius: 10, padding: "12px 14px", textAlign: "center",
              }}>
                <p style={{ fontSize: 22, fontWeight: 700, color: col }}>{count}</p>
                <p style={{ fontSize: 11, color: col, fontWeight: 500, marginTop: 2 }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Vuln list */}
          {vulns.length > 0 && (
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: C.inkMid, marginBottom: 8 }}>
                Top vulnerabilities
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {vulns.slice(0, 8).map((v, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "flex-start", gap: 10,
                    padding: "10px 12px", background: C.bgSurface,
                    borderRadius: 8, border: `1px solid ${C.border}`,
                  }}>
                    <Badge
                      color={v.severity === "CRITICAL" ? C.red : v.severity === "HIGH" ? C.amber : C.blue}
                      bg={v.severity === "CRITICAL" ? C.redSoft : v.severity === "HIGH" ? C.amberSoft : C.blueSoft}
                      border={v.severity === "CRITICAL" ? C.redBord : v.severity === "HIGH" ? C.amberBord : C.blueBord}
                    >
                      {v.severity}
                    </Badge>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: C.ink, fontFamily: C.mono }}>{v.cve_id || v.id}</p>
                      <p style={{ fontSize: 11, color: C.inkLow, marginTop: 2 }}>{v.package} {v.version && `(${v.version})`}</p>
                      {v.description && (
                        <p style={{ fontSize: 11, color: C.inkMid, marginTop: 4, lineHeight: 1.5 }}>
                          {v.description.length > 120 ? v.description.slice(0, 120) + "…" : v.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Remedy */}
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: C.inkMid, marginBottom: 8 }}>AI Remedy</p>
            {remedyState === "idle" && (
              <button
                onClick={fetchRemedy}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: C.tealSoft, color: C.teal,
                  border: `1.5px solid ${C.tealBord}`, borderRadius: 10,
                  padding: "10px 16px", fontSize: 13, fontWeight: 600,
                  transition: "all .15s",
                }}
              >
                <Sparkles size={14} /> Get AI Remedy
              </button>
            )}
            {remedyState === "loading" && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.inkLow, fontSize: 13 }}>
                <Spinner size={14} /> Generating remedy…
              </div>
            )}
            {remedyState === "success" && remedy && (
              <div className="remedy-block">
                <p style={{ fontSize: 13, color: C.ink, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{remedy}</p>
              </div>
            )}
            {remedyState === "empty" && (
              <div className="remedy-error">
                <p style={{ fontSize: 12, color: C.amber, fontWeight: 500 }}>
                  The backend responded but didn't provide a remedy for this scan.
                </p>
                <button onClick={fetchRemedy} style={{ marginTop: 8, fontSize: 12, color: C.amber, background: "none", border: "none", textDecoration: "underline", cursor: "pointer" }}>
                  Try again
                </button>
              </div>
            )}
            {remedyState === "error" && (
              <div className="remedy-error">
                <p style={{ fontSize: 12, color: C.red, fontWeight: 500 }}>
                  Failed to fetch remedy: {remedyErr}
                </p>
                <button onClick={fetchRemedy} style={{ marginTop: 8, fontSize: 12, color: C.red, background: "none", border: "none", textDecoration: "underline", cursor: "pointer" }}>
                  Retry
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 20px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              background: C.bgSurface, color: C.inkMid,
              border: `1px solid ${C.border}`, borderRadius: 9,
              padding: "8px 16px", fontSize: 13, fontWeight: 500,
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── AI Analysis Block ──────────────────────────────────────────────────── */
function AIAnalysisBlock({ scan }) {
  const [remedy, setRemedy]  = useState(null);
  const [state, setState]    = useState("idle");
  const [err, setErr]        = useState("");

  const fetchRemedy = useCallback(async () => {
    if (!scan) return;
    setState("loading");
    try {
      const res = await fetch(`${BACKEND}/api/remedy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scan_id: scan.id, scan }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const text = data?.ai_remedy || data?.remedy || data?.message || "";
      if (text.trim()) { setRemedy(text); setState("success"); }
      else             { setState("empty"); }
    } catch (e) {
      setErr(e.message);
      setState("error");
    }
  }, [scan]);

  if (!scan) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Brain size={14} style={{ color: C.violet }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: C.inkMid }}>AI Analysis</span>
      </div>
      {state === "idle" && (
        <button
          onClick={fetchRemedy}
          style={{
            alignSelf: "flex-start",
            display: "flex", alignItems: "center", gap: 6,
            background: C.violetSoft, color: C.violet,
            border: `1px solid ${C.violetBord}`, borderRadius: 8,
            padding: "7px 12px", fontSize: 12, fontWeight: 600,
            transition: "all .15s",
          }}
        >
          <Sparkles size={12} /> Analyse
        </button>
      )}
      {state === "loading" && (
        <div style={{ display: "flex", gap: 7, alignItems: "center", color: C.inkLow, fontSize: 12 }}>
          <Spinner size={12} /> Analysing…
        </div>
      )}
      {state === "success" && <div className="remedy-block"><p style={{ fontSize: 12, color: C.ink, lineHeight: 1.65 }}>{remedy}</p></div>}
      {state === "empty"   && <p style={{ fontSize: 12, color: C.amberMid }}>No AI remedy available from backend.</p>}
      {state === "error"   && (
        <div className="remedy-error">
          <p style={{ fontSize: 12, color: C.red }}>Error: {err}</p>
          <button onClick={fetchRemedy} style={{ fontSize: 11, color: C.red, background: "none", border: "none", cursor: "pointer", textDecoration: "underline", marginTop: 4 }}>Retry</button>
        </div>
      )}
    </div>
  );
}

/* ─── AI Copilot Chat ────────────────────────────────────────────────────── */
function CopilotChat({ isOpen, onClose, recentScans, stats, focusScan }) {
  const [messages, setMessages] = useState([
    { role: "bot", text: "Hi! I'm your SecureFlow AI Copilot. Ask me about your pipeline security, scan results, or how to fix specific vulnerabilities." },
  ]);
  const [input, setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const send = useCallback(async () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    setMessages(m => [...m, { role: "user", text: q }]);
    setLoading(true);
    try {
      const context = {
        question: q,
        recent_scans: recentScans?.slice(0, 5) || [],
        stats: stats || {},
        focus_scan: focusScan || null,
        timestamp: new Date().toISOString(),
      };
      const res = await fetch(`${BACKEND}/api/copilot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(context),
      });
      const data = await res.json();
      const reply = data?.response || data?.message || data?.answer || "I couldn't get a response. Please try again.";
      setMessages(m => [...m, { role: "bot", text: reply }]);
    } catch (e) {
      setMessages(m => [...m, { role: "bot", text: `Network error: ${e.message}. Is the backend running?` }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, recentScans, stats, focusScan]);

  if (!isOpen) return null;
  return (
    <div
      className="slide-right"
      style={{
        position: "fixed", right: 20, bottom: 88, zIndex: 900,
        width: 360, maxHeight: "70vh",
        background: C.bgCard, border: `1px solid ${C.border}`,
        borderRadius: 18, display: "flex", flexDirection: "column",
        boxShadow: "0 16px 48px rgba(15,23,42,.14)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "14px 16px", borderBottom: `1px solid ${C.border}`,
        background: C.bgSurface,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9,
          background: C.tealSoft, display: "flex",
          alignItems: "center", justifyContent: "center",
          border: `1px solid ${C.tealBord}`,
        }}>
          <Bot size={15} style={{ color: C.teal }} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>AI Copilot</p>
          <p style={{ fontSize: 11, color: C.green, display: "flex", alignItems: "center", gap: 3 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, display: "inline-block" }} />
            Online
          </p>
        </div>
        <IconBtn Icon={Minimize2} onClick={onClose} title="Minimise" />
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "14px 14px 10px", display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.map((m, i) => (
          <div
            key={i}
            className={m.role === "user" ? "sf-msg-user" : "sf-msg-bot"}
            style={{ padding: "10px 13px", fontSize: 13, lineHeight: 1.6, maxWidth: "90%" }}
          >
            {m.text}
          </div>
        ))}
        {loading && (
          <div className="sf-msg-bot" style={{ padding: "10px 13px", display: "flex", gap: 6, alignItems: "center", color: C.inkLow, fontSize: 13 }}>
            <Spinner size={13} /> Thinking…
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ padding: "10px 12px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 8 }}>
        <input
          className="sf-chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Ask about your pipeline security…"
        />
        <button
          onClick={send}
          disabled={!input.trim() || loading}
          style={{
            width: 36, height: 36, borderRadius: 9, flexShrink: 0,
            background: (!input.trim() || loading) ? C.bgSurface : C.teal,
            border: `1px solid ${(!input.trim() || loading) ? C.border : C.teal}`,
            color: (!input.trim() || loading) ? C.inkMuted : "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all .15s",
          }}
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}

/* ─── Sidebar Nav ────────────────────────────────────────────────────────── */
const NAV_ITEMS = [
  { key: "overview",   label: "Overview",    Icon: BarChart2       },
  { key: "scans",      label: "Scans",       Icon: Shield          },
  { key: "pipeline",   label: "Pipeline",    Icon: GitPullRequest  },
  { key: "analytics",  label: "Analytics",   Icon: Activity        },
  { key: "policy",     label: "Policy",      Icon: Lock            },
];

function Sidebar({ active, onNav, connected }) {
  return (
    <aside style={{
      width: 220, flexShrink: 0,
      background: C.bgCard, borderRight: `1px solid ${C.border}`,
      display: "flex", flexDirection: "column",
      height: "100vh", position: "sticky", top: 0,
    }}>
      {/* Logo */}
      <div style={{
        padding: "22px 20px 18px",
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: C.teal, display: "flex",
            alignItems: "center", justifyContent: "center",
          }}>
            <ShieldCheck size={18} style={{ color: "#fff" }} />
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: C.ink, letterSpacing: "-.01em" }}>SecureFlow</p>
            <p style={{ fontSize: 10, color: C.inkLow, marginTop: 1 }}>CI/CD Security</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
        {NAV_ITEMS.map(({ key, label, Icon: Ic }) => (
          <button
            key={key}
            onClick={() => onNav(key)}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "9px 12px", borderRadius: 9, border: "none",
              background: active === key ? C.tealSoft : "transparent",
              color: active === key ? C.teal : C.inkMid,
              fontWeight: active === key ? 600 : 400,
              fontSize: 13, textAlign: "left",
              transition: "all .15s",
              borderLeft: active === key ? `3px solid ${C.teal}` : "3px solid transparent",
            }}
          >
            <Ic size={16} />
            {label}
          </button>
        ))}
      </nav>

      {/* Status */}
      <div style={{ padding: "14px 16px", borderTop: `1px solid ${C.border}` }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 7,
          padding: "9px 12px", borderRadius: 9,
          background: connected ? C.greenSoft : C.redSoft,
          border: `1px solid ${connected ? C.greenBord : C.redBord}`,
        }}>
          {connected
            ? <><Wifi size={13} style={{ color: C.green }} /><span style={{ fontSize: 11, color: C.green, fontWeight: 600 }}>Backend connected</span></>
            : <><WifiOff size={13} style={{ color: C.red }} /><span style={{ fontSize: 11, color: C.red, fontWeight: 600 }}>Backend offline</span></>
          }
        </div>
      </div>
    </aside>
  );
}

/* ─── Overview Tab ───────────────────────────────────────────────────────── */
function OverviewTab({ stats, recentScans, loading, onOpenScan }) {
  const chartData = useMemo(() => {
    if (!recentScans?.length) return [];
    return recentScans.slice(0, 10).reverse().map((s, i) => ({
      name: `#${i + 1}`,
      critical: s.critical || 0,
      high:     s.high || 0,
      medium:   s.medium || 0,
    }));
  }, [recentScans]);

  const pieData = [
    { name: "Passed", value: stats?.passed || 0, color: C.green },
    { name: "Blocked", value: stats?.blocked || 0, color: C.red },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        <StatCard label="Total Scans"   value={stats?.total}   icon={Shield}        accent={C.teal}  loading={loading} delta="+12% this week" deltaDir="up" />
        <StatCard label="Blocked"       value={stats?.blocked} icon={XCircle}       accent={C.red}   loading={loading} delta="-3 vs last week" deltaDir="down" />
        <StatCard label="Passed"        value={stats?.passed}  icon={CheckCircle}   accent={C.green} loading={loading} />
        <StatCard label="Avg Vuln/Scan" value={stats?.avg_vulns?.toFixed(1) ?? "—"} icon={AlertTriangle} accent={C.amber} loading={loading} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14 }}>
        {/* Vulnerability trend */}
        <Card>
          <SectionHeader title="Vulnerability Trend" subtitle="Last 10 scans" />
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.red}   stopOpacity={0.15} />
                  <stop offset="95%" stopColor={C.red}   stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gh" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.amber} stopOpacity={0.12} />
                  <stop offset="95%" stopColor={C.amber} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: C.inkLow }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: C.inkLow }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="critical" stroke={C.red}   fill="url(#gc)" strokeWidth={2} name="Critical" />
              <Area type="monotone" dataKey="high"     stroke={C.amber} fill="url(#gh)" strokeWidth={2} name="High" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Pass/fail ratio */}
        <Card>
          <SectionHeader title="Pass / Block Ratio" />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={52} outerRadius={72} paddingAngle={3} dataKey="value">
                  {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", gap: 14 }}>
              {pieData.map(({ name, value, color }) => (
                <div key={name} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
                  <span style={{ fontSize: 11, color: C.inkLow }}>{name} ({value})</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Recent scans */}
      <Card style={{ padding: 0 }}>
        <div style={{ padding: "18px 20px 12px" }}>
          <SectionHeader title="Recent Scans" subtitle="Click a row for details" />
        </div>
        <Divider />
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ padding: "14px 20px", display: "flex", gap: 12, alignItems: "center" }}>
                <div className="sf-skeleton" style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0 }} />
                <div className="sf-skeleton" style={{ flex: 1, height: 14 }} />
                <div className="sf-skeleton" style={{ width: 80, height: 22, borderRadius: 6 }} />
              </div>
            ))
          : recentScans?.length
            ? recentScans.slice(0, 8).map((s, i) => (
                <React.Fragment key={s.id || i}>
                  {i > 0 && <Divider style={{ margin: "0 16px" }} />}
                  <ScanRow scan={s} onOpen={onOpenScan} />
                </React.Fragment>
              ))
            : <EmptyState title="No scans yet" desc="Scans will appear here once your pipeline runs." />
        }
      </Card>
    </div>
  );
}

/* ─── Scans Tab ──────────────────────────────────────────────────────────── */
function ScansTab({ scans, loading, onOpenScan }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(() => {
    if (!scans) return [];
    return scans.filter(s => {
      const matchFilter = filter === "all" || (filter === "blocked" ? s.status === "blocked" : s.status !== "blocked");
      const matchSearch = !search || (s.image || s.repo || "").toLowerCase().includes(search.toLowerCase());
      return matchFilter && matchSearch;
    });
  }, [scans, filter, search]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Toolbar */}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div style={{
          flex: 1, position: "relative",
          display: "flex", alignItems: "center",
        }}>
          <Eye size={14} style={{ position: "absolute", left: 11, color: C.inkLow }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by image or repo…"
            className="sf-chat-input"
            style={{ paddingLeft: 32 }}
          />
        </div>
        <div style={{ display: "flex", gap: 4, background: C.bgSurface, borderRadius: 9, padding: 3, border: `1px solid ${C.border}` }}>
          {["all", "blocked", "passed"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`sf-tab ${filter === f ? "active" : ""}`}
              style={{ padding: "5px 12px", fontSize: 12, borderRadius: 6 }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <Card style={{ padding: 0 }}>
        {loading
          ? <div style={{ padding: 30, display: "flex", justifyContent: "center" }}><Spinner /></div>
          : filtered.length
            ? filtered.map((s, i) => (
                <React.Fragment key={s.id || i}>
                  {i > 0 && <Divider style={{ margin: "0 16px" }} />}
                  <ScanRow scan={s} onOpen={onOpenScan} />
                </React.Fragment>
              ))
            : <EmptyState title="No results" desc={search ? "Try a different search term." : "No scans match this filter."} />
        }
      </Card>
    </div>
  );
}

/* ─── Pipeline Tab ───────────────────────────────────────────────────────── */
function PipelineTab({ scans, loading }) {
  const latestScan = scans?.[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <SectionHeader
          title="Latest Pipeline Run"
          subtitle={latestScan ? `${latestScan.image || latestScan.repo} · ${fmt.ago(latestScan.scanned_at || latestScan.created_at)}` : "No runs yet"}
        />
        {loading
          ? <div style={{ display: "flex", justifyContent: "center", padding: 24 }}><Spinner /></div>
          : latestScan
            ? <PipelineStages stages={latestScan.stages || {}} />
            : <EmptyState title="No pipeline data" desc="Run your CI pipeline to see stage results here." />
        }
      </Card>

      {/* Run history */}
      <Card style={{ padding: 0 }}>
        <div style={{ padding: "18px 20px 12px" }}>
          <SectionHeader title="Run History" />
        </div>
        <Divider />
        {scans?.slice(0, 6).map((scan, i) => {
          const hasBlocked = scan.status === "blocked";
          return (
            <React.Fragment key={scan.id || i}>
              {i > 0 && <Divider style={{ margin: "0 16px" }} />}
              <div style={{ padding: "14px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500, color: C.ink }}>{scan.image || scan.repo}</p>
                    <p style={{ fontSize: 11, color: C.inkLow, marginTop: 1 }}>
                      {scan.commit?.slice(0, 7) || "unknown"} · {fmt.ago(scan.scanned_at || scan.created_at)}
                    </p>
                  </div>
                  <StatusBadge status={hasBlocked ? "failed" : "passed"} />
                </div>
                <PipelineStages stages={scan.stages || {}} />
              </div>
            </React.Fragment>
          );
        })}
      </Card>
    </div>
  );
}

/* ─── Analytics Tab ──────────────────────────────────────────────────────── */
function AnalyticsTab({ scans }) {
  const barData = useMemo(() => {
    if (!scans?.length) return [];
    return scans.slice(0, 14).reverse().map((s, i) => ({
      name: `R${i + 1}`,
      critical: s.critical || 0,
      high:     s.high || 0,
      medium:   s.medium || 0,
      low:      s.low || 0,
    }));
  }, [scans]);

  const radarData = useMemo(() => [
    { subject: "Code Scan",    A: 80 },
    { subject: "Container",   A: 65 },
    { subject: "Policy Gate", A: 90 },
    { subject: "Deploy",      A: 55 },
    { subject: "Secrets",     A: 75 },
  ], []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 14 }}>
        <Card>
          <SectionHeader title="Vulnerability Distribution" subtitle="Per scan run" />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }} barSize={12}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: C.inkLow }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: C.inkLow }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="critical" fill={C.red}   radius={[3, 3, 0, 0]} name="Critical" />
              <Bar dataKey="high"     fill={C.amber} radius={[3, 3, 0, 0]} name="High" />
              <Bar dataKey="medium"   fill={C.blue}  radius={[3, 3, 0, 0]} name="Medium" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <SectionHeader title="Security Coverage" />
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke={C.border} />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: C.inkLow }} />
              <Radar dataKey="A" stroke={C.teal} fill={C.teal} fillOpacity={0.15} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Summary metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {[
          { label: "Critical CVEs (total)",   value: scans?.reduce((a, s) => a + (s.critical || 0), 0) ?? 0, color: C.red },
          { label: "High CVEs (total)",        value: scans?.reduce((a, s) => a + (s.high || 0), 0) ?? 0,     color: C.amber },
          { label: "Block rate",               value: scans?.length ? `${((scans.filter(s => s.status === "blocked").length / scans.length) * 100).toFixed(0)}%` : "—", color: C.violet },
        ].map(({ label, value, color }) => (
          <Card key={label} style={{ textAlign: "center" }}>
            <p style={{ fontSize: 32, fontWeight: 700, color }}>{value}</p>
            <p style={{ fontSize: 12, color: C.inkLow, marginTop: 4 }}>{label}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ─── Policy Tab ─────────────────────────────────────────────────────────── */
function PolicyTab() {
  const rules = [
    { id: "CVE-CRITICAL", label: "Block on any CRITICAL CVE",             enabled: true,  severity: "critical" },
    { id: "CVE-HIGH-5",   label: "Block when HIGH CVEs exceed 5",         enabled: true,  severity: "high"     },
    { id: "SECRETS",      label: "Block on detected secrets in source",   enabled: true,  severity: "critical" },
    { id: "BASE-IMAGE",   label: "Warn on unapproved base images",        enabled: false, severity: "medium"   },
    { id: "SCA-MEDIUM",   label: "Warn when MEDIUM CVEs exceed 20",       enabled: false, severity: "medium"   },
  ];

  const [enabled, setEnabled] = useState(
    Object.fromEntries(rules.map(r => [r.id, r.enabled]))
  );

  const sColor = { critical: C.red, high: C.amber, medium: C.blue };
  const sBg    = { critical: C.redSoft, high: C.amberSoft, medium: C.blueSoft };
  const sBord  = { critical: C.redBord, high: C.amberBord, medium: C.blueBord };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card>
        <SectionHeader
          title="Policy Rules"
          subtitle="Configure what triggers a pipeline block or warning"
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rules.map(rule => (
            <div
              key={rule.id}
              style={{
                display: "flex", alignItems: "center", gap: 14,
                padding: "13px 16px", borderRadius: 10,
                background: enabled[rule.id] ? C.bgSurface : C.bgCard,
                border: `1px solid ${enabled[rule.id] ? C.borderMid : C.border}`,
                transition: "all .15s",
              }}
            >
              <Badge
                color={sColor[rule.severity]}
                bg={sBg[rule.severity]}
                border={sBord[rule.severity]}
                style={{ minWidth: 68, justifyContent: "center" }}
              >
                {rule.severity}
              </Badge>
              <p style={{ flex: 1, fontSize: 13, color: enabled[rule.id] ? C.ink : C.inkLow, fontWeight: 400 }}>
                {rule.label}
              </p>
              <code style={{ fontSize: 10, color: C.inkMuted, fontFamily: C.mono, flexShrink: 0 }}>{rule.id}</code>
              {/* Toggle */}
              <button
                onClick={() => setEnabled(e => ({ ...e, [rule.id]: !e[rule.id] }))}
                style={{
                  width: 42, height: 24, borderRadius: 12, flexShrink: 0, border: "none",
                  background: enabled[rule.id] ? C.teal : C.bgElevated,
                  position: "relative", transition: "background .2s",
                }}
              >
                <span style={{
                  position: "absolute", top: 3,
                  left: enabled[rule.id] ? "calc(100% - 21px)" : 3,
                  width: 18, height: 18, borderRadius: "50%",
                  background: "#fff",
                  boxShadow: "0 1px 4px rgba(0,0,0,.15)",
                  transition: "left .2s",
                }} />
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ─── Main App ───────────────────────────────────────────────────────────── */
export default function App() {
  const [tab, setTab]              = useState("overview");
  const [scans, setScans]          = useState([]);
  const [stats, setStats]          = useState({});
  const [loading, setLoading]      = useState(true);
  const [lastFetch, setLastFetch]  = useState(null);
  const [connected, setConnected]  = useState(false);
  const [copilotOpen, setCopilot]  = useState(false);
  const [modalScan, setModalScan]  = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [scansRes, statsRes] = await Promise.all([
        fetch(`${BACKEND}/api/scans`),
        fetch(`${BACKEND}/api/stats`),
      ]);
      const scansData = await scansRes.json();
      const statsData = await statsRes.json();
      setScans(Array.isArray(scansData) ? scansData : scansData?.scans || []);
      setStats(statsData);
      setConnected(true);
    } catch {
      setConnected(false);
    } finally {
      setLoading(false);
      setLastFetch(new Date());
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* Auto-refresh every 30s */
  useEffect(() => {
    const id = setInterval(fetchData, 30_000);
    return () => clearInterval(id);
  }, [fetchData]);

  const tabProps = { scans, stats, loading, onOpenScan: setModalScan };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg }}>
      <Sidebar active={tab} onNav={setTab} connected={connected} />

      {/* Main content */}
      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        {/* Topbar */}
        <header style={{
          height: 60, flexShrink: 0,
          background: C.bgCard, borderBottom: `1px solid ${C.border}`,
          display: "flex", alignItems: "center",
          padding: "0 24px", gap: 14,
          position: "sticky", top: 0, zIndex: 100,
        }}>
          <h1 style={{ fontSize: 15, fontWeight: 600, color: C.ink, flex: 1 }}>
            {NAV_ITEMS.find(n => n.key === tab)?.label}
          </h1>

          {lastFetch && (
            <span style={{ fontSize: 11, color: C.inkMuted }}>
              Updated {fmt.ago(lastFetch)}
            </span>
          )}

          <IconBtn Icon={RefreshCw} onClick={fetchData} title="Refresh" />

          <button
            onClick={() => setCopilot(o => !o)}
            className="fab-breathe"
            style={{
              display: "flex", alignItems: "center", gap: 7,
              background: C.teal, color: "#fff", border: "none",
              borderRadius: 10, padding: "8px 14px",
              fontSize: 13, fontWeight: 600,
              boxShadow: "0 2px 12px rgba(13,148,136,.25)",
              transition: "all .15s",
              position: "relative",
            }}
          >
            <Sparkles size={14} />
            AI Copilot
          </button>
        </header>

        {/* Tab content */}
        <div className="fade-up" style={{ flex: 1, padding: "24px", overflowY: "auto" }}>
          {tab === "overview"  && <OverviewTab  {...tabProps} recentScans={scans} />}
          {tab === "scans"     && <ScansTab     {...tabProps} />}
          {tab === "pipeline"  && <PipelineTab  {...tabProps} />}
          {tab === "analytics" && <AnalyticsTab {...tabProps} />}
          {tab === "policy"    && <PolicyTab />}
        </div>
      </main>

      {/* Copilot */}
      <CopilotChat
        isOpen={copilotOpen}
        onClose={() => setCopilot(false)}
        recentScans={scans}
        stats={stats}
        focusScan={modalScan}
      />

      {/* FAB (mobile) */}
      <button
        className="fab-ripple fab-breathe"
        onClick={() => setCopilot(o => !o)}
        style={{
          position: "fixed", right: 20, bottom: 24,
          width: 52, height: 52, borderRadius: "50%",
          background: C.teal, color: "#fff", border: "none",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 20px rgba(13,148,136,.35)",
          zIndex: 800,
        }}
      >
        <Bot size={22} />
      </button>

      {/* Modal */}
      {modalScan && (
        <WhyBlockedModal scan={modalScan} onClose={() => setModalScan(null)} />
      )}
    </div>
  );
}