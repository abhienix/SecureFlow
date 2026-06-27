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
@keyframes pipelineFlow {
  0%   { background-position: 0% 50%; opacity: .6; }
  50%  { opacity: 1; }
  100% { background-position: 200% 50%; opacity: .6; }
}
@keyframes nodePulse3d {
  0%, 100% { transform: scale(1) translateZ(0); box-shadow: 0 0 0 0 rgba(59,130,246,.35); }
  50%      { transform: scale(1.08) translateZ(8px); box-shadow: 0 0 0 8px rgba(59,130,246,0); }
}
@keyframes scanBeam {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(200%); }
}
@keyframes remedyGlow {
  0%, 100% { box-shadow: 0 0 0 0 ${C.teal}22, 0 4px 20px ${C.teal}12; border-color: ${C.teal}; }
  50%      { box-shadow: 0 0 0 6px ${C.teal}14, 0 8px 28px ${C.teal}22; border-color: ${C.tealLight}; }
}
@keyframes feedbackPulse {
  0%, 100% { border-color: ${C.violet}55; }
  50%      { border-color: ${C.teal}; }
}
@keyframes liveBorderPulse {
  0%, 100% {
    border-color: ${C.blue};
    box-shadow: 0 0 0 0 ${C.blue}33, 0 8px 32px ${C.blue}12;
  }
  50% {
    border-color: ${C.cyan};
    box-shadow: 0 0 0 6px ${C.blue}18, 0 12px 40px ${C.cyan}22;
  }
}
  0%, 100% {
    border-color: ${C.blue};
    box-shadow: 0 0 0 0 ${C.blue}33, 0 8px 32px ${C.blue}12;
  }
  50% {
    border-color: ${C.cyan};
    box-shadow: 0 0 0 6px ${C.blue}18, 0 12px 40px ${C.cyan}22;
  }
}
@keyframes orbitSpin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
.running-card-live {
  animation: liveBorderPulse 2.2s ease-in-out infinite;
  position: relative;
  overflow: hidden;
}
.running-card-live::after {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 18px;
  background: conic-gradient(from 0deg, transparent, ${C.blue}55, ${C.cyan}44, transparent);
  animation: orbitSpin 3s linear infinite;
  opacity: 0.35;
  pointer-events: none;
  z-index: 0;
}
.live-pulse-bar {
  height: 3px;
  background: linear-gradient(90deg, ${C.teal}, ${C.blue}, ${C.cyan}, ${C.teal});
  background-size: 300% 100%;
  animation: pipelineFlow 2s linear infinite;
  border-radius: 2px;
}
.ai-disclaimer {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 10px;
  background: ${C.amberSoft};
  border: 1px solid ${C.amberBord};
  border-radius: 8px;
  font-size: 11px;
  color: ${C.inkMid};
  line-height: 1.5;
  margin-bottom: 10px;
}
.feedback-card {
  background: linear-gradient(135deg, ${C.violetSoft} 0%, ${C.tealSoft} 100%);
  border: 2px solid ${C.violetBord};
  border-radius: 14px;
  padding: 14px 16px;
  margin-top: 14px;
  animation: feedbackPulse 3s ease-in-out infinite;
}
.feedback-card .feedback-label {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${C.violet};
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.pipe-flow {
  background: linear-gradient(90deg, ${C.border} 0%, ${C.blue} 50%, ${C.border} 100%);
  background-size: 200% 100%;
  animation: pipelineFlow 1.6s linear infinite;
}
.pipe-flow-active {
  height: 3px !important;
  border-radius: 2px;
}
.node-running-3d {
  animation: nodePulse3d 1.8s ease-in-out infinite;
  transform-style: preserve-3d;
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
.glass-card {
  background: linear-gradient(145deg, rgba(255,255,255,.96) 0%, rgba(248,250,252,.92) 100%);
  border: 1px solid rgba(226,232,240,.9);
  border-radius: 18px;
  box-shadow:
    0 1px 2px rgba(15,23,42,.04),
    0 12px 40px rgba(15,23,42,.06),
    inset 0 1px 0 rgba(255,255,255,.8);
  backdrop-filter: blur(12px);
  transform-style: preserve-3d;
}
.glass-card-glow {
  position: relative;
  overflow: hidden;
}
.glass-card-glow::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: 19px;
  padding: 1px;
  background: linear-gradient(135deg, ${C.teal}55, ${C.violet}33, ${C.blue}22);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}
.kpi-shine {
  position: relative;
  overflow: hidden;
}
.kpi-shine::after {
  content: '';
  position: absolute;
  top: -50%;
  left: -60%;
  width: 40%;
  height: 200%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.45), transparent);
  transform: rotate(25deg);
  animation: shimmer 3.5s ease-in-out infinite;
}
.sf-tab.active {
  box-shadow: 0 4px 14px ${C.teal}18;
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
  background: linear-gradient(135deg, ${C.greenSoft} 0%, ${C.tealSoft} 100%);
  border: 2px solid ${C.teal};
  border-radius: 12px;
  padding: 14px 16px;
  margin-top: 12px;
  animation: remedyGlow 2.8s ease-in-out infinite;
  position: relative;
  overflow: hidden;
}
.remedy-block::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  background: linear-gradient(90deg, ${C.teal}, ${C.green}, ${C.teal});
  background-size: 200% 100%;
  animation: pipelineFlow 2s linear infinite;
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

/* Layout — mobile-first responsive */
.sf-grid-kpi { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 14px; }
.sf-grid-charts { display: grid; grid-template-columns: 2fr 1fr; gap: 14px; }
.sf-grid-half { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.sf-grid-metrics { display: grid; grid-template-columns: 3fr 2fr; gap: 14px; }
.sf-header { display: flex; align-items: center; gap: 16px; height: 56px; padding: 0 24px; }
.sf-nav { display: flex; gap: 4px; overflow-x: auto; scrollbar-width: none; }
.sf-nav::-webkit-scrollbar { display: none; }
.sf-main { padding: 24px; max-width: 1280px; margin: 0 auto; }
.sf-copilot-panel { width: 360px; max-width: calc(100vw - 32px); }
.sf-copilot-fab { bottom: 24px; right: 24px; }

@media (max-width: 900px) {
  .sf-grid-charts, .sf-grid-half, .sf-grid-metrics { grid-template-columns: 1fr; }
  .sf-header { flex-wrap: wrap; height: auto; min-height: 56px; padding: 10px 14px; gap: 10px; }
  .sf-nav { width: 100%; order: 3; padding-bottom: 2px; }
  .sf-main { padding: 16px 14px; }
  .sf-copilot-panel { width: calc(100vw - 24px); right: 12px !important; bottom: 12px !important; }
  .sf-copilot-fab { bottom: 16px; right: 16px; }
  .sf-header-right { margin-left: 0 !important; width: 100%; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
  .sf-tab { font-size: 12px; padding: 6px 10px; white-space: nowrap; }
  .sf-detail-drawer { width: 100vw !important; }
}
@media (max-width: 480px) {
  .sf-grid-kpi { grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .sf-tab span.tab-label { display: none; }
}
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

  if (["skipped","skip"].includes(r))
    return "skipped";

  if (["running","in_progress","active","scanned","scanning"].includes(r))
    return "running";

  if (stage?.started_at && !["pending"].includes(r))
    return "passed";

  if (fallbackStatus === "failed")
    return "skipped";

  return "pending";
}

/** Parse backend timestamps — naive ISO strings from Postgres are UTC. */
function parseTimestamp(iso) {
  if (!iso) return null;
  if (iso instanceof Date) return iso;
  const s = String(iso).trim();
  if (!s || s === "—") return null;
  if (/[zZ]$|[+-]\d{2}:\d{2}$/.test(s)) return new Date(s);
  return new Date(`${s}Z`);
}

function scanTimestamp(scan) {
  if (!scan) return null;
  if (scan.status === "running") return scan.started_at || scan.created_at;
  return scan.started_at || scan.created_at;
}

function sameRunId(a, b) {
  if (a == null || b == null) return false;
  return Number(a) === Number(b);
}


function sevNorm(s) {
  return String(s || "").toUpperCase();
}

function buildVulnerabilities(raw, vuln_breakdown, pipeline) {
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

  const gitleaks = raw.findings?.gitleaks;
  if (Array.isArray(gitleaks)) {
    gitleaks.forEach(g => {
      vulnerabilities.push({
        severity:    "HIGH",
        id:          g.RuleID || g.ruleID || g.rule || "secret",
        cve_id:      g.RuleID || g.ruleID || g.rule || "secret",
        package:     g.File || g.file || g.SourceFile || "source",
        description: g.Description || g.description || "Secret detected by Gitleaks",
      });
    });
  }

  const semgrep = raw.findings?.semgrep;
  if (Array.isArray(semgrep)) {
    semgrep.forEach(r => {
      const sev = sevNorm(r.extra?.severity || r.severity || "HIGH");
      vulnerabilities.push({
        severity:    sev === "ERROR" ? "HIGH" : sev,
        id:          r.check_id || r.rule_id || "semgrep",
        cve_id:      r.check_id || r.rule_id,
        package:     r.path || "source",
        description: r.extra?.message || r.message || "Insecure pattern (Semgrep)",
      });
    });
  }

  if (!vulnerabilities.length && vuln_breakdown?.all_details?.length) {
    vulnerabilities = vuln_breakdown.all_details.map(v => ({
      severity: v.severity,
      id:       v.id,
      cve_id:   v.id,
      package:  v.package,
      description: v.description || "",
    }));
  }

  if (!vulnerabilities.length && raw.action_taken === "BLOCK") {
    const codeStep = (raw.pipeline_steps || {}).code_scan;
    if (codeStep?.detail) {
      vulnerabilities.push({
        severity:    raw.severity && raw.severity !== "UNKNOWN" ? raw.severity : "HIGH",
        id:          "code-scan",
        cve_id:      "CODE-SCAN",
        package:     raw.repo_name,
        description: codeStep.detail,
      });
    }
  }

  return vulnerabilities;
}

function getSeverityCounts(vulnerabilities) {
  const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  (vulnerabilities || []).forEach(v => {
    const s = sevNorm(v.severity);
    if (counts[s] !== undefined) counts[s]++;
    else if (s === "ERROR") counts.HIGH++;
  });
  return counts;
}

function normaliseScan(raw) {
  // Used by resultToStatus() as a fallback signal when a stage has no
  // explicit result of its own.
  const overallOutcome = raw.action_taken === "BLOCK" ? "failed"
    : raw.action_taken === "ALLOW" ? "passed"
    : null;

  const steps = raw.pipeline_steps || {};
  let pipeline = PIPELINE_STAGES.map(({ key, label, Icon }) => {
    const info = steps[key] || {};
    return {
      id: key, name: label, Icon,
      status: resultToStatus(info, overallOutcome),
      result:  info.result  || info.status || "",
      detail:  info.detail  || "",
    };
  });

  /* Checkout completes before the backend receives scan_started — infer when missing */
  const checkoutIdx = pipeline.findIndex(p => p.id === "checkout");
  const hasLaterStep = PIPELINE_STAGES.slice(1).some(({ key }) => {
    const s = steps[key];
    return s && (s.result || s.status);
  });
  if (checkoutIdx >= 0) {
    const checkoutPending = pipeline[checkoutIdx].status === "pending";
    if (checkoutPending && (raw.status === "running" || hasLaterStep || overallOutcome)) {
      pipeline[checkoutIdx] = {
        ...pipeline[checkoutIdx],
        status: "passed",
        result: steps.checkout?.result || "PASS",
        detail: steps.checkout?.detail || "Repository checked out",
      };
    }
  }

  /* While scan is live, mark the active stage as running for UI animation */
  if (raw.status === "running") {
    const hasRunning = pipeline.some(p => p.status === "running");
    if (!hasRunning) {
      let lastDone = -1;
      let stalledOnFailure = false;
      pipeline.forEach((p, i) => {
        if (["passed", "failed", "skipped"].includes(p.status)) {
          lastDone = i;
          if (p.status === "failed") stalledOnFailure = true;
        }
      });
      if (!stalledOnFailure) {
        const activeIdx = lastDone + 1 < pipeline.length ? lastDone + 1 : -1;
        if (activeIdx >= 0 && pipeline[activeIdx]?.status === "pending") {
          pipeline[activeIdx] = { ...pipeline[activeIdx], status: "running", result: "running" };
        }
      }
    }
  }

  let vuln_breakdown = raw.vuln_breakdown || null;
  if (!vuln_breakdown && raw.findings?.Results) {
    const all = [];
    (raw.findings.Results || []).forEach(r => (r.Vulnerabilities || []).forEach(v => all.push(v)));
    const fixable = all.filter(v => v.FixedVersion);
    vuln_breakdown = {
      total:         all.length,
      fixable_count: fixable.length,
      critical:      all.filter(v => sevNorm(v.Severity) === "CRITICAL").length,
      high:          all.filter(v => sevNorm(v.Severity) === "HIGH").length,
      medium:        all.filter(v => sevNorm(v.Severity) === "MEDIUM").length,
      low:           all.filter(v => sevNorm(v.Severity) === "LOW").length,
      all_details:   all.slice(0, 20).map(v => ({
        id:          v.VulnerabilityID,
        package:     v.PkgName,
        severity:    v.Severity,
        fix:         v.FixedVersion || "—",
        cvss:        v.CVSS ? Math.max(...Object.values(v.CVSS).map(c => c.V3Score||c.V2Score||0)) : 0,
        description: v.Title || v.Description || "",
      })),
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

  const vulnerabilities = buildVulnerabilities(raw, vuln_breakdown, pipeline);
  const severity_counts = getSeverityCounts(vulnerabilities);

  return {
    ...raw,
    pipeline,
    vuln_breakdown,
    vulnerabilities,
    severity_counts,
    ai_confidence:  aiConf,
    ai_explanation,
    ai_remedy,
    status: raw.status || "complete",
  };
}

const fmt     = iso => { const d = parseTimestamp(iso); return d ? d.toLocaleDateString("en-IN",{day:"numeric",month:"short"}) : "—"; };
const fmtFull = iso => { const d = parseTimestamp(iso); return d ? d.toLocaleString("en-IN",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "—"; };

function relTime(iso) {
  const then = parseTimestamp(iso);
  if (!then || Number.isNaN(then.getTime())) return "—";
  const sec = Math.floor((Date.now() - then.getTime()) / 1000);
  if (sec < 0) return "just now";
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
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
    className={`glass-card glass-card-glow sf-card-hover ${className}`}
    initial={{ opacity: 0, y: 20, rotateX: 10, scale: 0.98 }}
    animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
    whileHover={{ y: -6, rotateX: 3, rotateY: -2, scale: 1.01 }}
    transition={{ type: "spring", stiffness: 260, damping: 22 }}
    style={{
      padding:"20px",
      marginBottom:16,
      border: glow ? `1px solid ${C.tealBord}` : undefined,
      boxShadow: glow ? `0 16px 48px ${C.teal}14, inset 0 1px 0 rgba(255,255,255,.9)` : undefined,
      transformStyle: "preserve-3d",
      perspective: 900,
      ...style,
    }}
  >{children}</motion.div>
);

const StatCard3D = ({ label, value, color, sub, delay=0, icon: Icon }) => (
  <motion.div
    className="glass-card kpi-shine"
    initial={{ opacity: 0, y: 24, rotateX: 14 }}
    animate={{ opacity: 1, y: 0, rotateX: 0 }}
    whileHover={{ y: -8, rotateX: 4, rotateY: 3, scale: 1.02 }}
    transition={{ type: "spring", stiffness: 280, damping: 20, delay }}
    style={{
      padding: "18px 20px",
      borderTop: `3px solid ${color}`,
      transformStyle: "preserve-3d",
      cursor: "default",
    }}
  >
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
      <div style={{ fontSize: 10, color: C.inkLow, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</div>
      {Icon && (
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          background: `${color}14`, border: `1px solid ${color}28`,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 4px 12px ${color}18`,
        }}>
          <Icon size={16} color={color} />
        </div>
      )}
    </div>
    <div style={{ fontSize: 32, fontWeight: 900, fontFamily: C.mono, color, lineHeight: 1 }}>{value}</div>
    <div style={{ fontSize: 11, color: C.inkMid, marginTop: 6 }}>{sub}</div>
  </motion.div>
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

const AIFeedbackRow = ({ scanId, feedback, onFeedback, label = "Was this AI analysis accurate?" }) => {
  if (!onFeedback || !scanId) return null;
  const myFb = feedback?.[scanId];
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
      }}
    >
      <Brain size={13} style={{ color: C.violet, flexShrink: 0 }} />
      <span style={{ fontSize: 12, color: C.ink, fontWeight: 600 }}>{label}</span>
      {["accept", "reject"].map(type => (
        <motion.button
          key={type}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onFeedback(scanId, type)}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "5px 12px", borderRadius: 999,
            background: myFb === type ? (type === "accept" ? C.greenSoft : C.redSoft) : C.bgSurface,
            border: `1px solid ${myFb === type ? (type === "accept" ? C.greenBord : C.redBord) : C.border}`,
            color: myFb === type ? (type === "accept" ? C.green : C.red) : C.inkMid,
            fontSize: 11, fontWeight: 600,
          }}
        >
          {type === "accept" ? <ThumbsUp size={12} /> : <ThumbsDown size={12} />}
          {type === "accept" ? "Accurate" : "Not accurate"}
        </motion.button>
      ))}
      {myFb && (
        <span style={{ fontSize: 10, color: C.teal, fontWeight: 600 }}>
          ✓ Feedback saved
        </span>
      )}
    </motion.div>
  );
};

function RunningPipelineBanner({ scans }) {
  const running = scans.filter(s => s.status === "running");
  if (!running.length) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        marginBottom: 18, padding: "16px 18px",
        background: `linear-gradient(135deg, ${C.blueSoft} 0%, ${C.cyanSoft} 100%)`,
        border: `1px solid ${C.blueBord}`,
        borderRadius: 16,
        boxShadow: `0 8px 32px ${C.blue}14`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div aria-hidden style={{
        position: "absolute", inset: 0, opacity: .35,
        background: `linear-gradient(105deg, transparent 40%, ${C.blue}22 50%, transparent 60%)`,
        animation: "scanBeam 2.2s linear infinite",
      }} />
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            style={{
              width: 28, height: 28, borderRadius: "50%",
              border: `2px solid ${C.blueBord}`,
              borderTopColor: C.blue,
            }}
          />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.blue }}>
              {running.length} pipeline{running.length > 1 ? "s" : ""} running live
            </div>
            <div style={{ fontSize: 11, color: C.inkMid }}>Stages update in real time via WebSocket</div>
          </div>
        </div>
        {running.slice(0, 3).map(scan => (
          <div key={scan.id} style={{ marginBottom: running.length > 1 ? 10 : 0 }}>
            <div style={{ fontSize: 11, color: C.inkMid, marginBottom: 6, fontFamily: C.mono }}>
              {scan.commit_sha?.slice(0, 8)} · {scan.repo_name}
            </div>
            <PipelineMiniNodes pipeline={scan.pipeline} live />
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   PIPELINE NODES
───────────────────────────────────────────── */
function PipelineMiniNodes({ pipeline, live = false }) {
  if (!pipeline?.length) return null;
  const nodeSize = live ? 40 : 34;
  const iconSize = live ? 17 : 15;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:0, margin:"14px 0 4px", overflowX:"auto", paddingBottom:4 }}>
      {pipeline.map((stage, i) => {
        const color =
          stage.status === "passed"  ? C.teal  :
          stage.status === "failed"  ? C.red   :
          stage.status === "running" ? C.blue  :
          stage.status === "skipped" ? C.inkMid :
          C.inkLow;
        const isActive = stage.status === "running";
        const { Icon } = stage;
        return (
          <React.Fragment key={stage.id}>
            {i > 0 && (
              <div className={(live && (pipeline[i-1].status === "running" || isActive)) ? "pipe-flow pipe-flow-active" : (pipeline[i-1].status === "running" || isActive) ? "pipe-flow pipe-flow-active" : ""} style={{
                flex:1, height: live && (pipeline[i-1].status === "running" || isActive) ? 3 : 2,
                minWidth: live ? 12 : 8, maxWidth: live ? 36 : 28,
                background: pipeline[i-1].status === "passed"
                  ? `linear-gradient(90deg,${C.teal}60,${color}60)`
                  : (pipeline[i-1].status === "running" || isActive) ? undefined : C.border,
                borderRadius: 2,
              }} />
            )}
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:5, minWidth: live ? 58 : 52 }}>
              <motion.div
                className={isActive ? "node-running-3d" : ""}
                animate={isActive ? { scale: live ? [1, 1.12, 1] : [1, 1.06, 1], rotateY: live ? [0, 8, 0] : 0 } : {}}
                transition={isActive ? { duration: live ? 1.2 : 1.6, repeat: Infinity } : {}}
                style={{
                width:nodeSize, height:nodeSize, borderRadius:"50%",
                border:`2px solid ${color}`,
                background: color+"12",
                display:"flex", alignItems:"center", justifyContent:"center",
                color,
                boxShadow: isActive
                  ? `0 0 0 ${live ? 6 : 4}px ${color}25, 0 0 ${live ? 24 : 16}px ${color}${live ? "55" : "40"}` : `0 0 8px ${color}20`,
                transformStyle: "preserve-3d",
              }}>
                {isActive ? <Loader2 size={iconSize} className="spin" /> :
                 stage.status === "passed"  ? (
                   <motion.span key="ok" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 18 }}>
                     <CheckCircle size={iconSize} />
                   </motion.span>
                 ) :
                 stage.status === "failed"  ? <XCircle size={iconSize} /> :
                 stage.status === "skipped" ? <span style={{ fontSize:11 }}>—</span> :
                 Icon ? <Icon size={iconSize - 2} /> : null}
              </motion.div>
              <div style={{ fontSize:9, color: isActive ? C.blue : C.inkMid, fontWeight: isActive ? 700 : 400, textAlign:"center", whiteSpace:"nowrap" }}>
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
function AIAnalysisBlock({ scan, compact=false, feedback, onFeedback }) {
  const existingRemedy = scan.ai_remedy || scan.ai_fix || null;
  const [loadingRemedy, setLoadingRemedy] = useState(false);
  const [remedy, setRemedy] = useState(existingRemedy);
  const [remedyError, setRemedyError] = useState(null);

  useEffect(() => {
    setRemedy(scan.ai_remedy || scan.ai_fix || null);
    setRemedyError(null);
  }, [scan.id, scan.ai_remedy, scan.ai_fix]);

  const displayedRemedy = remedy || existingRemedy;

  const fetchRemedy = async () => {
    if (displayedRemedy || loadingRemedy) return;
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

  if (!scan.ai_explanation && !scan.ai_remedy && !scan.ai_fix && scan.action_taken !== "BLOCK") return null;

  return (
    <div style={{
      marginTop:12, padding:compact?10:14,
      background:C.violetSoft, borderRadius:10,
      border:`1px solid ${C.violetBord}`,
      fontSize:13, lineHeight:1.65,
    }}>
      <div className="ai-disclaimer">
        <AlertTriangle size={14} style={{ color: C.amber, flexShrink: 0, marginTop: 1 }} />
        <span>
          AI-generated guidance — verify against scanner output and your security policy before acting.
        </span>
      </div>
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
        <div style={{ color:C.ink, marginBottom: (displayedRemedy || !compact) ? 10 : 0 }}>
          {scan.ai_explanation}
        </div>
      )}

      {/* Remedy */}
      {(displayedRemedy || loadingRemedy) && (
        <motion.div
          className="remedy-block"
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 24 }}
        >
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
            <div style={{ fontSize:12, color:C.ink, lineHeight:1.65, whiteSpace:"pre-wrap", paddingTop:4 }}>{displayedRemedy}</div>
          )}
        </motion.div>
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

      {/* Fetch remedy only when none exists yet */}
      {!displayedRemedy && !loadingRemedy && !remedyError && scan.action_taken === "BLOCK" && (
        <button onClick={fetchRemedy} style={{
          marginTop:8, display:"flex", alignItems:"center", gap:5,
          fontSize:11, color:C.teal, background:"none", border:`1px solid ${C.tealBord}`,
          borderRadius:6, padding:"4px 10px", fontWeight:600,
        }}>
          <Wrench size={11} /> Generate remedy
        </button>
      )}

      {(scan.ai_explanation || displayedRemedy) && (
        <motion.div
          className="feedback-card"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: displayedRemedy ? 0.15 : 0 }}
        >
          <div className="feedback-label">
            <Sparkles size={12} />
            {displayedRemedy ? "Rate this AI remedy" : "Rate this AI analysis"}
          </div>
          <AIFeedbackRow
            scanId={scan.id}
            feedback={feedback}
            onFeedback={onFeedback}
            label={displayedRemedy ? "Was this remedy accurate?" : "Was this AI analysis accurate?"}
          />
        </motion.div>
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

  return (
    <motion.div
      className={`glass-card fade-up${isRunning ? " running-card-live" : ""}`}
      initial={{ opacity: 0, y: 18, rotateX: 6 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      whileHover={{ y: -5, rotateX: 2, rotateY: -1, boxShadow: `0 16px 40px ${accent}18` }}
      transition={{ type: "spring", stiffness: 300, damping: 24, delay: animDelay }}
      style={{
      borderRadius:16,
      border:`1px solid ${C.border}`,
      borderLeft:`4px solid ${accent}`,
      padding:"16px", marginBottom:10,
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
            <LiveRelTime iso={scanTimestamp(scan)} />
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

      <PipelineMiniNodes pipeline={scan.pipeline} live={isRunning} />

      {isRunning && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            marginTop:8, padding:"10px 14px",
            background:`linear-gradient(135deg, ${C.blueSoft}, ${C.cyanSoft})`,
            borderRadius:10, border:`1px solid ${C.blueBord}`,
            fontSize:12, color:C.blue,
            display:"flex", alignItems:"center", gap:8,
            position:"relative", overflow:"hidden",
          }}
        >
          <div aria-hidden style={{
            position:"absolute", inset:0, opacity:.4,
            background:`linear-gradient(105deg, transparent 35%, ${C.blue}33 50%, transparent 65%)`,
            animation:"scanBeam 2s linear infinite",
          }} />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            style={{ position:"relative", zIndex:1 }}
          >
            <Loader2 size={14} className="spin" />
          </motion.div>
          <span style={{ position:"relative", zIndex:1, fontWeight:600 }}>
            Pipeline running live — stages update in real time
          </span>
        </motion.div>
      )}

      {expanded && (
        <div style={{ marginTop:16, paddingTop:16, borderTop:`1px solid ${C.border}`, animation:"fadeIn .25s ease" }}>
          <PipelineFullView pipeline={scan.pipeline} />
          {scan.vuln_breakdown && <VulnBreakdown breakdown={scan.vuln_breakdown} />}
          <AIAnalysisBlock scan={scan} feedback={feedback} onFeedback={onFeedback} />
          {onOpenDetail && !isRunning && (
            <button onClick={() => onOpenDetail(scan)} style={{
              marginTop:14, fontSize:12, color:C.inkMid,
              background:"none", border:"none", textDecoration:"underline",
            }}>Full detail →</button>
          )}
        </div>
      )}
    </motion.div>
  );
};

       
function WhyBlockedModal({ scan, onClose, feedback, onFeedback }) {
  if (!scan) return null;

  const vulns = scan.vulnerabilities || [];
  const counts = scan.severity_counts || getSeverityCounts(vulns);
  const crit  = counts.CRITICAL;
  const high  = counts.HIGH;
  const med   = counts.MEDIUM;
  const isCodeBlock = vulns.some(v => v.cve_id === "CODE-SCAN" || v.id === "code-scan" || v.id === "secret");

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
              { label: "Critical", count: crit, col: C.red,   bg: C.redSoft,   brd: C.redBord },
              { label: "High",     count: high, col: C.amber, bg: C.amberSoft, brd: C.amberBord },
              { label: "Medium",   count: med,  col: C.blue,  bg: C.blueSoft,  brd: C.blueBord },
            ].map(({ label, count, col, bg, brd }) => (
              <motion.div
                key={label}
                whileHover={{ scale: 1.04, rotateY: 4 }}
                style={{
                flex: 1, background: bg, border: `1px solid ${brd}`,
                borderRadius: 12, padding: "12px 14px", textAlign: "center",
                boxShadow: `0 8px 24px ${col}18`,
                transformStyle: "preserve-3d",
              }}>
                <p style={{ fontSize: 22, fontWeight: 700, color: col }}>{count}</p>
                <p style={{ fontSize: 11, color: col, fontWeight: 500, marginTop: 2 }}>{label}</p>
              </motion.div>
            ))}
          </div>

          {isCodeBlock && vulns.length > 0 && (
            <div style={{
              padding: "10px 12px", borderRadius: 10,
              background: C.amberSoft, border: `1px solid ${C.amberBord}`,
              fontSize: 12, color: C.inkMid,
            }}>
              Code scan block — severity counts reflect secrets or insecure patterns, not CVE tiers.
            </div>
          )}

          {vulns.length === 0 && scan.vuln_breakdown?.total > 0 && (
            <div style={{ fontSize: 12, color: C.inkMid }}>
              {scan.vuln_breakdown.total} total findings in scan record
              {scan.vuln_breakdown.critical != null && (
                <> · {scan.vuln_breakdown.critical} critical · {scan.vuln_breakdown.high} high · {scan.vuln_breakdown.medium} medium</>
              )}
            </div>
          )}

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

          <AIAnalysisBlock scan={scan} feedback={feedback} onFeedback={onFeedback} />
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
      className="sf-detail-drawer"
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
      <AIAnalysisBlock scan={scan} feedback={feedback} onFeedback={onFeedback} />
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
    text:"Hi! I'm your SecureFlow AI assistant. Ask about blocked commits, CVEs, policy decisions, or pipeline failures — I can suggest remedies and explain scan results.",
  }]);
  const [input,       setInput]       = useState("");
  const [sending,     setSending]     = useState(false);
  const [minimised,   setMinimised]   = useState(false);
  const [sendError,   setSendError]   = useState(false);
  const [selectedId,  setSelectedId]  = useState(null);
  const [followUps,   setFollowUps]   = useState([]);
  const endRef   = useRef(null);
  const inputRef = useRef(null);

  const blocked = scans.filter(s => s.action_taken === "BLOCK");
  const running = scans.filter(s => s.status === "running");
  const completed = scans.filter(s => s.status !== "running");

  useEffect(() => {
    if (!selectedId && blocked[0]?.id) setSelectedId(blocked[0].id);
    else if (!selectedId && scans[0]?.id) setSelectedId(scans[0].id);
  }, [blocked, scans, selectedId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, followUps]);

  const buildContext = useCallback(() => {
    const recent = completed.slice(0, 8).map(s => ({
      id: s.id,
      sha: s.commit_sha?.slice(0, 8),
      repo: s.repo_name,
      action: s.action_taken,
      severity: s.severity,
      risk: s.risk_score,
      status: s.status,
      ai_snippet: s.ai_explanation?.slice(0, 120),
    }));
    return {
      totals: { blocked: blocked.length, allowed: completed.filter(s => s.action_taken === "ALLOW").length, running: running.length },
      recent_scans: recent,
      selected_scan_id: selectedId,
    };
  }, [completed, blocked, running, selectedId]);

  const send = async (q) => {
    const question = q || input.trim();
    if (!question || sending) return;
    setInput("");
    setSendError(false);
    setFollowUps([]);
    const nextMessages = [...messages, { role:"user", text: question, at: Date.now() }];
    setMessages(nextMessages);
    setSending(true);
    try {
      const res = await fetch(`${BACKEND}/api/copilot/ask`, {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({
          question,
          scan_id: selectedId || blocked[0]?.id || scans[0]?.id || null,
          context: buildContext(),
          history: nextMessages.slice(-6).map(m => ({ role: m.role, text: m.text })),
        }),
      });
      if (!res.ok) throw new Error(`Backend returned ${res.status}`);
      const data = await res.json();
      if (!data?.answer) {
        setMessages(m => [...m, { role:"assistant", text:"The AI service responded but didn't include an answer. Try rephrasing or check backend logs.", at: Date.now() }]);
        setSendError(true);
      } else {
        setMessages(m => [...m, { role:"assistant", text: data.answer, at: Date.now() }]);
        setFollowUps(data.follow_ups || [
          "What should I fix first?",
          "Explain the policy decision",
          "List fixable CVEs",
        ].slice(0, 3));
      }
    } catch (err) {
      setMessages(m => [...m, { role:"assistant", text:`Couldn't reach the AI service (${err.message || "network error"}). Try again in a moment.`, at: Date.now() }]);
      setSendError(true);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const copyText = (text) => {
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).catch(() => {});
  };

  const clearChat = () => {
    setMessages([{ role:"assistant", text:"Chat cleared. What would you like to know about your pipeline?", at: Date.now() }]);
    setFollowUps([]);
    setSendError(false);
  };

  const QUICK = [
    "Why was the last commit blocked?",
    "Summarize recent pipeline failures",
    "What's the best remedy for top CVEs?",
    "Explain the policy gate decision",
    "Which stages fail most often?",
    "Show fixable vulnerabilities",
  ];

  return (
    <div className="sf-copilot-fab" style={{
      position:"fixed", bottom:24, right:24,
      width: minimised ? "auto" : undefined,
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
          {(blocked.length > 0 || running.length > 0) && (
            <span style={{ background:C.red, color:"#fff", borderRadius:999, fontSize:10, fontWeight:800, padding:"1px 6px" }}>
              {blocked.length + running.length}
            </span>
          )}
        </button>
      ) : (
        <div className="sf-copilot-panel" style={{
          background:`${C.bgCard}ee`, backdropFilter:"blur(20px)",
          border:`1px solid ${C.border}`, borderRadius:20, overflow:"hidden",
          boxShadow:`0 24px 64px rgba(0,0,0,.6), 0 0 40px ${C.teal}10`,
          display:"flex", flexDirection:"column", maxHeight:"70vh",
        }}>
          <div style={{
            padding:"14px 16px", borderBottom:`1px solid ${C.border}`,
            display:"flex", alignItems:"center", gap:10,
            background:`${C.bgSurface}80`, flexWrap:"wrap",
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
            <div style={{ flex: 1, minWidth: 120 }}>
              <div style={{ fontSize:13, fontWeight:700, color:C.ink }}>AI Copilot</div>
              <div style={{ fontSize:10, color: sendError ? C.amber : C.teal, display:"flex", alignItems:"center", gap:4 }}>
                <span style={{ width:6, height:6, borderRadius:"50%", background: sendError ? C.amber : C.teal, display:"inline-block", animation:"pulseRing 2s infinite" }} />
                {sendError ? "connection issue" : "online · context-aware"}
              </div>
            </div>
            {running.length > 0 && <Badge color={C.blue} small>{running.length} live</Badge>}
            {blocked.length > 0 && <Badge color={C.red} small>{blocked.length} blocked</Badge>}
            <div style={{ marginLeft:"auto", display:"flex", gap:4 }}>
              <button onClick={clearChat} title="Clear chat" style={{ background:"none", border:"none", color:C.inkMid, padding:4, borderRadius:6, fontSize:10, fontWeight:600 }}>Clear</button>
              <button onClick={() => setMinimised(true)} style={{ background:"none", border:"none", color:C.inkMid, padding:4, borderRadius:6 }}><Minimize2 size={15} /></button>
              <button onClick={onClose} style={{ background:"none", border:"none", color:C.inkMid, padding:4, borderRadius:6 }}><X size={15} /></button>
            </div>
          </div>

          {scans.length > 0 && (
            <div style={{ padding:"8px 14px", borderBottom:`1px solid ${C.border}`, background:C.bgSurface }}>
              <label style={{ fontSize:10, color:C.inkLow, fontWeight:700, letterSpacing:"0.06em", display:"block", marginBottom:4 }}>FOCUS SCAN</label>
              <select
                value={selectedId || ""}
                onChange={e => setSelectedId(Number(e.target.value) || null)}
                style={{
                  width:"100%", padding:"6px 10px", borderRadius:8,
                  border:`1px solid ${C.border}`, background:C.bgCard,
                  fontSize:12, color:C.ink, fontFamily:C.mono,
                }}
              >
                {scans.slice(0, 20).map(s => (
                  <option key={s.id} value={s.id}>
                    {s.commit_sha?.slice(0, 8)} · {s.action_taken || s.status} · {s.repo_name?.split("/").pop()}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ flex:1, overflowY:"auto", padding:"14px 14px 0", display:"flex", flexDirection:"column", gap:10, minHeight:200, maxHeight:"45vh" }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display:"flex", flexDirection:"column", alignItems: m.role === "user" ? "flex-end" : "flex-start", gap:4 }}>
                <div className={m.role==="user"?"sf-msg-user":"sf-msg-bot"} style={{
                  maxWidth:"88%", padding:"9px 13px",
                  fontSize:13, lineHeight:1.6, color:C.ink, animation:"fadeInUp .25s ease",
                  whiteSpace:"pre-wrap",
                }}>
                  {m.text}
                </div>
                {m.role === "assistant" && m.text.length > 40 && (
                  <button onClick={() => copyText(m.text)} style={{
                    fontSize:10, color:C.inkLow, background:"none", border:"none", padding:"0 4px",
                  }}>Copy</button>
                )}
              </div>
            ))}
            {sending && (
              <div className="sf-msg-bot" style={{ maxWidth:"60%", padding:"9px 13px", fontSize:13, color:C.inkMid, display:"flex", alignItems:"center", gap:6 }}>
                <Loader2 size={12} className="spin" /> Analyzing pipeline context…
              </div>
            )}
            {followUps.length > 0 && !sending && (
              <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginTop:4 }}>
                {followUps.map(q => (
                  <button key={q} onClick={() => send(q)} style={{
                    fontSize:10, padding:"4px 9px", borderRadius:999,
                    background:C.violetSoft, border:`1px solid ${C.violetBord}`,
                    color:C.violet, fontWeight:600,
                  }}>{q}</button>
                ))}
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div style={{ padding:"10px 14px 0", display:"flex", gap:5, flexWrap:"wrap", maxHeight:72, overflowY:"auto" }}>
            {QUICK.map(q => (
              <button key={q} onClick={() => send(q)} disabled={sending} style={{
                fontSize:10, padding:"4px 9px", borderRadius:999,
                background:C.tealSoft, border:`1px solid ${C.tealBord}`,
                color:C.teal, fontWeight:600, whiteSpace:"nowrap", opacity: sending ? 0.6 : 1,
              }}>{q}</button>
            ))}
          </div>

          <div style={{ padding:"12px 14px 14px", display:"flex", gap:8 }}>
            <input ref={inputRef} className="sf-chat-input" value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key==="Enter" && !e.shiftKey && send()}
              placeholder="Ask about CVEs, policy, remedies…"
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
function OverviewTab({ scans, totalScans, healthScore, avgRisk, blocked, allowed, running, completed, feedback, onFeedback, onOpenWhyBlocked, onOpenDetail }) {
  const chartData = useMemo(() => {
  return [...scans]
    .filter(
      s =>
        s.status !== "running" &&
        s.risk_score !== null &&
        s.risk_score !== undefined
    )
    .sort(
      (a, b) => (parseTimestamp(a.created_at)?.getTime() || 0) - (parseTimestamp(b.created_at)?.getTime() || 0)
    )
    .slice(-20)
    .map(s => ({
      name: s.commit_sha?.slice(0, 6) || "—",
      risk: Number(s.risk_score),
      score: Number(s.ai_confidence || 0),
    }));
}, [scans]);

  const dailyActivity = useMemo(() => {
    const by = {};
    completed.forEach(s => {
      const d = fmt(s.started_at || s.created_at);
      if (!by[d]) by[d] = { day: d, scans: 0, blocked: 0, allowed: 0 };
      by[d].scans++;
      if (s.action_taken === "BLOCK") by[d].blocked++;
      else by[d].allowed++;
    });
    return Object.values(by).slice(-10);
  }, [completed]);

  const blockTrend = useMemo(() => {
    let total = 0, blockedN = 0;
    return [...completed]
      .sort((a, b) => (parseTimestamp(a.created_at)?.getTime() || 0) - (parseTimestamp(b.created_at)?.getTime() || 0))
      .slice(-15)
      .map(s => {
        total++;
        if (s.action_taken === "BLOCK") blockedN++;
        return { name: s.commit_sha?.slice(0, 6) || "—", rate: total ? +((blockedN / total) * 100).toFixed(1) : 0 };
      });
  }, [completed]);

  const vulnSeverityTrend = useMemo(() => {
    return completed.slice(0, 12).reverse().map(s => ({
      name: s.commit_sha?.slice(0, 6) || "—",
      critical: s.severity_counts?.CRITICAL || 0,
      high: s.severity_counts?.HIGH || 0,
      medium: s.severity_counts?.MEDIUM || 0,
    }));
  }, [completed]);

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
      <RunningPipelineBanner scans={scans} />
      {/* KPI row */}
      <div className="sf-grid-kpi" style={{ marginBottom:16 }}>
        {[
          { label:"Pipeline health", value:healthScore, color:healthScore>=75?C.teal:healthScore>=50?C.amber:C.red, sub:"block rate + risk", icon:Activity },
          { label:"Average risk",    value:avgRisk,     color:riskColor(parseFloat(avgRisk)), sub:"out of 10.0", icon:AlertTriangle },
          { label:"Scans completed", value:totalScans ?? completed.length, color:C.blue,  sub: totalScans > completed.length ? `showing latest ${completed.length}` : "all time", icon:BarChart2 },
          { label:"Blocked",         value:blocked.length,   color:C.red,   sub:`${((blocked.length/(completed.length||1))*100).toFixed(0)}% block rate`, icon:XCircle },
          { label:"Currently live",  value:running.length,   color:C.cyan,  sub:"pipelines running", icon:GitPullRequest },
          { label:"AI analysed",     value:completed.filter(s=>s.ai_explanation).length, color:C.violet, sub:"with explanations", icon:Brain },
        ].map((k,i) => (
          <StatCard3D key={k.label} {...k} delay={i * 0.05} />
        ))}
      </div>

      {/* Charts row */}
      <div className="sf-grid-charts" style={{ marginBottom:16 }}>
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

      {/* Severity + Radar + activity */}
      <div className="sf-grid-half" style={{ marginBottom:16 }}>
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

      <div className="sf-grid-charts" style={{ marginBottom:16 }}>
        <Card>
          <SectionTitle accent={C.blue}>Daily scan activity</SectionTitle>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={dailyActivity} barSize={16}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
              <XAxis dataKey="day" stroke="transparent" tick={{ fill:C.inkMid, fontSize:9 }} />
              <YAxis stroke="transparent" tick={{ fill:C.inkMid, fontSize:10 }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="allowed" name="Allowed" fill={C.teal} stackId="d" radius={[0,0,0,0]} />
              <Bar dataKey="blocked" name="Blocked" fill={C.red} stackId="d" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <SectionTitle accent={C.red}>Block rate trend</SectionTitle>
          <ResponsiveContainer width="100%" height={190}>
            <LineChart data={blockTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
              <XAxis dataKey="name" stroke="transparent" tick={{ fill:C.inkMid, fontSize:9 }} />
              <YAxis stroke="transparent" tick={{ fill:C.inkMid, fontSize:10 }} domain={[0, 100]} unit="%" />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="rate" name="Block rate %" stroke={C.red} strokeWidth={2} dot={{ r: 3, fill: C.red }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {vulnSeverityTrend.some(v => v.critical + v.high + v.medium > 0) && (
        <Card style={{ marginBottom:16 }}>
          <SectionTitle accent={C.amber}>Vulnerability severity trend</SectionTitle>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={vulnSeverityTrend}>
              <defs>
                <linearGradient id="critG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.red} stopOpacity={0.4}/><stop offset="100%" stopColor={C.red} stopOpacity={0}/></linearGradient>
                <linearGradient id="highG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.amber} stopOpacity={0.35}/><stop offset="100%" stopColor={C.amber} stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
              <XAxis dataKey="name" stroke="transparent" tick={{ fill:C.inkMid, fontSize:9 }} />
              <YAxis stroke="transparent" tick={{ fill:C.inkMid, fontSize:10 }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="critical" name="Critical" stackId="v" stroke={C.red} fill="url(#critG)" />
              <Area type="monotone" dataKey="high" name="High" stackId="v" stroke={C.amber} fill="url(#highG)" />
              <Area type="monotone" dataKey="medium" name="Medium" stackId="v" stroke={C.blue} fill={C.blueSoft} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}

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
      {/* No RunningPipelineBanner here — the LIVE CommitCards below are the content */}
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
                {scan.repo_name} · {scan.branch} · <LiveRelTime iso={scanTimestamp(scan)} />
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
          <AIAnalysisBlock scan={scan} feedback={feedback} onFeedback={onFeedback} />

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
                <span style={{ fontSize:11, color:C.inkMid, marginLeft:"auto" }}><LiveRelTime iso={scanTimestamp(scan)} /></span>
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
function MetricsTab({ scans, totalScans }) {
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
          { label:"Total scans",   value:totalScans ?? completed.length,             color:C.teal, sub: totalScans > completed.length ? `latest ${completed.length} loaded` : undefined },
          { label:"Blocked",       value:completed.filter(s=>s.action_taken==="BLOCK").length, color:C.amber },
          { label:"With AI",       value:completed.filter(s=>s.ai_explanation).length, color:C.cyan  },
        ].map((k,i) => (
          <StatCard3D key={k.label} label={k.label} value={k.value} color={k.color} sub={k.sub || ""} delay={i * 0.04} />
        ))}
      </div>

      <div className="sf-grid-metrics" style={{ marginBottom:14 }}>
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
function LiveRelTime({ iso, date }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const ts = iso || (date instanceof Date ? date.toISOString() : date);
  if (!ts) return null;
  return <span>{relTime(ts)}</span>;
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
  const [totalScans,     setTotalScans]    = useState(null);
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
      const rows = Array.isArray(data) ? data : (data.scans || []);
      setTotalScans(Array.isArray(data) ? rows.length : (data.total ?? rows.length));
      const normalized = rows.map(normaliseScan);
      setScans(normalized);
      const fbFromServer = {};
      normalized.forEach(s => {
        if (s.ai_feedback === "accurate") fbFromServer[s.id] = "accept";
        else if (s.ai_feedback === "incorrect") fbFromServer[s.id] = "reject";
      });
      if (Object.keys(fbFromServer).length) {
        setFeedback(prev => ({ ...prev, ...fbFromServer }));
      }
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const mergeWsMessage = useCallback((msg) => {
    if (!msg?.type || msg.type === "ping") return true;

    if (msg.type === "scan_started" && msg.run_id != null) {
      setScans(prev => {
        const row = normaliseScan({
          id: Number(msg.run_id),
          commit_sha: msg.commit_sha,
          commit_message: msg.commit_message || "",
          repo_name: msg.repo_name,
          branch: msg.branch,
          status: "running",
          pipeline_steps: msg.pipeline_steps || { checkout: { result: "PASS", detail: "code checked out" } },
          started_at: msg.started_at,
          created_at: msg.started_at,
        });
        return [row, ...prev.filter(s => !sameRunId(s.id, msg.run_id))];
      });
      setLastUpdated(new Date());
      return true;
    }

    // AFTER
    if (msg.type === "scan_progress" && msg.run_id != null) {
      setScans(prev => prev.map(s => {
        if (!sameRunId(s.id, msg.run_id)) return s;
        // Spread the full WS payload so severity/risk/etc. aren't lost
        const { run_id, type, ...rest } = msg;
        return normaliseScan({
          ...s,
          ...rest,
          status: "running",
          pipeline_steps: msg.pipeline_steps ?? s.pipeline_steps,
        });
      }));
      setLastUpdated(new Date());
      return true;
    }

    if (["scan_complete", "scan_timeout"].includes(msg.type) && msg.id != null) {
      setScans(prev => prev.map(s => {
        if (!sameRunId(s.id, msg.id)) return s;
        return normaliseScan({ ...s, ...msg, status: msg.status || "complete" });
      }));
      setLastUpdated(new Date());
      return false;
    }

    return false;
  }, []);

  useEffect(() => {
    let reconnectTimer;
    let reconnectDelay = 1500;

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
          try {
            const m = JSON.parse(e.data);
            if (!mergeWsMessage(m)) fetchScans();
          } catch {
            fetchScans();
          }
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
    const poll = setInterval(fetchScans, 6000);
    fetchScans();

    return () => {
      clearInterval(poll);
      clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, [fetchScans, mergeWsMessage]);

  useEffect(() => {
    if (selectedScan?.id) {
      const fresh = scans.find(s => sameRunId(s.id, selectedScan.id));
      if (fresh) setSelectedScan(fresh);
    }
  }, [scans, selectedScan?.id]);

  useEffect(() => {
    if (whyBlockedScan?.id) {
      const fresh = scans.find(s => sameRunId(s.id, whyBlockedScan.id));
      if (fresh) setWhyBlockedScan(fresh);
    }
  }, [scans, whyBlockedScan?.id]);

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
          <WhyBlockedModal key="why-blocked" scan={whyBlockedScan} onClose={() => setWhyBlockedScan(null)} feedback={feedback} onFeedback={submitFeedback} />
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
        <header className="sf-header" style={{
          position:"sticky", top:0, zIndex:200,
          background:`${C.bg}e8`,
          backdropFilter:"blur(16px) saturate(180%)",
          borderBottom:`1px solid ${C.border}`,
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
          <nav className="sf-nav">
            {TABS.map(({ id, label, Icon }) => (
              <button key={id} className={`sf-tab ${activeTab===id?"active":""}`}
                onClick={() => setActiveTab(id)}>
                <Icon size={14} /> <span className="tab-label">{label}</span>
              </button>
            ))}
          </nav>

          {/* Right side */}
          <div className="sf-header-right" style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:12 }}>
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
                Updated <LiveRelTime date={lastUpdated} />
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
        {running.length > 0 && (
          <div className="live-pulse-bar" style={{ position:"sticky", top:56, zIndex:199 }} aria-label="Pipeline running" />
        )}

        {/* MAIN */}
        <main className="sf-main" style={{ position:"relative", zIndex:1 }}>
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
                  scans={scans} totalScans={totalScans} healthScore={healthScore} avgRisk={avgRisk}
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
              {activeTab==="metrics" && <MetricsTab scans={scans} totalScans={totalScans} />}
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
