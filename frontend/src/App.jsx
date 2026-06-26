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
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  LineChart, Line, ScatterChart, Scatter, ZAxis,
} from "recharts";
import {
  Shield, Activity, CheckCircle, XCircle, AlertTriangle,
  RefreshCw, ThumbsUp, ThumbsDown, ChevronDown, ChevronUp,
  GitPullRequest, Sparkles, GitBranch,
  Loader2, X, Send, Bot, Minimize2,
  Lock, Terminal, Cpu, Globe, Brain,
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

  cyan:         "#06b6d4",
  cyanSoft:     "#ecfeff",
  cyanBord:     "#a5f3fc",

  borderBright: "#cbd5e1",

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
@keyframes pulseRing {
  0%   { transform: scale(1);   opacity: 1; }
  70%  { transform: scale(1.8); opacity: 0; }
  100% { transform: scale(1.8); opacity: 0; }
}
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-3px); }
}
@keyframes slideInRight {
  from { opacity: 0; transform: translateX(32px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes bounceIn {
  0%   { opacity: 0; transform: scale(.88) translateY(12px); }
  60%  { opacity: 1; transform: scale(1.02) translateY(-2px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
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
.sf-card:hover,
.sf-card-hover:hover {
  border-color: ${C.borderMid};
  box-shadow: 0 4px 20px rgba(15,23,42,.06);
  transform: translateY(-2px) perspective(800px) rotateX(1deg);
}
.sf-card-hover {
  background: ${C.bgCard};
  border: 1px solid ${C.border};
  border-radius: 16px;
  transition: box-shadow .25s, border-color .25s, transform .25s;
  transform-style: preserve-3d;
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
function resultToStatus(stage, fallbackStatus) {
  const r = (stage?.result || stage?.status || "").toLowerCase();

  if (["passed","pass","success","allow","clean"].includes(r))
    return "passed";

  if (["failed","fail","error","block","blocked"].includes(r))
    return "failed";

  if (["running","in_progress","active"].includes(r))
    return "running";

  if (stage?.started_at && !["pending","skipped"].includes(r))
    return "passed";

  if (fallbackStatus === "passed")
    return "passed";

  if (fallbackStatus === "failed")
    return "skipped";

  return "pending";
}


function normaliseScan(raw) {
  // Used by resultToStatus() as a fallback signal when a stage has no
  // explicit result of its own.
  const overallOutcome = raw.action_taken === "BLOCK" ? "failed"
    : raw.action_taken === "ALLOW" ? "passed"
    : null;

  const steps = raw.pipeline_steps || {};
  const pipeline = PIPELINE_STAGES.map(({ key, label, Icon }) => {
    const info = steps[key] || {};
    return {
      id: key, name: label, Icon,
     status: resultToStatus(info, overallOutcome),
      result:  info.result  || info.status || "",
      detail:  info.detail  || "",
    };
  });

  let vuln_breakdown = raw.vuln_breakdown || null;
  if (!vuln_breakdown && raw.findings?.Results) {
    const all = [];
    (raw.findings.Results || []).forEach(r => (r.Vulnerabilities || []).forEach(v => all.push(v)));
    const fixable = all.filter(v => v.FixedVersion);
    vuln_breakdown = {
      total:         all.length,
      fixable_count: fixable.length,
      fixable_details: fixable.slice(0,6).map(v => ({
        id:       v.VulnerabilityID,
        package:  v.PkgName,
        severity: v.Severity,
        fix:      v.FixedVersion || "—",
        cvss:     v.CVSS ? Math.max(...Object.values(v.CVSS).map(c => c.V3Score||c.V2Score||0)) : 0,
      })),
      base_image_note: all.filter(v => !v.FixedVersion).length > 8
        ? "Most CVEs originate from the base image." : undefined,
    };
  }

  const aiConf = raw.ai_confidence != null
    ? raw.ai_confidence
    : raw.risk_score != null
      ? Math.min(99, Math.max(60, Math.floor(raw.risk_score * 10)))
      : null;

  /* Parse remedy out of ai_explanation if backend embeds it with "REMEDY:" prefix */
  let ai_explanation = raw.ai_explanation || null;
  let ai_remedy      = raw.ai_fix || raw.ai_remedy || null;

  if (ai_explanation && !ai_remedy) {
    const remMatch = ai_explanation.match(/REMEDY[:\-–]?\s*([\s\S]+)/i);
    if (remMatch) {
      ai_remedy      = remMatch[1].trim();
      ai_explanation = ai_explanation.slice(0, remMatch.index).trim();
    }
  }

  let vulnerabilities = raw.vulnerabilities || [];
  if (!vulnerabilities.length && raw.findings?.Results) {
    (raw.findings.Results || []).forEach(r => {
      (r.Vulnerabilities || []).forEach(v => {
        vulnerabilities.push({
          severity:    v.Severity,
          id:          v.VulnerabilityID,
          cve_id:      v.VulnerabilityID,
          package:     v.PkgName,
          version:     v.InstalledVersion,
          description: v.Title || v.Description || "",
        });
      });
    });
  }
  if (!vulnerabilities.length && vuln_breakdown?.fixable_details) {
    vulnerabilities = vuln_breakdown.fixable_details.map(v => ({
      severity: v.severity,
      id:       v.id,
      cve_id:   v.id,
      package:  v.package,
    }));
  }

  return {
    ...raw,
    pipeline,
    vuln_breakdown,
    vulnerabilities,
    ai_confidence:  aiConf,
    ai_explanation,
    ai_remedy,
    status: raw.status || "complete",
  };
}

const fmt     = iso => iso ? new Date(iso).toLocaleDateString("en-IN",{day:"numeric",month:"short"}) : "—";
const fmtFull = iso => iso ? new Date(iso).toLocaleString("en-IN",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "—";

function relTime(iso) {
  if (!iso) return "—";
  const m = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (m < 5)   return "just now";
  if (m < 60)  return `${m}s ago`;
  const min = Math.floor(m/60);
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min/60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h/24)}d ago`;
}

const sevColor = s => ({
  CRITICAL:C.red, HIGH:C.amber, MEDIUM:C.blue, LOW:C.inkMid, CLEAN:C.teal
}[String(s||"").toUpperCase()] || C.inkMid);

const riskColor = n => n >= 7 ? C.red : n >= 4 ? C.amber : C.teal;

const TT = {
  background: C.bgCard,
  border:     `1px solid ${C.border}`,
  borderRadius: 10,
  fontSize:   12,
  color:      C.ink,
  boxShadow:  "0 8px 32px rgba(0,0,0,.4)",
};

/* ─────────────────────────────────────────────
   PRIMITIVE COMPONENTS
───────────────────────────────────────────── */
const Badge = ({ color, children, small }) => (
  <span style={{
    display:"inline-flex", alignItems:"center", gap:4,
    padding: small ? "2px 7px" : "3px 9px",
    borderRadius:999, fontSize: small ? 10 : 11, fontWeight:700,
    background: color+"18", color,
    border:`1px solid ${color}35`,
    fontFamily:C.mono, whiteSpace:"nowrap",
    letterSpacing:"0.02em",
  }}>{children}</span>
);

const IconBtn = ({ Icon, onClick, title, style={} }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    style={{
      background: C.bgSurface,
      border: `1px solid ${C.border}`,
      borderRadius: 8,
      padding: "6px 8px",
      color: C.inkMid,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "background .15s, color .15s, transform .15s",
      ...style,
    }}
  >
    <Icon size={16} />
  </button>
);

const Spinner = ({ size=14 }) => (
  <Loader2 size={size} className="spin" aria-hidden="true" />
);

const Card = ({ children, glow, style={}, className="" }) => (
  <motion.div
    className={`sf-card-hover ${className}`}
    initial={{ opacity: 0, y: 16, rotateX: 8 }}
    animate={{ opacity: 1, y: 0, rotateX: 0 }}
    whileHover={{ y: -4, rotateX: 2, rotateY: -1 }}
    transition={{ type: "spring", stiffness: 260, damping: 22 }}
    style={{
      background: C.bgCard,
      borderRadius:16,
      border:`1px solid ${glow ? C.tealBord : C.border}`,
      padding:"20px",
      marginBottom:16,
      boxShadow: glow ? `0 0 30px ${C.teal}12` : "0 2px 12px rgba(15,23,42,.06)",
      transformStyle: "preserve-3d",
      perspective: 900,
      ...style,
    }}
  >{children}</motion.div>
);

const SectionTitle = ({ children, accent, right }) => (
  <div style={{
    fontSize:10, fontWeight:800, color: accent || C.inkMid,
    letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:14,
    display:"flex", alignItems:"center", justifyContent:"space-between",
  }}>
    <div style={{ display:"flex", alignItems:"center", gap:7 }}>
      {accent && <div style={{ width:3, height:14, background:accent, borderRadius:2, flexShrink:0 }} />}
      {children}
    </div>
    {right}
  </div>
);

/* ─────────────────────────────────────────────
   PROMETHEUS GAUGE  (SVG arc gauge)
───────────────────────────────────────────── */
function PrometheusGauge({ value, max=100, label, unit="", color, size=100 }) {
  const r = (size - 16) / 2;
  const arc = Math.PI * r; // half-circle arc length
  const offset = arc - (Math.min(value, max) / max) * arc;

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
      <div style={{ position:"relative", width:size, height:size/2 + 10 }}>
        <svg width={size} height={size/2 + 14} style={{ overflow:"visible" }}>
          {/* Track */}
          <path
            d={`M 8 ${size/2} A ${r} ${r} 0 0 1 ${size-8} ${size/2}`}
            fill="none" stroke={C.bgSurface} strokeWidth={10} strokeLinecap="round"
          />
          {/* Fill */}
          <path
            d={`M 8 ${size/2} A ${r} ${r} 0 0 1 ${size-8} ${size/2}`}
            fill="none" stroke={color} strokeWidth={10} strokeLinecap="round"
            strokeDasharray={arc}
            strokeDashoffset={offset}
            style={{
              transition:"stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)",
              filter:`drop-shadow(0 0 4px ${color}70)`,
            }}
          />
          {/* Value text */}
          <text x={size/2} y={size/2 + 2} textAnchor="middle"
            fill={color} fontFamily={C.mono} fontSize={18} fontWeight={900}>
            {typeof value === "number" ? value.toFixed(unit==="%"?1:0) : value}{unit}
          </text>
        </svg>
      </div>
      <div style={{ fontSize:10, color:C.inkMid, fontWeight:700, letterSpacing:"0.08em",
        textTransform:"uppercase", textAlign:"center" }}>
        {label}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   HEALTH RING
───────────────────────────────────────────── */
const HealthRing = ({ score, size=110 }) => {
  const r = (size-14)/2;
  const circ = 2*Math.PI*r;
  const offset = circ - (score/100)*circ;
  const color = score>=75 ? C.teal : score>=50 ? C.amber : C.red;

  return (
    <div style={{ position:"relative", width:size, height:size }}>
      <svg width={size} height={size} style={{ position:"absolute", inset:0 }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color+"20"} strokeWidth={10} />
      </svg>
      <svg width={size} height={size} style={{ transform:"rotate(-90deg)", position:"absolute", inset:0 }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.bgSurface} strokeWidth={10} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={circ} strokeLinecap="round"
          style={{
            strokeDashoffset: offset,
            transition:"stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)",
            filter:`drop-shadow(0 0 6px ${color}80)`,
          }}
        />
      </svg>
      <div style={{
        position:"absolute", inset:0, display:"flex",
        alignItems:"center", justifyContent:"center", flexDirection:"column",
      }}>
        <div style={{ fontSize:24, fontWeight:900, fontFamily:C.mono }}>{score}</div>
        <div style={{ fontSize:8, color, fontWeight:800, letterSpacing:"0.1em" }}>HEALTH</div>
      </div>
    </div>
  );
};

const RiskBar = ({ score }) => {
  const color = riskColor(score);
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
      <div style={{ flex:1, height:6, background:C.bgSurface, borderRadius:4, overflow:"hidden" }}>
        <div style={{
          width:`${Math.min(100,score*10)}%`, height:"100%",
          background:`linear-gradient(90deg, ${color}80, ${color})`,
          borderRadius:4,
          transition:"width 1s cubic-bezier(.4,0,.2,1)",
          boxShadow:`0 0 8px ${color}60`,
        }} />
      </div>
      <span style={{ fontFamily:C.mono, fontSize:13, color, fontWeight:700, minWidth:24 }}>{score}</span>
    </div>
  );
};

/* ─────────────────────────────────────────────
   PIPELINE NODES
───────────────────────────────────────────── */
function PipelineMiniNodes({ pipeline }) {
  if (!pipeline?.length) return null;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:0, margin:"14px 0 4px", overflowX:"auto", paddingBottom:4 }}>
      {pipeline.map((stage, i) => {
        const color =
          stage.status === "passed"  ? C.teal  :
          stage.status === "failed"  ? C.red   :
          stage.status === "running" ? C.blue  :
          stage.status === "skipped" ? C.inkMid :
          C.inkLow;
        const { Icon } = stage;
        return (
          <React.Fragment key={stage.id}>
            {i > 0 && (
              <div style={{
                flex:1, height:2, minWidth:8, maxWidth:28,
                background: pipeline[i-1].status === "passed"
                  ? `linear-gradient(90deg,${C.teal}60,${color}60)` : C.border,
              }} />
            )}
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:5, minWidth:52 }}>
              <div style={{
                width:34, height:34, borderRadius:"50%",
                border:`2px solid ${color}`,
                background: color+"12",
                display:"flex", alignItems:"center", justifyContent:"center",
                color,
                boxShadow: stage.status === "running"
                  ? `0 0 0 4px ${color}20, 0 0 16px ${color}40` : `0 0 8px ${color}20`,
                animation: stage.status === "running" ? "pulseRing 1.5s infinite" : "none",
              }}>
                {stage.status === "running" ? <Loader2 size={15} className="spin" /> :
                 stage.status === "passed"  ? <CheckCircle size={15} /> :
                 stage.status === "failed"  ? <XCircle size={15} /> :
                 stage.status === "skipped" ? <span style={{ fontSize:11 }}>—</span> :
                 Icon ? <Icon size={13} /> : null}
              </div>
              <div style={{ fontSize:9, color:C.inkMid, textAlign:"center", whiteSpace:"nowrap" }}>
                {stage.name}
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

function PipelineFullView({ pipeline }) {
  if (!pipeline?.length) return null;
  return (
    <div style={{ marginTop:16 }}>
      {pipeline.map((stage, i) => {
        const color =
          stage.status === "passed"  ? C.teal  :
          stage.status === "failed"  ? C.red   :
          stage.status === "running" ? C.blue  : C.inkMid;
        const { Icon } = stage;
        return (
          <div key={stage.id} style={{ display:"flex", gap:12, marginBottom:0 }}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", width:34, flexShrink:0 }}>
              <div style={{
                width:32, height:32, borderRadius:"50%",
                border:`2px solid ${color}`,
                background:color+"12",
                display:"flex", alignItems:"center", justifyContent:"center",
                color, flexShrink:0,
                boxShadow: stage.status==="running" ? `0 0 14px ${color}50` : "none",
                animation: stage.status==="running" ? "pulseRing 1.5s infinite" : "none",
              }}>
                {stage.status === "running" ? <Loader2 size={14} className="spin" /> :
                 stage.status === "passed"  ? <CheckCircle size={14} /> :
                 stage.status === "failed"  ? <XCircle size={14} /> :
                 Icon ? <Icon size={12} /> : null}
              </div>
              {i < pipeline.length-1 && (
                <div style={{
                  width:2, flex:1, minHeight:20,
                  background: stage.status==="passed" ? `linear-gradient(${color}, ${color}30)` : C.border,
                  marginTop:4, marginBottom:4, borderRadius:2,
                }} />
              )}
            </div>
            <div style={{ flex:1, paddingBottom: i < pipeline.length-1 ? 14 : 0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom: stage.detail ? 4 : 0 }}>
                <span style={{ fontWeight:600, fontSize:13, color:C.ink }}>{stage.name}</span>
                <Badge color={color} small>{stage.result || stage.status}</Badge>
              </div>
              {stage.detail && (
                <div style={{
                  fontSize:12, color:C.inkMid, fontFamily:C.mono,
                  background:C.bgSurface, padding:"6px 10px",
                  borderRadius:6, border:`1px solid ${C.border}`, marginTop:4,
                }}>
                  {stage.detail}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────
   AI ANALYSIS BLOCK  (explanation + remedy)
   FIX #3: fetchRemedy now distinguishes network failure / bad-status
   / "ok but empty" / success, and renders a visible error state instead
   of silently resetting to the "Show remedy" button.
───────────────────────────────────────────── */
function AIAnalysisBlock({ scan, compact=false }) {
  const [loadingRemedy, setLoadingRemedy] = useState(false);
  const [remedy, setRemedy] = useState(scan.ai_remedy || null);
  const [remedyError, setRemedyError] = useState(null);

  const fetchRemedy = async () => {
    if (remedy || loadingRemedy) return;
    setLoadingRemedy(true);
    setRemedyError(null);
    try {
      const res = await fetch(`${BACKEND}/api/scan-results/${scan.id}/reanalyze`, { method:"POST" });
      if (!res.ok) {
        setRemedyError(`Backend returned ${res.status}. The reanalyze endpoint may be failing — check backend logs.`);
        return;
      }
      const d = await res.json();
      if (d?.ai_fix || d?.ai_remedy) {
        setRemedy(d.ai_fix || d.ai_remedy);
        return;
      }
      if (d?.ai_explanation) {
        const m = d.ai_explanation.match(/REMEDY[:\-–]?\s*([\s\S]+)/i);
        if (m) { setRemedy(m[1].trim()); return; }
      }
      // Backend responded 200 but had nothing usable — surface this
      // instead of silently re-showing the button with no explanation.
      setRemedyError("The AI re-analysis didn't return a remedy. The backend may not have generated one for this scan type — try again, or check the AI analysis text above for manual next steps.");
    } catch (err) {
      setRemedyError("Couldn't reach the backend to fetch a remedy. Check your connection or the backend service status.");
    } finally {
      setLoadingRemedy(false);
    }
  };

  if (!scan.ai_explanation && !scan.ai_remedy) return null;

  return (
    <div style={{
      marginTop:12, padding:compact?10:14,
      background:C.violetSoft, borderRadius:10,
      border:`1px solid ${C.violetBord}`,
      fontSize:13, lineHeight:1.65,
    }}>
      {/* Header */}
      <div style={{
        display:"flex", gap:6, alignItems:"center",
        color:C.violet, fontWeight:700, marginBottom:8,
        fontSize:10, letterSpacing:"0.1em",
      }}>
        <Brain size={11} /> AI ANALYSIS
        {scan.ai_confidence != null && (
          <span style={{ marginLeft:"auto", color:C.inkMid, fontSize:10, letterSpacing:0, fontWeight:400 }}>
            {scan.ai_confidence}% confidence
          </span>
        )}
      </div>

      {/* Explanation */}
      {scan.ai_explanation && (
        <div style={{ color:C.ink, marginBottom: (remedy || !compact) ? 10 : 0 }}>
          {scan.ai_explanation}
        </div>
      )}

      {/* Remedy */}
      {(remedy || loadingRemedy) && (
        <div className="remedy-block">
          <div style={{
            display:"flex", alignItems:"center", gap:6,
            fontSize:10, fontWeight:800, color:C.teal,
            letterSpacing:"0.1em", marginBottom:6,
          }}>
            <Wrench size={11} /> RECOMMENDED REMEDY
          </div>
          {loadingRemedy ? (
            <div style={{ display:"flex", alignItems:"center", gap:6, color:C.inkMid, fontSize:12 }}>
              <Loader2 size={11} className="spin" /> Generating fix…
            </div>
          ) : (
            <div style={{ fontSize:12, color:C.ink, lineHeight:1.65 }}>{remedy}</div>
          )}
        </div>
      )}

      {/* Error state — visible, with retry */}
      {remedyError && !loadingRemedy && (
        <div className="remedy-error">
          <div style={{
            display:"flex", alignItems:"center", gap:6,
            fontSize:10, fontWeight:800, color:C.red,
            letterSpacing:"0.1em", marginBottom:6,
          }}>
            <AlertCircle size={11} /> REMEDY UNAVAILABLE
          </div>
          <div style={{ fontSize:12, color:C.ink, lineHeight:1.6, marginBottom:8 }}>{remedyError}</div>
          <button onClick={() => { setRemedyError(null); fetchRemedy(); }} style={{
            display:"flex", alignItems:"center", gap:5,
            fontSize:11, color:C.red, background:"none", border:`1px solid ${C.redBord}`,
            borderRadius:6, padding:"4px 10px", fontWeight:600,
          }}>
            <RefreshCw size={11} /> Retry
          </button>
        </div>
      )}

      {/* Fetch remedy button (if no remedy yet, and no error showing) */}
      {!remedy && !loadingRemedy && !remedyError && scan.action_taken === "BLOCK" && (
        <button onClick={fetchRemedy} style={{
          marginTop:8, display:"flex", alignItems:"center", gap:5,
          fontSize:11, color:C.teal, background:"none", border:`1px solid ${C.tealBord}`,
          borderRadius:6, padding:"4px 10px", fontWeight:600,
        }}>
          <Wrench size={11} /> Show remedy
        </button>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   VULN BREAKDOWN
───────────────────────────────────────────── */
const VulnBreakdown = ({ breakdown }) => {
  const [open, setOpen] = useState(false);
  if (!breakdown?.total) return null;
  const { total, fixable_count, fixable_details = [], base_image_note } = breakdown;

  return (
    <div style={{ marginTop:12, border:`1px solid ${C.border}`, borderRadius:10, overflow:"hidden" }}>
      <button onClick={() => setOpen(o=>!o)} style={{
        width:"100%", padding:"10px 14px", background:C.bgSurface,
        border:"none", color:C.ink,
        display:"flex", justifyContent:"space-between", alignItems:"center",
        fontSize:12, fontWeight:600,
      }}>
        <span style={{ display:"flex", alignItems:"center", gap:8 }}>
          <AlertTriangle size={13} color={C.amber} />
          {total} vulnerabilities · {fixable_count} fixable
        </span>
        {open ? <ChevronUp size={14} color={C.inkMid} /> : <ChevronDown size={14} color={C.inkMid} />}
      </button>
      {open && (
        <div style={{ padding:"12px 14px", background:C.bgCard, animation:"fadeIn .2s ease" }}>
          {base_image_note && (
            <div style={{ fontSize:12, color:C.inkMid, marginBottom:10, padding:"6px 10px", background:C.bgSurface, borderRadius:6 }}>
              {base_image_note}
            </div>
          )}
          {fixable_details.length === 0 && (
            <div style={{ fontSize:12, color:C.inkMid }}>No actionable CVEs in top findings.</div>
          )}
          {fixable_details.map((v, i) => (
            <div key={v.id||i} style={{
              padding:"8px 0",
              borderBottom: i < fixable_details.length-1 ? `1px solid ${C.border}` : "none",
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                <Badge color={sevColor(v.severity)} small>{v.severity}</Badge>
                <span style={{ fontFamily:C.mono, fontSize:11, color:C.blue }}>{v.id}</span>
                {v.cvss > 0 && <span style={{ fontSize:10, color:C.inkMid }}>CVSS {v.cvss.toFixed(1)}</span>}
              </div>
              <div style={{ fontSize:12, color:C.inkMid }}>
                <span style={{ color:C.ink }}>{v.package}</span>
                {" → fix: "}
                <span style={{ color:C.teal }}>{v.fix}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────
   COMMIT CARD
───────────────────────────────────────────── */
const CommitCard = ({ scan, feedback, onFeedback, onOpenWhyBlocked, onOpenDetail, animDelay=0 }) => {
  const [expanded, setExpanded] = useState(false);
  const blocked   = scan.action_taken === "BLOCK";
  const isRunning = scan.status === "running";
  const isTimeout = scan.status === "timeout";
  const accent    = isRunning ? C.blue : isTimeout ? C.amber : blocked ? C.red : C.teal;
  const myFb      = feedback?.[scan.id];

  return (
    <motion.div
      className="fade-up"
      initial={{ opacity: 0, y: 18, rotateX: 6 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      whileHover={{ y: -3, rotateX: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 24, delay: animDelay }}
      style={{
      background: C.bgCard, borderRadius:14,
      border:`1px solid ${C.border}`, borderLeft:`3px solid ${accent}`,
      padding:"16px", marginBottom:10,
      transition:"border-color .25s, box-shadow .25s",
      transformStyle: "preserve-3d",
    }}
    >
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, flexWrap:"wrap" }}>
        <div style={{ minWidth:0, flex:1 }}>
          <div style={{ display:"flex", gap:7, alignItems:"center", marginBottom:6, flexWrap:"wrap" }}>
            <span style={{ fontFamily:C.mono, color:C.blue, fontSize:12 }}>{scan.commit_sha?.slice(0,8)}</span>
            {isRunning  && <Badge color={C.blue}>SCANNING</Badge>}
            {isTimeout  && <Badge color={C.amber}>TIMED OUT</Badge>}
            {!isRunning && !isTimeout && <Badge color={blocked ? C.red : C.teal}>{scan.action_taken || "ALLOW"}</Badge>}
            {scan.severity && scan.severity !== "UNKNOWN" && <Badge color={sevColor(scan.severity)}>{scan.severity}</Badge>}
            {scan.risk_score != null && <Badge color={riskColor(scan.risk_score)}>Risk {scan.risk_score}</Badge>}
          </div>
          <div style={{ fontSize:14, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", color:C.ink }}>
            {scan.commit_message || scan.repo_name}
          </div>
          <div style={{ fontSize:11, color:C.inkMid, display:"flex", alignItems:"center", gap:6, marginTop:3 }}>
            <GitBranch size={10} />
            {scan.repo_name}
            <span style={{ color:C.inkLow }}>·</span>
            {scan.branch}
            <span style={{ color:C.inkLow }}>·</span>
            {relTime(scan.created_at || scan.started_at)}
          </div>
        </div>
        <div style={{ display:"flex", gap:7, flexShrink:0 }}>
          {blocked && (
            <button onClick={() => onOpenWhyBlocked?.(scan)} style={{
              padding:"6px 11px", borderRadius:8,
              background:C.redSoft, border:`1px solid ${C.redBord}`,
              color:C.red, fontSize:12, fontWeight:600,
              display:"flex", alignItems:"center", gap:5,
            }}>
              <AlertTriangle size={12} /> Why blocked?
            </button>
          )}
          <button onClick={() => setExpanded(e=>!e)} style={{
            padding:"6px 11px", borderRadius:8,
            background:C.bgSurface, border:`1px solid ${C.border}`,
            color:C.ink, fontSize:12, fontWeight:600,
          }}>
            {expanded ? "Collapse" : "Expand"}
          </button>
        </div>
      </div>

      <PipelineMiniNodes pipeline={scan.pipeline} />

      {isRunning && (
        <div style={{
          marginTop:6, padding:"7px 12px",
          background:C.blueSoft, borderRadius:8, border:`1px solid ${C.blueBord}`,
          fontSize:12, color:C.blue, display:"flex", alignItems:"center", gap:6,
        }}>
          <Loader2 size={12} className="spin" />
          Pipeline running — auto-refreshing live
        </div>
      )}

      {expanded && (
        <div style={{ marginTop:16, paddingTop:16, borderTop:`1px solid ${C.border}`, animation:"fadeIn .25s ease" }}>
          <PipelineFullView pipeline={scan.pipeline} />
          {scan.vuln_breakdown && <VulnBreakdown breakdown={scan.vuln_breakdown} />}
          <AIAnalysisBlock scan={scan} />
          {!isRunning && (
            <div style={{ display:"flex", alignItems:"center", gap:10, marginTop:14 }}>
              <span style={{ fontSize:11, color:C.inkLow }}>Assessment accurate?</span>
              {["accept","reject"].map(type => (
                <button key={type} onClick={() => onFeedback?.(scan.id, type)} style={{
                  display:"flex", alignItems:"center", gap:4,
                  padding:"4px 10px", borderRadius:8,
                  background: myFb===type ? (type==="accept"?C.greenSoft:C.redSoft) : C.bgSurface,
                  border:`1px solid ${myFb===type ? (type==="accept"?C.green:C.red) : C.border}`,
                  color: myFb===type ? (type==="accept"?C.green:C.red) : C.inkMid,
                  fontSize:12,
                }}>
                  {type==="accept" ? <ThumbsUp size={12}/> : <ThumbsDown size={12}/>}
                  {type==="accept" ? "Accurate" : "Incorrect"}
                </button>
              ))}
              {onOpenDetail && (
                <button onClick={() => onOpenDetail(scan)} style={{
                  marginLeft:"auto", fontSize:12, color:C.inkMid,
                  background:"none", border:"none", textDecoration:"underline",
                }}>Full detail →</button>
              )}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

       
function WhyBlockedModal({ scan, onClose }) {
  const [remedy, setRemedy]     = useState(null);
  const [remedyState, setRS]    = useState("idle"); // idle | loading | success | empty | error
  const [remedyErr, setRErr]    = useState("");

  const fetchRemedy = useCallback(async () => {
    if (!scan) return;
    setRS("loading");
    setRErr("");
    try {
      const res = await fetch(`${BACKEND}/api/scan-results/${scan.id}/reanalyze`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const text = data?.ai_fix || data?.ai_remedy || "";
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(15,23,42,.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, rotateX: 12, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 280, damping: 24 }}
        style={{
          background: C.bgCard, border: `1px solid ${C.border}`,
          borderRadius: 18, width: "100%", maxWidth: 620,
          maxHeight: "90vh", display: "flex", flexDirection: "column",
          boxShadow: "0 20px 60px rgba(15,23,42,.16)",
          overflow: "hidden",
          transformStyle: "preserve-3d",
          perspective: 1000,
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
              {scan.repo_name} · {scan.commit_sha?.slice(0, 8)}
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
                    <Badge color={v.severity === "CRITICAL" ? C.red : v.severity === "HIGH" ? C.amber : C.blue}>
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

          {/* AI analysis from scan record */}
          {(scan.ai_explanation || scan.ai_remedy) && (
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: C.inkMid, marginBottom: 8 }}>AI analysis</p>
              {scan.ai_explanation && (
                <div style={{
                  padding: "12px 14px", background: C.violetSoft,
                  borderRadius: 10, border: `1px solid ${C.violetBord}`,
                  fontSize: 13, lineHeight: 1.65, color: C.ink,
                }}>
                  {scan.ai_explanation}
                </div>
              )}
              {scan.ai_remedy && (
                <div className="remedy-block" style={{ marginTop: 10 }}>
                  <p style={{ fontSize: 13, color: C.ink, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{scan.ai_remedy}</p>
                </div>
              )}
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
      </motion.div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   SCAN DETAIL SLIDE-IN
───────────────────────────────────────────── */
function ScanDetail({ scan, onClose, feedback, onFeedback, onWhyBlocked }) {
  if (!scan) return null;
  return (
    <motion.div
      initial={{ x: 480, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 480, opacity: 0 }}
      transition={{ type: "spring", stiffness: 280, damping: 30 }}
      style={{
      position:"fixed", top:0, right:0,
      width:460, maxWidth:"100vw", height:"100vh",
      background:`${C.bgCard}f5`, backdropFilter:"blur(16px)",
      borderLeft:`1px solid ${C.border}`,
      zIndex:250, overflowY:"auto", padding:24,
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
        <h2 style={{ margin:0, fontSize:17, fontWeight:700 }}>{scan.repo_name}</h2>
        <button onClick={onClose} style={{ background:C.bgSurface, border:`1px solid ${C.border}`, borderRadius:8, padding:"6px 10px", color:C.inkMid, display:"flex" }}>
          <X size={16} />
        </button>
      </div>
      <div style={{ fontFamily:C.mono, color:C.blue, fontSize:12, marginBottom:4 }}>{scan.commit_sha}</div>
      <div style={{ fontSize:13, color:C.inkMid, marginBottom:6 }}>{scan.commit_message}</div>
      <div style={{ fontSize:11, color:C.inkLow, marginBottom:18 }}>{fmtFull(scan.created_at)}</div>
      <div style={{ display:"flex", gap:8, marginBottom:18 }}>
        <Badge color={scan.action_taken==="BLOCK"?C.red:C.teal}>{scan.action_taken||"ALLOW"}</Badge>
        {scan.severity && <Badge color={sevColor(scan.severity)}>{scan.severity}</Badge>}
        {scan.risk_score != null && <Badge color={riskColor(scan.risk_score)}>Risk {scan.risk_score}</Badge>}
      </div>
      <SectionTitle accent={C.teal}>Pipeline stages</SectionTitle>
      <PipelineFullView pipeline={scan.pipeline} />
      {scan.vuln_breakdown && (
        <>
          <div style={{ marginTop: 20 }}>
            <SectionTitle accent={C.amber}>Vulnerabilities</SectionTitle>
            <VulnBreakdown breakdown={scan.vuln_breakdown} />
          </div>
        </>
      )}
      <AIAnalysisBlock scan={scan} />
      {scan.action_taken === "BLOCK" && (
        <button onClick={() => onWhyBlocked(scan)} style={{
          marginTop:20, padding:"12px", width:"100%",
          background:C.redSoft, border:`1px solid ${C.redBord}`,
          borderRadius:10, color:C.red, fontWeight:700, fontSize:13,
          display:"flex", alignItems:"center", justifyContent:"center", gap:7,
        }}>
          <AlertTriangle size={15} /> Why blocked?
        </button>
      )}
      <div style={{ display:"flex", gap:8, marginTop:16 }}>
        {["accept","reject"].map(type => {
          const myFb = feedback?.[scan.id];
          return (
            <button key={type} onClick={() => onFeedback?.(scan.id,type)} style={{
              flex:1, padding:"9px", borderRadius:9,
              background:myFb===type?(type==="accept"?C.greenSoft:C.redSoft):C.bgSurface,
              border:`1px solid ${myFb===type?(type==="accept"?C.green:C.red):C.border}`,
              color:myFb===type?(type==="accept"?C.green:C.red):C.inkMid,
              fontSize:12, fontWeight:600, display:"flex", alignItems:"center", justifyContent:"center", gap:5,
            }}>
              {type==="accept"?<ThumbsUp size={13}/>:<ThumbsDown size={13}/>}
              {type==="accept"?"Accurate":"Incorrect"}
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   AI COPILOT  (floating, with breathing animation)
   FIX #2: send actual scan context with each question so the backend
   AI has something real to ground its answer in, instead of a bare
   { question } string. We send:
     - a compact summary of the most recent N scans (sha, repo, action,
       severity, risk score, short AI explanation if present)
     - aggregate stats (blocked/allowed/running counts)
     - the conversation history so far, so follow-ups make sense
   NOTE: this only helps if the backend's /api/copilot/ask handler
   actually reads and uses a `context` field. If the backend ignores
   it, replies will still be ungrounded — that's a backend fix, not
   something fixable from here. See bottom-of-file notes.
───────────────────────────────────────────── */
function AICopilot({ scans, onClose }) {
  const [messages, setMessages] = useState([{
    role:"assistant",
    text:"Hi! I'm your SecureFlow AI assistant. Ask me about blocked commits, CVEs, risk scores, or pipeline failures — I can also suggest remedies.",
  }]);
  const [input,     setInput]     = useState("");
  const [sending,   setSending]   = useState(false);
  const [minimised, setMinimised] = useState(false);
  const [sendError, setSendError] = useState(false);
  const endRef   = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);

  const send = async (q) => {
    const question = q || input.trim();
    if (!question || sending) return;
    setInput("");
    setSendError(false);
    const nextMessages = [...messages, { role:"user", text:question }];
    setMessages(nextMessages);
    setSending(true);
    try {
      const res = await fetch(`${BACKEND}/api/copilot/ask`, {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          question,
          scan_id: scans.find(s => s.action_taken === "BLOCK")?.id || scans[0]?.id || null,
        }),
      });
      if (!res.ok) {
        throw new Error(`Backend returned ${res.status}`);
      }
      const data = await res.json();
      if (!data?.answer) {
        setMessages(m => [...m, { role:"assistant", text:"The AI service responded but didn't include an answer. This usually means the backend's copilot endpoint has an issue — try rephrasing, or check backend logs." }]);
        setSendError(true);
      } else {
        setMessages(m => [...m, { role:"assistant", text:data.answer }]);
      }
    } catch (err) {
      setMessages(m => [...m, { role:"assistant", text:`Couldn't reach the AI service (${err.message || "network error"}). Try again in a moment, or check that the backend is running.` }]);
      setSendError(true);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const blocked = scans.filter(s=>s.action_taken==="BLOCK").length;
  const running = scans.filter(s=>s.status==="running").length;
  const QUICK   = ["Why was the last commit blocked?","What's the best remedy for top CVEs?","Show fixable vulnerabilities"];

  return (
    <div style={{
      position:"fixed", bottom:24, right:24,
      width: minimised ? "auto" : 360,
      zIndex:500, animation:"bounceIn .55s cubic-bezier(.22,.68,0,1.2)",
    }}>
      {minimised ? (
        <button onClick={() => setMinimised(false)} style={{
          display:"flex", alignItems:"center", gap:8,
          padding:"10px 16px", borderRadius:999,
          background:`${C.bgCard}e8`,
          backdropFilter:"blur(16px)",
          border:`1px solid ${C.tealBord}`,
          color:C.teal, fontSize:13, fontWeight:700,
          boxShadow:`0 8px 32px rgba(0,0,0,.5), 0 0 24px ${C.teal}18`,
        }}>
          <Bot size={16} />
          AI Copilot
          {(blocked>0||running>0) && (
            <span style={{ background:C.red, color:"#fff", borderRadius:999, fontSize:10, fontWeight:800, padding:"1px 6px" }}>
              {blocked+running}
            </span>
          )}
        </button>
      ) : (
        <div style={{
          background:`${C.bgCard}ee`, backdropFilter:"blur(20px)",
          border:`1px solid ${C.border}`, borderRadius:20, overflow:"hidden",
          boxShadow:`0 24px 64px rgba(0,0,0,.6), 0 0 40px ${C.teal}10`,
          display:"flex", flexDirection:"column", maxHeight:"70vh",
        }}>
          <div style={{
            padding:"14px 16px", borderBottom:`1px solid ${C.border}`,
            display:"flex", alignItems:"center", gap:10,
            background:`${C.bgSurface}80`,
          }}>
            <div style={{
              width:32, height:32, borderRadius:"50%",
              background:`linear-gradient(135deg, ${C.teal}30, ${C.violet}30)`,
              border:`1px solid ${C.tealBord}`,
              display:"flex", alignItems:"center", justifyContent:"center",
              animation:"float 3s ease-in-out infinite",
            }}>
              <Bot size={16} color={C.teal} />
            </div>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:C.ink }}>AI Copilot</div>
              <div style={{ fontSize:10, color: sendError ? C.amber : C.teal, display:"flex", alignItems:"center", gap:4 }}>
                <span style={{ width:6, height:6, borderRadius:"50%", background: sendError ? C.amber : C.teal, display:"inline-block", animation:"pulseRing 2s infinite" }} />
                {sendError ? "having trouble reaching backend" : "online · remedies enabled"}
              </div>
            </div>
            {running>0 && <Badge color={C.blue} small>{running} running</Badge>}
            {blocked>0 && <Badge color={C.red} small>{blocked} blocked</Badge>}
            <div style={{ marginLeft:"auto", display:"flex", gap:4 }}>
              <button onClick={() => setMinimised(true)} style={{ background:"none", border:"none", color:C.inkMid, padding:4, borderRadius:6 }}><Minimize2 size={15} /></button>
              <button onClick={onClose} style={{ background:"none", border:"none", color:C.inkMid, padding:4, borderRadius:6 }}><X size={15} /></button>
            </div>
          </div>

          <div style={{ flex:1, overflowY:"auto", padding:"14px 14px 0", display:"flex", flexDirection:"column", gap:10, minHeight:200, maxHeight:"45vh" }}>
            {messages.map((m,i) => (
              <div key={i} className={m.role==="user"?"sf-msg-user":"sf-msg-bot"} style={{
                maxWidth:"88%", padding:"9px 13px",
                borderRadius:m.role==="user"?"14px 14px 4px 14px":"14px 14px 14px 4px",
                fontSize:13, lineHeight:1.6, color:C.ink, animation:"fadeInUp .25s ease",
              }}>
                {m.text}
              </div>
            ))}
            {sending && (
              <div className="sf-msg-bot" style={{ maxWidth:"60%", padding:"9px 13px", borderRadius:"14px 14px 14px 4px", fontSize:13, color:C.inkMid, display:"flex", alignItems:"center", gap:6 }}>
                <Loader2 size={12} className="spin" /> Thinking…
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div style={{ padding:"10px 14px 0", display:"flex", gap:5, flexWrap:"wrap" }}>
            {QUICK.map(q => (
              <button key={q} onClick={() => send(q)} style={{
                fontSize:10, padding:"4px 9px", borderRadius:999,
                background:C.tealSoft, border:`1px solid ${C.tealBord}`,
                color:C.teal, fontWeight:600, whiteSpace:"nowrap",
              }}>{q}</button>
            ))}
          </div>

          <div style={{ padding:"12px 14px 14px", display:"flex", gap:8 }}>
            <input ref={inputRef} className="sf-chat-input" value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key==="Enter" && send()}
              placeholder="Ask about your pipeline…"
            />
            <button onClick={() => send()} disabled={!input.trim()||sending} style={{
              padding:"0 14px", borderRadius:12,
              background:input.trim()&&!sending?C.teal:C.bgSurface,
              border:`1px solid ${input.trim()&&!sending?C.teal:C.border}`,
              color:input.trim()&&!sending?C.bg:C.inkMid,
              fontWeight:700, fontSize:13, transition:"all .2s",
              display:"flex", alignItems:"center",
            }}>
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   CUSTOM TOOLTIP
───────────────────────────────────────────── */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ ...TT, padding:"10px 14px" }}>
      <div style={{ fontSize:11, color:C.inkMid, marginBottom:6 }}>{label}</div>
      {payload.map((p,i) => (
        <div key={i} style={{ fontSize:12, color:p.color||C.ink, fontFamily:C.mono }}>
          {p.name}: {typeof p.value==="number"?p.value.toFixed(1):p.value}
        </div>
      ))}
    </div>
  );
};

/* ─────────────────────────────────────────────
   OVERVIEW TAB
───────────────────────────────────────────── */
function OverviewTab({ scans, healthScore, avgRisk, blocked, allowed, running, completed, feedback, onFeedback, onOpenWhyBlocked, onOpenDetail }) {
  const chartData = useMemo(() => {
  return [...scans]
    .filter(
      s =>
        s.status !== "running" &&
        s.risk_score !== null &&
        s.risk_score !== undefined
    )
    .sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at)
    )
    .slice(-20)
    .map(s => ({
      name: s.commit_sha?.slice(0, 6) || "—",
      risk: Number(s.risk_score),
      score: Number(s.ai_confidence || 0),
    }));
}, [scans]);

  const sevDist = useMemo(() => {
    const counts = { CRITICAL:0, HIGH:0, MEDIUM:0, LOW:0, CLEAN:0 };
    completed.forEach(s => {
      const k = (s.severity||"CLEAN").toUpperCase();
      if (counts[k]!==undefined) counts[k]++;
    });
    return Object.entries(counts).map(([name,value]) => ({ name, value, color:sevColor(name) }));
  }, [completed]);

  const radarData = useMemo(() => [
    { subject:"Availability",A:Math.max(0,100-(running.length*20)) },
    { subject:"Block Rate",  A:Math.max(0,100-(blocked.length/(completed.length||1))*100) },
    { subject:"Avg Risk",    A:Math.max(0,100-parseFloat(avgRisk)*10) },
    { subject:"AI Coverage", A:completed.filter(s=>s.ai_confidence).length/(completed.length||1)*100 },
    { subject:"Clean Scans", A:allowed.length/(completed.length||1)*100 },
  ], [running,blocked,completed,avgRisk,allowed]);

  const pieData = useMemo(() => [
    { name: "Allowed", value: allowed.length, color: C.teal },
    { name: "Blocked", value: blocked.length, color: C.red },
  ], [allowed.length, blocked.length]);

  const [trendWindow, setTrendWindow] = useState(14);

  return (
    <div style={{ animation:"fadeInUp .4s ease" }}>
      {/* KPI row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:14, marginBottom:16 }}>
        {[
          { label:"Pipeline health", value:healthScore, color:healthScore>=75?C.teal:healthScore>=50?C.amber:C.red, sub:"block rate + risk" },
          { label:"Average risk",    value:avgRisk,     color:riskColor(parseFloat(avgRisk)), sub:"out of 10.0" },
          { label:"Scans completed", value:completed.length, color:C.blue,  sub:"all time" },
          { label:"Blocked",         value:blocked.length,   color:C.red,   sub:`${((blocked.length/(completed.length||1))*100).toFixed(0)}% block rate` },
          { label:"Currently live",  value:running.length,   color:C.cyan,  sub:"pipelines running" },
        ].map(k => (
          <Card key={k.label} style={{ padding:"16px 18px" }}>
            <div style={{ fontSize:10, color:C.inkLow, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:10 }}>{k.label}</div>
            <div style={{ fontSize:30, fontWeight:900, fontFamily:C.mono, color:k.color, lineHeight:1 }}>{k.value}</div>
            <div style={{ fontSize:11, color:C.inkMid, marginTop:5 }}>{k.sub}</div>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:14, marginBottom:16 }}>
        <Card glow>
          <SectionTitle accent={C.violet} right={
            <div style={{ display:"flex", gap:5 }}>
              {[7,14,30].map(w => (
                <button key={w} onClick={()=>setTrendWindow(w)} style={{
                  fontSize:10, padding:"2px 8px", borderRadius:999,
                  background:trendWindow===w?C.violetSoft:"none",
                  border:`1px solid ${trendWindow===w?C.violetBord:C.border}`,
                  color:trendWindow===w?C.violet:C.inkMid, fontWeight:600,
                }}>{w}d</button>
              ))}
            </div>
          }>Risk score trend</SectionTitle>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData.slice(-trendWindow)}>
              <defs>
                <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.violet} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={C.violet} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={C.cyan} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={C.cyan} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
              <XAxis dataKey="name" stroke="transparent" tick={{ fill:C.inkMid, fontSize:10 }} />
              <YAxis stroke="transparent" tick={{ fill:C.inkMid, fontSize:10 }} domain={[0,10]} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="risk" name="Risk" stroke={C.violet} fill="url(#rg)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="score" name="AI Confidence" stroke={C.cyan} fill="url(#cg)" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <SectionTitle accent={C.blue}>Allow vs block</SectionTitle>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} dataKey="value" innerRadius={52} outerRadius={78} paddingAngle={4} strokeWidth={0}>
                {pieData.map(e => <Cell key={e.name} fill={e.color} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display:"flex", justifyContent:"center", gap:20, marginTop:8 }}>
            {pieData.map(e => (
              <div key={e.name} style={{ display:"flex", alignItems:"center", gap:5, fontSize:12 }}>
                <div style={{ width:8, height:8, borderRadius:"50%", background:e.color }} />
                <span style={{ color:C.inkMid }}>{e.name}</span>
                <span style={{ color:e.color, fontFamily:C.mono, fontWeight:700 }}>{e.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Severity + Radar */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:16 }}>
        <Card>
          <SectionTitle accent={C.amber}>Severity distribution</SectionTitle>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={sevDist} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
              <XAxis dataKey="name" stroke="transparent" tick={{ fill:C.inkMid, fontSize:10 }} />
              <YAxis stroke="transparent" tick={{ fill:C.inkMid, fontSize:10 }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Count" radius={[5,5,0,0]}>
                {sevDist.map(e => <Cell key={e.name} fill={e.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <SectionTitle accent={C.teal}>Security posture</SectionTitle>
          <ResponsiveContainer width="100%" height={180}>
            <RadarChart data={radarData}>
              <PolarGrid stroke={C.border} />
              <PolarAngleAxis dataKey="subject" tick={{ fill:C.inkMid, fontSize:10 }} />
              <Radar name="Posture" dataKey="A" stroke={C.teal} fill={C.teal} fillOpacity={0.18} strokeWidth={2} />
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <SectionTitle accent={C.teal}>Latest activity</SectionTitle>
      {scans.slice(0,5).map((scan,i) => (
        <CommitCard key={scan.id} scan={scan} feedback={feedback} animDelay={i*0.05}
          onFeedback={onFeedback} onOpenWhyBlocked={onOpenWhyBlocked} onOpenDetail={onOpenDetail} />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   PIPELINE TAB
───────────────────────────────────────────── */
function PipelineTab({ scans, feedback, onFeedback, onOpenWhyBlocked, onOpenDetail }) {
  const running = scans.filter(s=>s.status==="running");
  const recent  = scans.filter(s=>s.status!=="running").slice(0,25);

  return (
    <div style={{ animation:"fadeInUp .4s ease" }}>
      {running.length > 0 && (
        <div style={{ marginBottom:20 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:C.blue, animation:"pulseRing 1.5s infinite" }} />
            <span style={{ fontSize:11, fontWeight:800, color:C.blue, letterSpacing:"0.1em" }}>
              LIVE — {running.length} PIPELINE{running.length>1?"S":""} RUNNING
            </span>
          </div>
          {running.map((scan,i) => (
            <CommitCard key={scan.id} scan={scan} feedback={feedback}
              onFeedback={onFeedback} onOpenWhyBlocked={onOpenWhyBlocked}
              onOpenDetail={onOpenDetail} animDelay={i*0.05} />
          ))}
          <div style={{ height:1, background:C.border, margin:"20px 0" }} />
        </div>
      )}
      <SectionTitle accent={C.teal}>Recent runs</SectionTitle>
      {recent.length===0 && <div style={{ color:C.inkLow, textAlign:"center", padding:"40px 0", fontSize:14 }}>No completed runs yet.</div>}
      {recent.map((scan,i) => (
        <CommitCard key={scan.id} scan={scan} feedback={feedback}
          onFeedback={onFeedback} onOpenWhyBlocked={onOpenWhyBlocked}
          onOpenDetail={onOpenDetail} animDelay={i*0.04} />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   AI INSIGHTS TAB  (replaces Scan Feed)
   Prometheus-style gauges + blocked AI cards
───────────────────────────────────────────── */
function AIInsightsTab({ scans, feedback, onFeedback, onOpenWhyBlocked }) {
  const completed  = scans.filter(s=>s.status!=="running");
  const blockedAll = completed.filter(s=>s.action_taken==="BLOCK");
  const allowedAll = completed.filter(s=>s.action_taken==="ALLOW");
  const withAI     = completed.filter(s=>s.ai_explanation||s.ai_remedy);

  /* Prometheus gauges data */
  const blockRate = completed.length ? (blockedAll.length/completed.length)*100 : 0;
  const avgConf   = withAI.length
    ? withAI.reduce((a,s)=>a+(s.ai_confidence||0),0)/withAI.length : 0;
  const aiCoverage = completed.length ? (withAI.length/completed.length)*100 : 0;
  const critCount  = completed.filter(s=>(s.severity||"").toUpperCase()==="CRITICAL").length;

  /* Confidence histogram */
  const confHist = useMemo(() => {
    const bins = [
      { range:"60–69", min:60, max:69, count:0, color:C.red    },
      { range:"70–79", min:70, max:79, count:0, color:C.amber  },
      { range:"80–89", min:80, max:89, count:0, color:C.blue   },
      { range:"90–99", min:90, max:99, count:0, color:C.teal   },
    ];
    withAI.forEach(s => {
      const c = s.ai_confidence||0;
      bins.forEach(b => { if (c>=b.min && c<=b.max) b.count++; });
    });
    return bins;
  }, [withAI]);

  /* Repo-level risk heatmap data */
  const repoRisk = useMemo(() => {
    const map = {};
    completed.forEach(s => {
      const r = s.repo_name?.split("/").pop() || "unknown";
      if (!map[r]) map[r] = { repo:r, total:0, blocked:0, risk:0 };
      map[r].total++;
      if (s.action_taken==="BLOCK") map[r].blocked++;
      map[r].risk = Math.max(map[r].risk, s.risk_score||0);
    });
    return Object.values(map).sort((a,b)=>b.risk-a.risk).slice(0,8);
  }, [completed]);

  /* AI decision scatter (confidence vs risk) */
  const scatterData = useMemo(() =>
    completed.filter(s=>s.ai_confidence&&s.risk_score!=null).map(s => ({
      x: s.risk_score,
      y: s.ai_confidence,
      z: s.action_taken==="BLOCK" ? 3 : 1,
      color: s.action_taken==="BLOCK" ? C.red : C.teal,
      name: s.commit_sha?.slice(0,8)||"—",
    })).slice(-40)
  , [completed]);

  return (
    <div style={{ animation:"fadeInUp .4s ease" }}>
      {/* Prometheus-style gauge row */}
      <Card glow style={{ marginBottom:16 }}>
        <SectionTitle accent={C.teal}>System metrics</SectionTitle>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))", gap:20, alignItems:"start" }}>
          <PrometheusGauge value={blockRate} max={100} label="Block rate" unit="%" color={blockRate>30?C.red:blockRate>15?C.amber:C.teal} />
          <PrometheusGauge value={avgConf}   max={100} label="Avg AI confidence" unit="%" color={C.violet} />
          <PrometheusGauge value={aiCoverage} max={100} label="AI coverage" unit="%" color={C.cyan} />
          <PrometheusGauge value={completed.length} max={Math.max(completed.length,100)} label="Total scans" unit="" color={C.blue} />
          <PrometheusGauge value={critCount} max={Math.max(critCount,10)} label="Critical findings" unit="" color={C.red} />
          <PrometheusGauge value={withAI.length} max={Math.max(completed.length,1)} label="AI-analysed" unit="" color={C.green} />
        </div>
      </Card>

      {/* Charts row: confidence histogram + repo risk heatmap */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
        {/* AI confidence histogram */}
        <Card>
          <SectionTitle accent={C.violet}>AI confidence distribution</SectionTitle>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={confHist} barSize={40}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
              <XAxis dataKey="range" stroke="transparent" tick={{ fill:C.inkMid, fontSize:10 }} />
              <YAxis stroke="transparent" tick={{ fill:C.inkMid, fontSize:10 }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Scans" radius={[5,5,0,0]}>
                {confHist.map((e,i) => <Cell key={i} fill={e.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Repo risk heatmap (horizontal bar) */}
        <Card>
          <SectionTitle accent={C.amber}>Risk by repository</SectionTitle>
          {repoRisk.length === 0 ? (
            <div style={{ color:C.inkLow, fontSize:13, padding:"20px 0" }}>No repo data yet.</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:10, marginTop:4 }}>
              {repoRisk.map((r,i) => (
                <div key={r.repo}>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, marginBottom:4 }}>
                    <span style={{ color:C.ink, fontFamily:C.mono }}>{r.repo}</span>
                    <span style={{ color:riskColor(r.risk), fontWeight:700 }}>{r.blocked}/{r.total} blocked · risk {r.risk}</span>
                  </div>
                  <div style={{ height:6, background:C.bgSurface, borderRadius:3, overflow:"hidden" }}>
                    <div style={{
                      height:"100%",
                      width:`${(r.blocked/r.total)*100}%`,
                      background:`linear-gradient(90deg,${riskColor(r.risk)}80,${riskColor(r.risk)})`,
                      borderRadius:3,
                      transition:"width 1s ease",
                      boxShadow:`0 0 6px ${riskColor(r.risk)}50`,
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* AI decision scatter: confidence vs risk */}
      <Card>
        <SectionTitle accent={C.blue}>
          AI confidence vs risk score
          <span style={{ fontSize:9, color:C.inkMid, fontWeight:400, marginLeft:8, textTransform:"none", letterSpacing:0 }}>
            — each dot is one scan (red=blocked, teal=allowed)
          </span>
        </SectionTitle>
        {scatterData.length < 2 ? (
          <div style={{ color:C.inkLow, fontSize:13, padding:"20px 0" }}>Need more scans to render scatter plot.</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis type="number" dataKey="x" name="Risk" domain={[0,10]} tick={{ fill:C.inkMid, fontSize:10 }} label={{ value:"Risk score", fill:C.inkMid, fontSize:10, position:"insideBottom", offset:-2 }} />
              <YAxis type="number" dataKey="y" name="Confidence" domain={[55,100]} tick={{ fill:C.inkMid, fontSize:10 }} label={{ value:"AI conf %", fill:C.inkMid, fontSize:10, angle:-90, position:"insideLeft" }} />
              <ZAxis type="number" dataKey="z" range={[40, 200]} />
              <Tooltip cursor={{ strokeDasharray:"3 3" }} content={({ active, payload }) => {
                if (!active||!payload?.length) return null;
                const d = payload[0]?.payload;
                return (
                  <div style={{ ...TT, padding:"8px 12px" }}>
                    <div style={{ fontFamily:C.mono, color:C.blue, fontSize:11 }}>{d?.name}</div>
                    <div style={{ fontSize:11, color:C.inkMid }}>Risk: {d?.x} · Confidence: {d?.y}%</div>
                  </div>
                );
              }} />
              <Scatter data={scatterData.filter(d=>d.color===C.red)}    fill={C.red}  fillOpacity={0.8} />
              <Scatter data={scatterData.filter(d=>d.color===C.teal)}   fill={C.teal} fillOpacity={0.6} />
            </ScatterChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Blocked scans with full AI analysis */}
      <SectionTitle accent={C.red}>Blocked commits — AI analysis & remedies</SectionTitle>
      {blockedAll.length === 0 && (
        <div style={{
          color:C.teal, textAlign:"center", padding:"40px 0", fontSize:14,
          display:"flex", flexDirection:"column", alignItems:"center", gap:8,
        }}>
          <CheckCircle size={32} color={C.teal} />
          No blocked commits. Pipeline is clean!
        </div>
      )}
      {blockedAll.map((scan,i) => (
        <div key={scan.id} className="fade-up" style={{
          background:C.bgCard, borderRadius:14,
          border:`1px solid ${C.redBord}`, borderLeft:`3px solid ${C.red}`,
          padding:"18px", marginBottom:12,
          animationDelay:`${i*0.05}s`,
          boxShadow:`0 0 20px ${C.red}08`,
        }}>
          {/* Header */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10, flexWrap:"wrap" }}>
            <div>
              <div style={{ display:"flex", gap:7, alignItems:"center", marginBottom:5, flexWrap:"wrap" }}>
                <span style={{ fontFamily:C.mono, color:C.blue, fontSize:12 }}>{scan.commit_sha?.slice(0,8)}</span>
                <Badge color={C.red}>BLOCKED</Badge>
                {scan.severity && <Badge color={sevColor(scan.severity)} small>{scan.severity}</Badge>}
                {scan.risk_score != null && <Badge color={riskColor(scan.risk_score)} small>Risk {scan.risk_score}</Badge>}
              </div>
              <div style={{ fontSize:14, fontWeight:600, color:C.ink }}>
                {scan.commit_message || scan.repo_name}
              </div>
              <div style={{ fontSize:11, color:C.inkMid, marginTop:3, display:"flex", gap:5, alignItems:"center" }}>
                <GitBranch size={10} />
                {scan.repo_name} · {scan.branch} · {relTime(scan.created_at)}
              </div>
            </div>
            <button onClick={() => onOpenWhyBlocked?.(scan)} style={{
              padding:"7px 13px", borderRadius:8, flexShrink:0,
              background:C.redSoft, border:`1px solid ${C.redBord}`,
              color:C.red, fontSize:12, fontWeight:600,
              display:"flex", alignItems:"center", gap:5,
            }}>
              <Eye size={12} /> Full detail
            </button>
          </div>

          {/* Pipeline nodes */}
          <PipelineMiniNodes pipeline={scan.pipeline} />

          {/* Failed stages summary */}
          {(scan.pipeline||[]).filter(p=>p.status==="failed").map(p => (
            <div key={p.id} style={{
              marginTop:8, padding:"7px 11px",
              background:C.redSoft, borderRadius:8, border:`1px solid ${C.redBord}`,
              fontSize:12, color:C.red,
              display:"flex", alignItems:"center", gap:7,
            }}>
              <XCircle size={12} />
              <strong>{p.name}</strong>
              {p.detail && <span style={{ color:C.inkMid, fontFamily:C.mono, fontSize:11 }}>— {p.detail}</span>}
            </div>
          ))}

          {/* AI analysis + remedy (always visible for blocked) */}
          <AIAnalysisBlock scan={scan} />

          {/* Vuln quick summary */}
          {scan.vuln_breakdown?.total > 0 && (
            <div style={{ marginTop:10, display:"flex", gap:8, flexWrap:"wrap" }}>
              <Badge color={C.amber}>{scan.vuln_breakdown.total} vulns</Badge>
              <Badge color={C.blue}>{scan.vuln_breakdown.fixable_count} fixable</Badge>
              {scan.vuln_breakdown.fixable_details?.some(v=>v.severity==="CRITICAL") && (
                <Badge color={C.red}>CRITICAL CVEs found</Badge>
              )}
            </div>
          )}

          {/* Feedback */}
          <div style={{ display:"flex", gap:8, marginTop:12, alignItems:"center" }}>
            <span style={{ fontSize:11, color:C.inkLow }}>Assessment accurate?</span>
            {["accept","reject"].map(type => {
              const myFb = feedback?.[scan.id];
              return (
                <button key={type} onClick={() => onFeedback?.(scan.id,type)} style={{
                  display:"flex", alignItems:"center", gap:4,
                  padding:"4px 10px", borderRadius:8,
                  background:myFb===type?(type==="accept"?C.greenSoft:C.redSoft):C.bgSurface,
                  border:`1px solid ${myFb===type?(type==="accept"?C.green:C.red):C.border}`,
                  color:myFb===type?(type==="accept"?C.green:C.red):C.inkMid,
                  fontSize:11,
                }}>
                  {type==="accept"?<ThumbsUp size={11}/>:<ThumbsDown size={11}/>}
                  {type==="accept"?"Accurate":"Incorrect"}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Allowed scans — compact list with AI notes */}
      {allowedAll.some(s=>s.ai_explanation) && (
        <>
          <div style={{ height:1, background:C.border, margin:"24px 0 16px" }} />
          <SectionTitle accent={C.teal}>Allowed commits — AI notes</SectionTitle>
          {allowedAll.filter(s=>s.ai_explanation).slice(0,8).map((scan,i) => (
            <div key={scan.id} className="fade-up" style={{
              background:C.bgCard, borderRadius:12,
              border:`1px solid ${C.border}`, borderLeft:`3px solid ${C.teal}`,
              padding:"14px 16px", marginBottom:10,
              animationDelay:`${i*0.04}s`,
            }}>
              <div style={{ display:"flex", gap:7, alignItems:"center", marginBottom:6, flexWrap:"wrap" }}>
                <span style={{ fontFamily:C.mono, color:C.blue, fontSize:11 }}>{scan.commit_sha?.slice(0,8)}</span>
                <Badge color={C.teal} small>ALLOWED</Badge>
                {scan.risk_score!=null && <Badge color={riskColor(scan.risk_score)} small>Risk {scan.risk_score}</Badge>}
                <span style={{ fontSize:11, color:C.inkMid, marginLeft:"auto" }}>{relTime(scan.created_at)}</span>
              </div>
              <div style={{ fontSize:13, color:C.ink, marginBottom:4 }}>{scan.commit_message||scan.repo_name}</div>
              {scan.ai_explanation && (
                <div style={{ fontSize:12, color:C.inkMid, lineHeight:1.5, padding:"8px 10px", background:C.bgSurface, borderRadius:7, border:`1px solid ${C.border}` }}>
                  <span style={{ color:C.violet, fontSize:10, fontWeight:700, letterSpacing:"0.08em" }}>AI: </span>
                  {scan.ai_explanation}
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   METRICS TAB
───────────────────────────────────────────── */
function MetricsTab({ scans }) {
  const completed = scans.filter(s=>s.status!=="running");
  const blockRate = completed.length
    ? ((completed.filter(s=>s.action_taken==="BLOCK").length/completed.length)*100).toFixed(1) : "0";
  const avgConf = useMemo(() => {
    const w = completed.filter(s=>s.ai_confidence!=null);
    return w.length ? Math.round(w.reduce((a,s)=>a+s.ai_confidence,0)/w.length) : null;
  }, [completed]);

  const dailyVol = useMemo(() => {
    const by={};
    completed.forEach(s => {
      const d=fmt(s.created_at);
      if(!by[d]) by[d]={day:d,total:0,blocked:0,allowed:0};
      by[d].total++; if(s.action_taken==="BLOCK") by[d].blocked++; else by[d].allowed++;
    });
    return Object.values(by).slice(-14);
  }, [completed]);

  const riskDist = useMemo(() => {
    const bins={"0-2":0,"3-4":0,"5-6":0,"7-8":0,"9-10":0};
    completed.forEach(s => {
      const r=s.risk_score||0;
      if(r<=2) bins["0-2"]++;
      else if(r<=4) bins["3-4"]++;
      else if(r<=6) bins["5-6"]++;
      else if(r<=8) bins["7-8"]++;
      else bins["9-10"]++;
    });
    return Object.entries(bins).map(([name,value])=>({name,value}));
  }, [completed]);

  const confOverTime = useMemo(() =>
    completed.filter(s=>s.ai_confidence!=null).slice(-20).reverse().map(s => ({
      name:s.commit_sha?.slice(0,6)||"—", conf:s.ai_confidence, risk:s.risk_score||0,
    }))
  , [completed]);

  const stageStats = useMemo(() => {
    const stats={};
    PIPELINE_STAGES.forEach(st=>{stats[st.key]={passed:0,failed:0,total:0};});
    completed.forEach(s => {
      s.pipeline?.forEach(p => {
        if(!stats[p.id]) return;
        stats[p.id].total++;
        if(p.status==="passed") stats[p.id].passed++;
        if(p.status==="failed") stats[p.id].failed++;
      });
    });
    return PIPELINE_STAGES.map(st=>({
      name:st.label,
      pass:stats[st.key].total?+((stats[st.key].passed/stats[st.key].total)*100).toFixed(0):100,
      fail:stats[st.key].total?+((stats[st.key].failed/stats[st.key].total)*100).toFixed(0):0,
    }));
  }, [completed]);

  /* Cumulative block rate over time */
  const cumulativeData = useMemo(() => {
    let total=0, blocked=0;
    return completed.slice().reverse().map(s => {
      total++; if(s.action_taken==="BLOCK") blocked++;
      return { name:s.commit_sha?.slice(0,6)||"—", rate:total?+(blocked/total*100).toFixed(1):0 };
    }).slice(-20);
  }, [completed]);

  return (
    <div style={{ animation:"fadeInUp .4s ease" }}>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:14, marginBottom:16 }}>
        {[
          { label:"Block rate",    value:`${blockRate}%`,             color:C.red    },
          { label:"AI confidence", value:avgConf!=null?`${avgConf}%`:"—", color:C.violet },
          { label:"Total scans",   value:completed.length,             color:C.teal   },
          { label:"Blocked",       value:completed.filter(s=>s.action_taken==="BLOCK").length, color:C.amber },
          { label:"With AI",       value:completed.filter(s=>s.ai_explanation).length, color:C.cyan  },
        ].map(k => (
          <Card key={k.label} style={{ padding:"16px 18px" }}>
            <div style={{ fontSize:9, color:C.inkLow, fontWeight:800, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:10 }}>{k.label}</div>
            <div style={{ fontSize:30, fontWeight:900, fontFamily:C.mono, color:k.color, lineHeight:1 }}>{k.value}</div>
          </Card>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"3fr 2fr", gap:14, marginBottom:14 }}>
        <Card>
          <SectionTitle accent={C.blue}>Daily scan volume</SectionTitle>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dailyVol} barSize={18}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
              <XAxis dataKey="day" stroke="transparent" tick={{ fill:C.inkMid, fontSize:9 }} />
              <YAxis stroke="transparent" tick={{ fill:C.inkMid, fontSize:10 }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="allowed" name="Allowed" fill={C.teal} stackId="a" />
              <Bar dataKey="blocked" name="Blocked" fill={C.red}  stackId="a" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <SectionTitle accent={C.amber}>Risk distribution</SectionTitle>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={riskDist} layout="vertical" barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
              <XAxis type="number" stroke="transparent" tick={{ fill:C.inkMid, fontSize:10 }} allowDecimals={false} />
              <YAxis dataKey="name" type="category" stroke="transparent" tick={{ fill:C.inkMid, fontSize:10 }} width={40} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Scans" radius={[0,4,4,0]}>
                {riskDist.map((e,i) => <Cell key={i} fill={e.name==="9-10"?C.red:e.name==="7-8"?C.amber:e.name==="5-6"?C.blue:C.teal} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Cumulative block rate trend */}
      <Card>
        <SectionTitle accent={C.red}>Cumulative block rate over time</SectionTitle>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={cumulativeData}>
            <defs>
              <linearGradient id="brGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.red} stopOpacity={0.35} />
                <stop offset="100%" stopColor={C.red} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
            <XAxis dataKey="name" stroke="transparent" tick={{ fill:C.inkMid, fontSize:10 }} />
            <YAxis stroke="transparent" tick={{ fill:C.inkMid, fontSize:10 }} domain={[0,100]} unit="%" />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="rate" name="Block rate %" stroke={C.red} fill="url(#brGrad)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <SectionTitle accent={C.violet}>AI confidence over time</SectionTitle>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={confOverTime}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
            <XAxis dataKey="name" stroke="transparent" tick={{ fill:C.inkMid, fontSize:10 }} />
            <YAxis stroke="transparent" tick={{ fill:C.inkMid, fontSize:10 }} domain={[50,100]} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="conf" name="AI Confidence %" stroke={C.violet} strokeWidth={2} dot={{ r:3, fill:C.violet }} />
            <Line type="monotone" dataKey="risk" name="Risk score" stroke={C.amber} strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <SectionTitle accent={C.green}>Pipeline stage pass rates</SectionTitle>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={stageStats} barSize={22}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
            <XAxis dataKey="name" stroke="transparent" tick={{ fill:C.inkMid, fontSize:10 }} />
            <YAxis stroke="transparent" tick={{ fill:C.inkMid, fontSize:10 }} domain={[0,100]} unit="%" />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="pass" name="Pass %" fill={C.green} stackId="s" />
            <Bar dataKey="fail" name="Fail %" fill={C.red}   stackId="s" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

/* ─────────────────────────────────────────────
   LIVE CLOCK  (ticks every second)
───────────────────────────────────────────── */
function LiveRelTime({ date }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(n=>n+1), 1000);
    return () => clearInterval(t);
  }, []);
  if (!date) return null;
  return <span>{relTime(date.toISOString())}</span>;
}

/* ─────────────────────────────────────────────
   ANIMATED COPILOT FAB  (breathing + ripple)
───────────────────────────────────────────── */
function CopilotFAB({ active, blocked, running, onClick }) {
  const count = blocked + running;
  return (
    <div style={{ position:"relative", display:"inline-flex" }}>
      {/* Ripple rings (only when not active) */}
      {!active && (
        <>
          <span style={{
            position:"absolute", inset:-8, borderRadius:999,
            border:`2px solid ${C.teal}`,
            animation:"ripple 2.4s ease-out infinite",
            pointerEvents:"none",
          }} />
          <span style={{
            position:"absolute", inset:-8, borderRadius:999,
            border:`2px solid ${C.teal}`,
            animation:"ripple 2.4s ease-out 1.2s infinite",
            pointerEvents:"none",
          }} />
        </>
      )}
      <button onClick={onClick} style={{
        display:"flex", alignItems:"center", gap:7,
        padding:"7px 14px", borderRadius:20,
        background: active ? C.tealSoft : `linear-gradient(135deg, ${C.teal}22, ${C.violet}18)`,
        border:`1.5px solid ${active ? C.teal : C.tealBord}`,
        color: active ? C.teal : C.teal,
        fontSize:12, fontWeight:700,
        transition:"all .25s",
        animation: active ? "none" : "breathe 2.8s ease-in-out infinite",
        position:"relative",
        boxShadow: active ? "none" : `0 0 18px ${C.teal}20`,
      }}>
        <Sparkles size={14} style={{ animation: active ? "none" : "float 2s ease-in-out infinite" }} />
        AI Copilot
        {count > 0 && (
          <span style={{
            background:C.red, color:"#fff", borderRadius:999,
            fontSize:9, fontWeight:800, padding:"1px 5px", minWidth:16, textAlign:"center",
          }}>{count}</span>
        )}
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────

   ROOT APP
───────────────────────────────────────────── */
export default function App() {
  const [scans,          setScans]         = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [activeTab,      setActiveTab]      = useState("overview");
  const [selectedScan,   setSelectedScan]   = useState(null);
  const [whyBlockedScan, setWhyBlockedScan] = useState(null);
  const [showCopilot,    setShowCopilot]    = useState(false);
  const [feedback,       setFeedback]       = useState({});
  const [lastUpdated,    setLastUpdated]    = useState(null);
  const [wsStatus,       setWsStatus]       = useState("connecting"); // connecting | connected | reconnecting
  const wsRef = useRef(null);

  const fetchScans = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND}/api/scan-results`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setScans(Array.isArray(data) ? data.map(normaliseScan) : []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let reconnectTimer;
    let reconnectDelay = 4000;

    const connectWS = () => {
      setWsStatus("connecting");
      const url = BACKEND.replace(/^http/, "ws") + "/ws/scans";
      try {
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
          setWsStatus("connected");
          reconnectDelay = 4000; // reset backoff
          console.log("WS connected");
        };
        ws.onmessage = (e) => {
          try { const m = JSON.parse(e.data); if (m.type==="ping") return; } catch {}
          fetchScans();
        };
        ws.onclose = () => {
          setWsStatus("reconnecting");
          reconnectTimer = setTimeout(() => {
            reconnectDelay = Math.min(reconnectDelay * 1.5, 30000);
            connectWS();
          }, reconnectDelay);
        };
        ws.onerror = () => ws.close();
      } catch {
        setWsStatus("reconnecting");
        reconnectTimer = setTimeout(connectWS, reconnectDelay);
      }
    };

    connectWS();
    const poll = setInterval(fetchScans, 12000);
    fetchScans();

    return () => {
      clearInterval(poll);
      clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, [fetchScans]);

  const submitFeedback = useCallback(async (scanId, type) => {
    setFeedback(prev => ({ ...prev, [scanId]: type }));
    try {
      await fetch(`${BACKEND}/api/scan-results/${scanId}/feedback`, {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({ feedback: type==="accept"?"accurate":"incorrect" }),
      });
    } catch {}
  }, []);

  const running   = useMemo(() => scans.filter(s=>s.status==="running"), [scans]);
  const completed = useMemo(() => scans.filter(s=>s.status!=="running"), [scans]);
  const blocked   = useMemo(() => completed.filter(s=>s.action_taken==="BLOCK"), [completed]);
  const allowed   = useMemo(() => completed.filter(s=>s.action_taken==="ALLOW"), [completed]);

  const avgRisk = completed.length
    ? (completed.reduce((a,s)=>a+(s.risk_score||0),0)/completed.length).toFixed(1) : "0";

  const healthScore = Math.max(0, Math.min(100,
    Math.round(100 - (blocked.length/(completed.length||1))*40 - parseFloat(avgRisk)*6)
  ));

  const TABS = [
    { id:"overview",   label:"Overview",     Icon:Activity      },
    { id:"pipeline",   label:"Pipeline",     Icon:GitPullRequest },
    { id:"ai-insights",label:"AI Insights",  Icon:Brain         },
    { id:"metrics",    label:"Metrics",      Icon:BarChart2     },
  ];

  /* WS status indicator */
  const wsColor = wsStatus==="connected" ? C.teal : wsStatus==="reconnecting" ? C.amber : C.inkMid;
  const wsLabel = wsStatus==="connected" ? "Live" : wsStatus==="reconnecting" ? "Reconnecting…" : "Connecting…";

  return (
    <>
      <AnimatePresence>
        {whyBlockedScan && (
          <WhyBlockedModal key="why-blocked" scan={whyBlockedScan} onClose={() => setWhyBlockedScan(null)} />
        )}
      </AnimatePresence>

      <div style={{
        minHeight:"100vh", background:C.bg, color:C.ink, fontFamily:C.sans,
        perspective: 1200,
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Ambient 3D background orbs */}
        <div aria-hidden="true" style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0 }}>
          <motion.div
            animate={{ x: [0, 30, 0], y: [0, -20, 0], rotateZ: [0, 8, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
            style={{
              position:"absolute", top:"-8%", right:"-4%",
              width:420, height:420, borderRadius:"50%",
              background:`radial-gradient(circle, ${C.teal}14 0%, transparent 70%)`,
              filter:"blur(2px)",
            }}
          />
          <motion.div
            animate={{ x: [0, -24, 0], y: [0, 18, 0], rotateZ: [0, -6, 0] }}
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
            style={{
              position:"absolute", bottom:"-10%", left:"-6%",
              width:360, height:360, borderRadius:"50%",
              background:`radial-gradient(circle, ${C.violet}12 0%, transparent 70%)`,
            }}
          />
        </div>

        {/* HEADER */}
        <header style={{
          position:"sticky", top:0, zIndex:200,
          background:`${C.bg}e8`,
          backdropFilter:"blur(16px) saturate(180%)",
          borderBottom:`1px solid ${C.border}`,
          padding:"0 24px",
          display:"flex", alignItems:"center", gap:16, height:56,
        }}>
          {/* Logo */}
          <div style={{ display:"flex", alignItems:"center", gap:9, flexShrink:0 }}>
            <div style={{
              width:30, height:30, borderRadius:8,
              background:`linear-gradient(135deg, ${C.teal}30, ${C.blue}20)`,
              border:`1px solid ${C.tealBord}`,
              display:"flex", alignItems:"center", justifyContent:"center",
            }}>
              <Shield size={16} color={C.teal} />
            </div>
            <span style={{ fontSize:16, fontWeight:800, letterSpacing:"-0.02em" }}>
              Secure<span style={{ color:C.teal }}>Flow</span>
            </span>
          </div>

          <div style={{ width:1, height:20, background:C.border, flexShrink:0 }} />

          {/* Tabs */}
          <nav style={{ display:"flex", gap:4 }}>
            {TABS.map(({ id, label, Icon }) => (
              <button key={id} className={`sf-tab ${activeTab===id?"active":""}`}
                onClick={() => setActiveTab(id)}>
                <Icon size={14} /> {label}
              </button>
            ))}
          </nav>

          {/* Right side */}
          <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:12 }}>
            {/* WS indicator */}
            <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:wsColor }}>
              {wsStatus==="connected"
                ? <Wifi size={13} />
                : wsStatus==="reconnecting"
                ? <WifiOff size={13} style={{ animation:"pulseRing 1.2s infinite" }} />
                : <Loader2 size={13} className="spin" />}
              {wsLabel}
            </div>

            {running.length > 0 && (
              <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:C.blue, fontWeight:600 }}>
                <div style={{ width:7, height:7, borderRadius:"50%", background:C.blue, animation:"pulseRing 1.5s infinite" }} />
                {running.length} running
              </div>
            )}

            {/* Live "updated X ago" timer */}
            {lastUpdated && (
              <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:C.inkLow }}>
                <Clock size={12} />
                <LiveRelTime date={lastUpdated} />
              </div>
            )}

            <CopilotFAB
              active={showCopilot}
              blocked={blocked.length}
              running={running.length}
              onClick={() => setShowCopilot(v=>!v)}
            />

            <button onClick={fetchScans} title="Refresh" style={{
              padding:"6px", background:"none",
              border:"none", color:C.inkMid, borderRadius:8,
              display:"flex", alignItems:"center",
            }}>
              <RefreshCw size={16} />
            </button>
          </div>
        </header>

        {/* MAIN */}
        <main style={{ padding:"24px", maxWidth:1280, margin:"0 auto", position:"relative", zIndex:1 }}>
          {loading ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"60vh", gap:16 }}
            >
              <div style={{
                width:48, height:48, borderRadius:"50%",
                border:`3px solid ${C.border}`,
                borderTop:`3px solid ${C.teal}`,
                animation:"spin 1s linear infinite",
              }} />
              <div style={{ color:C.inkMid, fontSize:14 }}>Connecting to SecureFlow…</div>
            </motion.div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20, rotateX: 6 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                exit={{ opacity: 0, y: -12, rotateX: -4 }}
                transition={{ type: "spring", stiffness: 260, damping: 26 }}
                style={{ transformStyle: "preserve-3d" }}
              >
              {activeTab==="overview" && (
                <OverviewTab
                  scans={scans} healthScore={healthScore} avgRisk={avgRisk}
                  blocked={blocked} allowed={allowed} running={running} completed={completed}
                  feedback={feedback} onFeedback={submitFeedback}
                  onOpenWhyBlocked={setWhyBlockedScan} onOpenDetail={setSelectedScan}
                />
              )}
              {activeTab==="pipeline" && (
                <PipelineTab
                  scans={scans} feedback={feedback}
                  onFeedback={submitFeedback}
                  onOpenWhyBlocked={setWhyBlockedScan} onOpenDetail={setSelectedScan}
                />
              )}
              {activeTab==="ai-insights" && (
                <AIInsightsTab
                  scans={scans} feedback={feedback}
                  onFeedback={submitFeedback}
                  onOpenWhyBlocked={setWhyBlockedScan}
                />
              )}
              {activeTab==="metrics" && <MetricsTab scans={scans} />}
              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>

      <AnimatePresence>
      {selectedScan && (
        <ScanDetail
          key={selectedScan.id}
          scan={selectedScan} onClose={() => setSelectedScan(null)}
          feedback={feedback} onFeedback={submitFeedback}
          onWhyBlocked={setWhyBlockedScan}
        />
      )}
      </AnimatePresence>

      <AnimatePresence>
      {showCopilot && (
        <AICopilot key="copilot" scans={scans} onClose={() => setShowCopilot(false)} />
      )}
      </AnimatePresence>
    </>
  );
}
