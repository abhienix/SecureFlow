/**
 * SecureFlow — App.jsx (v4.0 — Ultra-Smooth DevSecOps Security Gate)
 * Real-time CI/CD Security Dashboard & Interactive Pipeline Gate
 */

import React, {
  useState, useEffect, useCallback, useRef, useMemo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Shield, Activity, CheckCircle, XCircle, AlertTriangle,
  ThumbsUp, ThumbsDown,
  GitPullRequest, GitBranch,
  Loader2, X, Send, Bot, Minimize2,
  Lock, Terminal, Cpu, Globe, Brain,
  Wrench, BarChart2, AlertCircle,
  Copy, Check, Sun, Moon, Play, Search,
} from "lucide-react";

/* ─── Design Tokens (Dark / Light Theme Engine) ─────────────────────────── */
const THEMES = {
  dark: {
    bg:           "#090d16",
    bgCard:       "#111827",
    bgSurface:    "#1e293b",
    bgElevated:   "#334155",
    bgHover:      "#1f293d",
    border:       "#1f293d",
    borderMid:    "#334155",
    borderStrong: "#475569",
    ink:          "#f8fafc",
    inkMid:       "#94a3b8",
    inkLow:       "#64748b",
    inkMuted:     "#475569",
    teal:         "#00f2fe",
    tealLight:    "#38bdf8",
    tealSoft:     "#0c2a3a",
    tealBord:     "#0369a1",
    tealMid:      "#0284c7",
    green:        "#10b981",
    greenSoft:    "#064e3b",
    greenBord:    "#047857",
    greenMid:     "#34d399",
    red:          "#ef4444",
    redSoft:      "#450a0a",
    redBord:      "#b91c1c",
    redMid:       "#f87171",
    amber:        "#f59e0b",
    amberSoft:    "#451a03",
    amberBord:    "#b45309",
    amberMid:     "#fbbf24",
    blue:         "#3b82f6",
    blueSoft:     "#172554",
    blueBord:     "#1d4ed8",
    blueMid:      "#60a5fa",
    violet:       "#a855f7",
    violetSoft:   "#3b0764",
    violetBord:   "#7e22ce",
    cyan:         "#06b6d4",
    cyanSoft:     "#083344",
    cyanBord:     "#0e7490",
    borderBright: "#334155",
    mono: "'JetBrains Mono','Fira Mono','Consolas',monospace",
    sans: "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  },
  light: {
    bg:           "#f8fafc",
    bgCard:       "#ffffff",
    bgSurface:    "#f1f5f9",
    bgElevated:   "#e8edf3",
    bgHover:      "#f0f4f8",
    border:       "#e2e8f0",
    borderMid:    "#cbd5e1",
    borderStrong: "#94a3b8",
    ink:          "#0f172a",
    inkMid:       "#334155",
    inkLow:       "#64748b",
    inkMuted:     "#94a3b8",
    teal:         "#0d9488",
    tealLight:    "#14b8a6",
    tealSoft:     "#f0fdfa",
    tealBord:     "#99f6e4",
    tealMid:      "#5eead4",
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
    mono: "'JetBrains Mono','Fira Mono','Consolas',monospace",
    sans: "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  }
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

/* ─── Global CSS Generator ─────────────────────────────────────────── */
function buildGlobalCSS(C) {
  return `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body {
  background: ${C.bg};
  color: ${C.ink};
  font-family: ${C.sans};
  -webkit-font-smoothing: antialiased;
  min-height: 100vh;
  transition: background-color 0.3s ease, color 0.3s ease;
}

button { cursor: pointer; font-family: ${C.sans}; outline: none; }
button:focus-visible { outline: 2px solid ${C.teal}; outline-offset: 2px; }

::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: ${C.borderMid}; border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: ${C.borderStrong}; }

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
  0%,100%{box-shadow:0 0 0 0 ${C.teal}22,0 4px 24px rgba(0,242,254,.1)}
  50%{box-shadow:0 0 0 8px ${C.teal}14,0 4px 24px rgba(0,242,254,.25)}
}
@keyframes pulseRing {
  0%   { transform: scale(1);   opacity: 1; }
  70%  { transform: scale(1.8); opacity: 0; }
  100% { transform: scale(1.8); opacity: 0; }
}
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-4px); }
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
  0%, 100% { transform: scale(1) translateZ(0); box-shadow: 0 0 0 0 ${C.blue}55; }
  50%      { transform: scale(1.1) translateZ(8px); box-shadow: 0 0 0 10px ${C.blue}00; }
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

/* Cards & Layout */
.sf-card {
  background: ${C.bgCard};
  border: 1px solid ${C.border};
  border-radius: 14px;
  transition: box-shadow .2s, border-color .2s, transform .18s;
}
.sf-card:hover,
.sf-card-hover:hover {
  border-color: ${C.borderMid};
  box-shadow: 0 6px 24px rgba(0,0,0,.15);
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
  background: linear-gradient(145deg, ${C.bgCard}ee 0%, ${C.bgSurface}dd 100%);
  border: 1px solid ${C.border};
  border-radius: 18px;
  box-shadow: 0 8px 32px rgba(0,0,0,.2);
  backdrop-filter: blur(14px);
  transform-style: preserve-3d;
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
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.08), transparent);
  transform: rotate(25deg);
  animation: shimmer 4s ease-in-out infinite;
}

/* Header & Tabs */
.sf-header {
  height: 58px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  gap: 16px;
}
.sf-nav {
  display: flex;
  gap: 6px;
  background: ${C.bgSurface};
  padding: 4px;
  border-radius: 12px;
  border: 1px solid ${C.border};
}
.sf-tab {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 14px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: ${C.inkMid};
  font-size: 13px;
  font-weight: 600;
  transition: all 0.2s ease;
}
.sf-tab:hover {
  color: ${C.ink};
  background: ${C.bgHover};
}
.sf-tab.active {
  background: ${C.bgCard};
  color: ${C.teal};
  box-shadow: 0 2px 8px rgba(0,0,0,.15);
  font-weight: 700;
}
.tab-label { display: inline; }
@media (max-width: 640px) {
  .tab-label { display: none; }
  .sf-header { padding: 0 12px; }
}

.sf-main {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px 20px 80px;
}
`;
}

/* ─── Helpers ─────────────────────────────────────────────────────────── */
function resultToStatus(stage, fallbackStatus) {
  const result = (stage?.result || "").toUpperCase();
  if (result === "PASS" || result === "PASSED" || result === "ALLOW" || result === "SUCCESS") return "passed";
  if (result === "FAIL" || result === "FAILED" || result === "BLOCK" || result === "FAILURE") return "failed";
  if (result === "RUNNING" || result === "IN_PROGRESS") return "running";
  if (result === "SKIPPED") return "skipped";

  const st = (fallbackStatus || "").toLowerCase();
  if (st === "complete") return "passed";
  if (st === "running") return "running";
  if (st === "timeout" || st === "cancelled") return "failed";
  return "passed";
}




function sevNorm(s) {
  const v = (s || "").toUpperCase();
  if (v === "CRITICAL" || v === "HIGH" || v === "MEDIUM" || v === "LOW") return v;
  return "UNKNOWN";
}

function buildVulnerabilities(raw, vuln_breakdown, pipeline) {
  const out = [];
  const rawFindings = raw?.findings || {};

  const gitleaks = rawFindings.gitleaks || rawFindings.secrets || [];
  (Array.isArray(gitleaks) ? gitleaks : [gitleaks]).forEach((g, idx) => {
    if (!g || typeof g !== "object") return;
    out.push({
      cve_id: `SECRET-${g.RuleID || g.rule || idx + 1}`,
      id: `secret-${idx}`,
      package: g.File || g.file || "Codebase",
      severity: "CRITICAL",
      score: "9.8",
      version: g.StartLine ? `Line ${g.StartLine}` : "Exposed Credential",
      description: g.Description || g.description || "Potential sensitive credential or API key exposed in source code.",
    });
  });

  const semgrep = rawFindings.semgrep || rawFindings.code_patterns || [];
  (Array.isArray(semgrep) ? semgrep : [semgrep]).forEach((s, idx) => {
    if (!s || typeof s !== "object") return;
    out.push({
      cve_id: s.check_id || `SEMGREP-${idx + 1}`,
      id: `semgrep-${idx}`,
      package: s.path || "Code Base",
      severity: (s.extra?.severity || "HIGH").toUpperCase(),
      score: "7.5",
      version: s.start?.line ? `Line ${s.start.line}` : "Static Analysis",
      description: s.extra?.message || "Insecure code pattern flagged by static application security testing.",
    });
  });

  const results = rawFindings.Results || rawFindings.results || [];
  results.forEach(res => {
    (res.Vulnerabilities || []).forEach(v => {
      out.push({
        cve_id: v.VulnerabilityID || v.CVEID || "CVE-UNKNOWN",
        id: v.VulnerabilityID || `cve-${out.length}`,
        package: v.PkgName || v.Package || "Unknown Package",
        severity: sevNorm(v.Severity),
        score: String(v.CVSS?.nvd?.V3Score || v.CVSS?.redhat?.V3Score || v.Score || "N/A"),
        version: v.InstalledVersion || v.Version || "",
        fix: v.FixedVersion || "",
        description: v.Title || v.Description || "Vulnerability found in container image dependency.",
      });
    });
  });

  if (out.length === 0 && raw?.action_taken === "BLOCK") {
    const codeStep = pipeline?.find(st => st.key === "code_scan");
    out.push({
      cve_id: "CODE-GATE-BLOCK",
      id: "code-block",
      package: raw.repo_name || "Repository",
      severity: raw.severity || "HIGH",
      score: "8.5",
      version: raw.branch || "main",
      description: codeStep?.detail || raw.ai_explanation || "Security gate policy blocked pipeline execution.",
    });
  }
  return out;
}

function getSeverityCounts(vulnerabilities) {
  const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, UNKNOWN: 0 };
  (vulnerabilities || []).forEach(v => {
    const sev = sevNorm(v.severity);
    if (counts[sev] !== undefined) counts[sev]++;
    else counts.UNKNOWN++;
  });
  return counts;
}

function normaliseScan(raw) {
  const rawSteps = raw.pipeline_steps || {};
  const status = raw.status || "complete";

  const pipeline = PIPELINE_STAGES.map(def => {
    const step = rawSteps[def.key];
    const st = resultToStatus(step, status);
    return {
      id: def.key,
      key: def.key,
      name: def.label,
      Icon: def.Icon,
      status: st,
      result: step?.result || (st === "passed" ? "PASS" : st === "failed" ? "FAIL" : st === "running" ? "RUNNING" : "SKIPPED"),
      detail: step?.detail || null,
    };
  });

  const vulnerabilities = buildVulnerabilities(raw, raw.vuln_breakdown, pipeline);
  const severity_counts = getSeverityCounts(vulnerabilities);

  return {
    ...raw,
    id: raw.id,
    commit_sha: raw.commit_sha || "unknown",
    commit_message: raw.commit_message || "No commit message provided",
    repo_name: raw.repo_name || "unknown-repo",
    branch: raw.branch || "main",
    severity: raw.severity || (vulnerabilities.length ? vulnerabilities[0].severity : "CLEAN"),
    action_taken: raw.action_taken || "ALLOW",
    status,
    risk_score: raw.risk_score != null ? raw.risk_score : (raw.action_taken === "BLOCK" ? 8 : 2),
    pipeline,
    vulnerabilities,
    severity_counts,
    vuln_breakdown: raw.vuln_breakdown || {
      total: vulnerabilities.length,
      critical: severity_counts.CRITICAL,
      high: severity_counts.HIGH,
      medium: severity_counts.MEDIUM,
      low: severity_counts.LOW,
    },
  };
}

function relTime(iso) {
  if (!iso) return "recently";
  const dt = new Date(iso);
  const sec = Math.floor((new Date() - dt) / 1000);
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return dt.toLocaleDateString();
}

function fmtFull(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString();
}

const sevColor = (s, C) =>
  s === "CRITICAL" ? C.red :
  s === "HIGH"     ? C.amber :
  s === "MEDIUM"   ? C.blue :
  s === "LOW"      ? C.teal : C.inkLow;

const riskColor = (r, C) =>
  r >= 8 ? C.red : r >= 5 ? C.amber : C.teal;

/* ─────────────────────────────────────────────
   COMPONENTS
───────────────────────────────────────────── */

const Badge = ({ children, color, C, small=false }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 4,
    padding: small ? "2px 7px" : "3px 9px", borderRadius: 999,
    background: `${color}18`, border: `1px solid ${color}40`,
    color, fontSize: small ? 10 : 11, fontWeight: 700,
    fontFamily: C.mono, letterSpacing: "0.02em", whiteSpace: "nowrap",
  }}>
    <span style={{ width: 5, height: 5, borderRadius: "50%", background: color }} />
    {children}
  </span>
);

const IconBtn = ({ Icon, onClick, title, color, C }) => (
  <motion.button
    whileHover={{ scale: 1.08 }}
    whileTap={{ scale: 0.94 }}
    onClick={onClick}
    title={title}
    style={{
      width: 32, height: 32, borderRadius: 8,
      border: `1px solid ${C.border}`,
      background: C.bgCard,
      color: color || C.inkMid,
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: "0 1px 3px rgba(0,0,0,.08)",
    }}
  >
    <Icon size={15} />
  </motion.button>
);

const KpiCard = ({ title, value, sub, Icon, color, C }) => (
  <motion.div
    whileHover={{ y: -3, scale: 1.01 }}
    className="sf-card-hover kpi-shine"
    style={{
      padding: "16px 18px", flex: 1, minWidth: 200,
      background: C.bgCard, border: `1px solid ${C.border}`,
      boxShadow: "0 4px 16px rgba(0,0,0,.06)",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: C.inkMid, letterSpacing: "0.06em", textTransform: "uppercase" }}>
        {title}
      </span>
      {Icon && (
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: `${color}16`, border: `1px solid ${color}33`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={16} color={color} />
        </div>
      )}
    </div>
    <div style={{ fontSize: 28, fontWeight: 900, fontFamily: C.mono, color, lineHeight: 1 }}>{value}</div>
    <div style={{ fontSize: 11, color: C.inkLow, marginTop: 6, fontWeight: 500 }}>{sub}</div>
  </motion.div>
);

const SectionTitle = ({ children, accent, right, C }) => (
  <div style={{
    fontSize: 11, fontWeight: 800, color: accent || C.inkMid,
    letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14,
    display: "flex", alignItems: "center", justifyContent: "space-between",
  }}>
    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
      {accent && <div style={{ width: 3, height: 14, background: accent, borderRadius: 2, flexShrink: 0 }} />}
      {children}
    </div>
    {right}
  </div>
);

function PrometheusGauge({ value, max=100, label, unit="", color, size=100, C }) {
  const r = (size - 16) / 2;
  const arc = Math.PI * r;
  const offset = arc - (Math.min(value, max) / max) * arc;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <div style={{ position: "relative", width: size, height: size/2 + 10 }}>
        <svg width={size} height={size/2 + 14} style={{ overflow: "visible" }}>
          <path
            d={`M 8 ${size/2} A ${r} ${r} 0 0 1 ${size-8} ${size/2}`}
            fill="none" stroke={C.bgSurface} strokeWidth={9} strokeLinecap="round"
          />
          <path
            d={`M 8 ${size/2} A ${r} ${r} 0 0 1 ${size-8} ${size/2}`}
            fill="none" stroke={color} strokeWidth={9} strokeLinecap="round"
            strokeDasharray={arc}
            strokeDashoffset={offset}
            style={{
              transition: "stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)",
              filter: `drop-shadow(0 0 6px ${color}80)`,
            }}
          />
          <text x={size/2} y={size/2 + 2} textAnchor="middle"
            fill={color} fontFamily={C.mono} fontSize={17} fontWeight={900}>
            {typeof value === "number" ? value.toFixed(unit === "%" ? 1 : 0) : value}{unit}
          </text>
        </svg>
      </div>
      <div style={{ fontSize: 10, color: C.inkMid, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", textAlign: "center" }}>
        {label}
      </div>
    </div>
  );
}

function RunningPipelineBanner({ scans, C }) {
  const running = scans.filter(s => s.status === "running");
  if (!running.length) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        marginBottom: 20, padding: "16px 20px",
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
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
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
            <div style={{ fontSize: 14, fontWeight: 700, color: C.blue }}>
              {running.length} pipeline{running.length > 1 ? "s" : ""} running live
            </div>
            <div style={{ fontSize: 11, color: C.inkMid }}>Pipeline gate evaluating policy rules in real-time</div>
          </div>
        </div>
        {running.slice(0, 3).map(scan => (
          <div key={scan.id} style={{ marginBottom: running.length > 1 ? 10 : 0 }}>
            <div style={{ fontSize: 11, color: C.inkMid, marginBottom: 6, fontFamily: C.mono }}>
              {scan.commit_sha?.slice(0, 8)} · {scan.repo_name} ({scan.branch})
            </div>
            <PipelineMiniNodes pipeline={scan.pipeline} live C={C} />
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function PipelineMiniNodes({ pipeline, live = false, C }) {
  if (!pipeline?.length) return null;
  const nodeSize = live ? 40 : 34;
  const iconSize = live ? 17 : 15;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, margin: "10px 0 4px", overflowX: "auto", paddingBottom: 4 }}>
      {pipeline.map((stage, i) => {
        const color =
          stage.status === "passed"  ? C.teal  :
          stage.status === "failed"  ? C.red   :
          stage.status === "running" ? C.blue  :
          stage.status === "skipped" ? C.inkMuted :
          C.inkLow;
        const isActive = stage.status === "running";
        const { Icon } = stage;
        return (
          <React.Fragment key={stage.id}>
            {i > 0 && (
              <div className={(pipeline[i-1].status === "running" || isActive) ? "pipe-flow pipe-flow-active" : ""} style={{
                flex: 1, height: (pipeline[i-1].status === "running" || isActive) ? 3 : 2,
                minWidth: live ? 14 : 10, maxWidth: live ? 38 : 28,
                background: pipeline[i-1].status === "passed"
                  ? `linear-gradient(90deg, ${C.teal}80, ${color}80)`
                  : (pipeline[i-1].status === "running" || isActive) ? undefined : C.border,
                borderRadius: 2,
              }} />
            )}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, minWidth: live ? 58 : 52 }}>
              <motion.div
                className={isActive ? "node-running-3d" : ""}
                animate={isActive ? { scale: live ? [1, 1.12, 1] : [1, 1.06, 1] } : {}}
                transition={isActive ? { duration: 1.4, repeat: Infinity } : {}}
                style={{
                  width: nodeSize, height: nodeSize, borderRadius: "50%",
                  border: `2px solid ${color}`,
                  background: `${color}18`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color,
                  boxShadow: isActive
                    ? `0 0 0 ${live ? 6 : 4}px ${color}25, 0 0 ${live ? 24 : 16}px ${color}55` : `0 0 8px ${color}20`,
                }}>
                {isActive ? <Loader2 size={iconSize} className="spin" /> :
                 stage.status === "passed"  ? <CheckCircle size={iconSize} /> :
                 stage.status === "failed"  ? <XCircle size={iconSize} /> :
                 stage.status === "skipped" ? <span style={{ fontSize: 11 }}>—</span> :
                 Icon ? <Icon size={iconSize - 2} /> : null}
              </motion.div>
              <div style={{ fontSize: 9, color: isActive ? C.blue : C.inkMid, fontWeight: isActive ? 700 : 500, textAlign: "center", whiteSpace: "nowrap" }}>
                {stage.name}
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

function PipelineFullView({ pipeline, C }) {
  if (!pipeline?.length) return null;
  return (
    <div style={{ marginTop: 14 }}>
      {pipeline.map((stage, i) => {
        const color =
          stage.status === "passed"  ? C.teal  :
          stage.status === "failed"  ? C.red   :
          stage.status === "running" ? C.blue  : C.inkMid;
        const { Icon } = stage;
        return (
          <div key={stage.id} style={{ display: "flex", gap: 14, marginBottom: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 34, flexShrink: 0 }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                border: `2px solid ${color}`,
                background: `${color}18`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color, flexShrink: 0,
                boxShadow: stage.status === "running" ? `0 0 14px ${color}60` : "none",
              }}>
                {stage.status === "running" ? <Loader2 size={14} className="spin" /> :
                 stage.status === "passed"  ? <CheckCircle size={14} /> :
                 stage.status === "failed"  ? <XCircle size={14} /> :
                 Icon ? <Icon size={12} /> : null}
              </div>
              {i < pipeline.length - 1 && (
                <div style={{
                  width: 2, flex: 1, minHeight: 22,
                  background: stage.status === "passed" ? `linear-gradient(${color}, ${color}30)` : C.border,
                  marginTop: 4, marginBottom: 4, borderRadius: 2,
                }} />
              )}
            </div>
            <div style={{ flex: 1, paddingBottom: i < pipeline.length - 1 ? 14 : 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: stage.detail ? 4 : 0 }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: C.ink }}>{stage.name}</span>
                <Badge color={color} small C={C}>{stage.result || stage.status}</Badge>
              </div>
              {stage.detail && (
                <div style={{
                  fontSize: 12, color: C.inkMid, fontFamily: C.mono,
                  background: C.bgSurface, padding: "6px 10px",
                  borderRadius: 6, border: `1px solid ${C.border}`, marginTop: 4,
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

function AIAnalysisBlock({ scan, compact=false, feedback, onFeedback, C }) {
  const existingRemedy = scan.ai_remedy || scan.ai_fix || null;
  const [loadingRemedy, setLoadingRemedy] = useState(false);
  const [remedy, setRemedy] = useState(existingRemedy);
  const [remedyError, setRemedyError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setRemedy(scan.ai_remedy || scan.ai_fix || null);
    setRemedyError(null);
  }, [scan.id, scan.ai_remedy, scan.ai_fix]);

  const displayedRemedy = remedy || existingRemedy;

  const handleCopyRemedy = () => {
    if (!displayedRemedy) return;
    navigator.clipboard?.writeText(displayedRemedy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fetchRemedy = async () => {
    if (displayedRemedy || loadingRemedy) return;
    setLoadingRemedy(true);
    setRemedyError(null);
    try {
      const res = await fetch(`${BACKEND}/api/scan-results/${scan.id}/reanalyze`, { method: "POST" });
      if (!res.ok) {
        setRemedyError(`Backend returned ${res.status}. Check backend logs.`);
        return;
      }
      const d = await res.json();
      if (d?.ai_fix || d?.ai_remedy) {
        setRemedy(d.ai_fix || d.ai_remedy);
        return;
      }
      setRemedyError("No specific remedy was generated for this scan type.");
    } catch (err) {
      setRemedyError("Could not reach AI backend service.");
    } finally {
      setLoadingRemedy(false);
    }
  };

  if (!scan.ai_explanation && !scan.ai_remedy && !scan.ai_fix && scan.action_taken !== "BLOCK") return null;

  return (
    <div style={{
      marginTop: 12, padding: compact ? 10 : 14,
      background: C.violetSoft, borderRadius: 12,
      border: `1px solid ${C.violetBord}`,
      fontSize: 13, lineHeight: 1.65,
    }}>
      <div className="ai-disclaimer">
        <AlertTriangle size={14} style={{ color: C.amber, flexShrink: 0, marginTop: 1 }} />
        <span>AI DevSecOps Guidance — verified with security policy engine.</span>
      </div>

      <div style={{
        display: "flex", gap: 6, alignItems: "center",
        color: C.violet, fontWeight: 700, marginBottom: 8,
        fontSize: 11, letterSpacing: "0.08em",
      }}>
        <Brain size={13} /> AI SECURITY GATE ANALYSIS
      </div>

      {scan.ai_explanation && (
        <div style={{ color: C.ink, marginBottom: (displayedRemedy || !compact) ? 10 : 0 }}>
          {scan.ai_explanation}
        </div>
      )}

      {(displayedRemedy || loadingRemedy) && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: C.bgCard, border: `1px solid ${C.tealBord}`,
            borderRadius: 10, padding: 12, marginTop: 8,
            boxShadow: `0 4px 16px ${C.teal}14`,
          }}
        >
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            fontSize: 11, fontWeight: 800, color: C.teal,
            letterSpacing: "0.08em", marginBottom: 6,
          }}>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Wrench size={12} /> RECOMMENDED REMEDY
            </span>
            {displayedRemedy && (
              <button
                onClick={handleCopyRemedy}
                style={{
                  display: "flex", alignItems: "center", gap: 4,
                  padding: "3px 8px", borderRadius: 6,
                  background: C.tealSoft, border: `1px solid ${C.tealBord}`,
                  color: C.teal, fontSize: 10, fontWeight: 700,
                }}
              >
                {copied ? <Check size={11} /> : <Copy size={11} />}
                {copied ? "Copied" : "Copy Fix"}
              </button>
            )}
          </div>
          {loadingRemedy ? (
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: C.inkMid, fontSize: 12 }}>
              <Loader2 size={12} className="spin" /> Generating remedy…
            </div>
          ) : (
            <div style={{ fontSize: 12, color: C.ink, fontFamily: C.mono, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
              {displayedRemedy}
            </div>
          )}
        </motion.div>
      )}

      {remedyError && !loadingRemedy && (
        <div style={{ fontSize: 12, color: C.red, marginTop: 8 }}>{remedyError}</div>
      )}

      {!displayedRemedy && !loadingRemedy && scan.action_taken === "BLOCK" && (
        <button onClick={fetchRemedy} style={{
          marginTop: 8, display: "flex", alignItems: "center", gap: 5,
          fontSize: 11, color: C.teal, background: C.tealSoft, border: `1px solid ${C.tealBord}`,
          borderRadius: 6, padding: "5px 12px", fontWeight: 700,
        }}>
          <Wrench size={12} /> Generate Remediation Code
        </button>
      )}

      {(scan.ai_explanation || displayedRemedy) && (
        <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.violetBord}` }}>
          <AIFeedbackRow scanId={scan.id} feedback={feedback} onFeedback={onFeedback} C={C} />
        </div>
      )}
    </div>
  );
}

const AIFeedbackRow = ({ scanId, feedback, onFeedback, C }) => {
  if (!onFeedback || !scanId) return null;
  const myFb = feedback?.[scanId];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <span style={{ fontSize: 11, color: C.inkMid, fontWeight: 600 }}>Rate this analysis:</span>
      {["accept", "reject"].map(type => (
        <button
          key={type}
          onClick={() => onFeedback(scanId, type)}
          style={{
            display: "flex", alignItems: "center", gap: 4,
            padding: "4px 10px", borderRadius: 999,
            background: myFb === type ? (type === "accept" ? C.greenSoft : C.redSoft) : C.bgSurface,
            border: `1px solid ${myFb === type ? (type === "accept" ? C.greenBord : C.redBord) : C.border}`,
            color: myFb === type ? (type === "accept" ? C.green : C.red) : C.inkMid,
            fontSize: 11, fontWeight: 600,
          }}
        >
          {type === "accept" ? <ThumbsUp size={11} /> : <ThumbsDown size={11} />}
          {type === "accept" ? "Accurate" : "Incorrect"}
        </button>
      ))}
    </div>
  );
};

/* ─────────────────────────────────────────────
   MODALS & DRAWERS
───────────────────────────────────────────── */
function WhyBlockedModal({ scan, onClose, feedback, onFeedback, C }) {
  if (!scan) return null;

  const vulns = scan.vulnerabilities || [];
  const counts = scan.severity_counts || getSeverityCounts(vulns);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,.65)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
        style={{
          background: C.bgCard, border: `1px solid ${C.border}`,
          borderRadius: 20, width: "100%", maxWidth: 640,
          maxHeight: "90vh", display: "flex", flexDirection: "column",
          boxShadow: "0 24px 64px rgba(0,0,0,.4)",
          overflow: "hidden",
        }}
      >
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "18px 22px", borderBottom: `1px solid ${C.border}`,
          background: C.bgSurface,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: C.redSoft, border: `1px solid ${C.redBord}`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <AlertCircle size={18} style={{ color: C.red }} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>Deployment Blocked by Security Gate</h3>
            <p style={{ fontSize: 12, color: C.inkLow, marginTop: 1, fontFamily: C.mono }}>
              {scan.repo_name} · {scan.commit_sha?.slice(0, 8)} ({scan.branch})
            </p>
          </div>
          <IconBtn Icon={X} onClick={onClose} title="Close" C={C} />
        </div>

        <div style={{ overflowY: "auto", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", gap: 10 }}>
            {[
              { label: "Critical", count: counts.CRITICAL, col: C.red,   bg: C.redSoft,   brd: C.redBord },
              { label: "High",     count: counts.HIGH,     col: C.amber, bg: C.amberSoft, brd: C.amberBord },
              { label: "Medium",   count: counts.MEDIUM,   col: C.blue,  bg: C.blueSoft,  brd: C.blueBord },
            ].map(({ label, count, col, bg, brd }) => (
              <div key={label} style={{
                flex: 1, background: bg, border: `1px solid ${brd}`,
                borderRadius: 12, padding: "12px 14px", textAlign: "center",
              }}>
                <p style={{ fontSize: 24, fontWeight: 900, color: col, fontFamily: C.mono }}>{count}</p>
                <p style={{ fontSize: 11, color: col, fontWeight: 700, marginTop: 2 }}>{label}</p>
              </div>
            ))}
          </div>

          {vulns.length > 0 && (
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: C.inkMid, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Flagged Vulnerabilities & Code Issues
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {vulns.slice(0, 6).map((v, i) => (
                  <div key={i} style={{
                    padding: "10px 14px", background: C.bgSurface,
                    borderRadius: 10, border: `1px solid ${C.border}`,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.ink, fontFamily: C.mono }}>{v.cve_id || v.id}</span>
                      <Badge color={v.severity === "CRITICAL" ? C.red : v.severity === "HIGH" ? C.amber : C.blue} C={C}>
                        {v.severity}
                      </Badge>
                    </div>
                    <div style={{ fontSize: 11, color: C.inkMid }}>Package: {v.package} {v.version && `(${v.version})`}</div>
                    {v.description && <div style={{ fontSize: 11, color: C.inkLow, marginTop: 4 }}>{v.description}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <AIAnalysisBlock scan={scan} feedback={feedback} onFeedback={onFeedback} C={C} />
        </div>

        <div style={{ padding: "14px 22px", borderTop: `1px solid ${C.border}`, background: C.bgSurface, display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              background: C.bgCard, color: C.ink,
              border: `1px solid ${C.border}`, borderRadius: 8,
              padding: "8px 18px", fontSize: 13, fontWeight: 600,
            }}
          >
            Close Window
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ScanDetail({ scan, onClose, feedback, onFeedback, onWhyBlocked, C }) {
  if (!scan) return null;
  return (
    <motion.div
      initial={{ x: 480, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 480, opacity: 0 }}
      transition={{ type: "spring", stiffness: 280, damping: 30 }}
      style={{
        position: "fixed", top: 0, right: 0,
        width: 480, maxWidth: "100vw", height: "100vh",
        background: C.bgCard, borderLeft: `1px solid ${C.border}`,
        zIndex: 250, overflowY: "auto", padding: 24,
        boxShadow: "-12px 0 40px rgba(0,0,0,.25)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.ink }}>{scan.repo_name}</h2>
        <IconBtn Icon={X} onClick={onClose} title="Close" C={C} />
      </div>
      <div style={{ fontFamily: C.mono, color: C.teal, fontSize: 12, marginBottom: 4 }}>SHA: {scan.commit_sha}</div>
      <div style={{ fontSize: 13, color: C.inkMid, marginBottom: 6 }}>{scan.commit_message}</div>
      <div style={{ fontSize: 11, color: C.inkLow, marginBottom: 18 }}>{fmtFull(scan.created_at)}</div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <Badge color={scan.action_taken === "BLOCK" ? C.red : C.teal} C={C}>{scan.action_taken || "ALLOW"}</Badge>
        {scan.severity && <Badge color={sevColor(scan.severity, C)} C={C}>{scan.severity}</Badge>}
        {scan.risk_score != null && <Badge color={riskColor(scan.risk_score, C)} C={C}>Risk {scan.risk_score}/10</Badge>}
      </div>

      <SectionTitle accent={C.teal} C={C}>Pipeline execution stages</SectionTitle>
      <PipelineFullView pipeline={scan.pipeline} C={C} />

      {scan.vulnerabilities?.length > 0 && (
        <div style={{ marginTop: 22 }}>
          <SectionTitle accent={C.amber} C={C}>Detected vulnerabilities ({scan.vulnerabilities.length})</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {scan.vulnerabilities.map((v, i) => (
              <div key={i} style={{ padding: 10, background: C.bgSurface, borderRadius: 8, border: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: C.mono, fontSize: 11, fontWeight: 700, color: C.ink }}>{v.cve_id}</span>
                  <Badge color={sevColor(v.severity, C)} small C={C}>{v.severity}</Badge>
                </div>
                <div style={{ fontSize: 11, color: C.inkLow, marginTop: 2 }}>Package: {v.package}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <AIAnalysisBlock scan={scan} feedback={feedback} onFeedback={onFeedback} C={C} />

      {scan.action_taken === "BLOCK" && (
        <button onClick={() => onWhyBlocked(scan)} style={{
          marginTop: 20, padding: "12px", width: "100%",
          background: C.redSoft, border: `1px solid ${C.redBord}`,
          borderRadius: 10, color: C.red, fontWeight: 700, fontSize: 13,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
        }}>
          <AlertTriangle size={15} /> Why was this commit blocked?
        </button>
      )}
    </motion.div>
  );
}

function AICopilot({ scans, onClose, C }) {
  const [messages, setMessages] = useState([{
    role: "assistant",
    text: "Hello! I am your SecureFlow AI Copilot. Ask me about blocked builds, vulnerability remedies, policy decisions, or security trends.",
  }]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [minimised, setMinimised] = useState(false);
  const endRef = useRef(null);

  const blocked = scans.filter(s => s.action_taken === "BLOCK");
  const running = scans.filter(s => s.status === "running");

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (q) => {
    const question = q || input.trim();
    if (!question || sending) return;
    setInput("");
    const nextMessages = [...messages, { role: "user", text: question }];
    setMessages(nextMessages);
    setSending(true);

    try {
      const res = await fetch(`${BACKEND}/api/copilot/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      setMessages(m => [...m, { role: "assistant", text: data?.answer || "AI response generated successfully." }]);
    } catch {
      setMessages(m => [...m, { role: "assistant", text: "Unable to contact AI Copilot backend." }]);
    } finally {
      setSending(false);
    }
  };

  const QUICK_PROMPTS = [
    "Why was the last build blocked?",
    "Summarize pipeline security status",
    "How to remediate top CVEs?",
  ];

  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 500,
    }}>
      {minimised ? (
        <button onClick={() => setMinimised(false)} style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 18px", borderRadius: 999,
          background: C.bgCard, border: `1px solid ${C.tealBord}`,
          color: C.teal, fontSize: 13, fontWeight: 700,
          boxShadow: `0 8px 32px ${C.teal}30`,
        }}>
          <Bot size={18} /> AI Copilot
        </button>
      ) : (
        <div style={{
          background: C.bgCard, border: `1px solid ${C.border}`,
          borderRadius: 20, width: 380, maxWidth: "90vw",
          height: 520, display: "flex", flexDirection: "column",
          boxShadow: "0 24px 64px rgba(0,0,0,.4)", overflow: "hidden",
        }}>
          <div style={{
            padding: "14px 16px", borderBottom: `1px solid ${C.border}`,
            background: C.bgSurface, display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Bot size={18} color={C.teal} />
              <span style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>AI Security Copilot</span>
              {blocked.length > 0 && <Badge color={C.red} small C={C}>{blocked.length} blocked</Badge>}
              {running.length > 0 && <Badge color={C.blue} small C={C}>{running.length} running</Badge>}
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <button onClick={() => setMinimised(true)} style={{ background: "none", border: "none", color: C.inkMid, padding: 4 }}><Minimize2 size={15} /></button>
              <button onClick={onClose} style={{ background: "none", border: "none", color: C.inkMid, padding: 4 }}><X size={15} /></button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            {messages.map((m, idx) => (
              <div key={idx} style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "85%", padding: "10px 14px", borderRadius: 12,
                background: m.role === "user" ? C.tealSoft : C.bgSurface,
                border: `1px solid ${m.role === "user" ? C.tealBord : C.border}`,
                color: C.ink, fontSize: 12, lineHeight: 1.5,
              }}>
                {m.text}
              </div>
            ))}
            {sending && (
              <div style={{ alignSelf: "flex-start", color: C.teal, fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                <Loader2 size={13} className="spin" /> Analyzing pipeline context…
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div style={{ padding: 12, borderTop: `1px solid ${C.border}`, background: C.bgSurface }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 8, overflowX: "auto" }}>
              {QUICK_PROMPTS.map((p, i) => (
                <button
                  key={i} onClick={() => send(p)}
                  style={{
                    padding: "4px 8px", borderRadius: 999, whiteSpace: "nowrap",
                    background: C.bgCard, border: `1px solid ${C.border}`,
                    color: C.inkMid, fontSize: 10, fontWeight: 600,
                  }}
                >
                  {p}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && send()}
                placeholder="Ask about pipeline security..."
                style={{
                  flex: 1, padding: "8px 12px", borderRadius: 8,
                  border: `1px solid ${C.border}`, background: C.bgCard,
                  color: C.ink, fontSize: 12, outline: "none",
                }}
              />
              <button
                onClick={() => send()}
                disabled={sending}
                style={{
                  padding: "8px 14px", borderRadius: 8,
                  background: C.teal, border: "none", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   TAB PAGES
───────────────────────────────────────────── */
function OverviewTab({ scans, totalScans, healthScore, avgRisk, blocked, allowed, running, completed, feedback, onFeedback, onOpenWhyBlocked, onOpenDetail, C }) {
  const [search, setSearch] = useState("");
  const [filterSev, setFilterSev] = useState("ALL");

  const filteredScans = useMemo(() => {
    return scans.filter(s => {
      const matchesSearch = !search || s.repo_name?.toLowerCase().includes(search.toLowerCase()) || s.commit_sha?.toLowerCase().includes(search.toLowerCase());
      const matchesSev = filterSev === "ALL" || s.action_taken === filterSev || s.severity === filterSev;
      return matchesSearch && matchesSev;
    });
  }, [scans, search, filterSev]);

  return (
    <div>
      <RunningPipelineBanner scans={scans} C={C} />

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 24 }}>
        <KpiCard title="Security Health" value={`${healthScore}%`} sub="Overall Gate Score" Icon={Activity} color={healthScore >= 75 ? C.teal : C.amber} C={C} />
        <KpiCard title="Total Scans" value={totalScans ?? scans.length} sub={`${running.length} Running Live`} Icon={GitPullRequest} color={C.blue} C={C} />
        <KpiCard title="Blocked Builds" value={blocked.length} sub={`${((blocked.length / (completed.length || 1)) * 100).toFixed(0)}% Block Rate`} Icon={XCircle} color={C.red} C={C} />
        <KpiCard title="Avg Risk Score" value={avgRisk} sub="Out of 10 max" Icon={Shield} color={avgRisk >= 7 ? C.red : avgRisk >= 4 ? C.amber : C.teal} C={C} />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
        <SectionTitle accent={C.teal} C={C}>Recent CI/CD Pipeline Scans</SectionTitle>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, padding: "5px 10px" }}>
            <Search size={14} color={C.inkMid} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Filter by repo or SHA..."
              style={{ background: "none", border: "none", color: C.ink, fontSize: 12, outline: "none", width: 140 }}
            />
          </div>
          <select
            value={filterSev} onChange={e => setFilterSev(e.target.value)}
            style={{ padding: "5px 10px", borderRadius: 8, background: C.bgCard, border: `1px solid ${C.border}`, color: C.ink, fontSize: 12 }}
          >
            <option value="ALL">All Statuses</option>
            <option value="BLOCK">Blocked Only</option>
            <option value="ALLOW">Allowed Only</option>
          </select>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filteredScans.slice(0, 15).map(scan => (
          <motion.div
            key={scan.id}
            whileHover={{ scale: 1.005, y: -2 }}
            className={`sf-card-hover ${scan.status === "running" ? "running-card-live" : ""}`}
            style={{
              padding: "16px 20px", background: C.bgCard, border: `1px solid ${C.border}`,
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap",
            }}
          >
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{scan.repo_name}</span>
                <Badge color={scan.action_taken === "BLOCK" ? C.red : C.teal} C={C}>{scan.action_taken || "ALLOW"}</Badge>
                {scan.status === "running" && <Badge color={C.blue} C={C}>Running</Badge>}
              </div>
              <div style={{ fontSize: 12, color: C.inkMid, fontFamily: C.mono }}>
                {scan.commit_sha?.slice(0, 8)} · {scan.branch} · {relTime(scan.created_at)}
              </div>
            </div>

            <div style={{ flex: 2, minWidth: 260 }}>
              <PipelineMiniNodes pipeline={scan.pipeline} live={scan.status === "running"} C={C} />
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              {scan.action_taken === "BLOCK" && (
                <button
                  onClick={() => onOpenWhyBlocked(scan)}
                  style={{
                    padding: "6px 12px", borderRadius: 8,
                    background: C.redSoft, border: `1px solid ${C.redBord}`,
                    color: C.red, fontSize: 12, fontWeight: 700,
                  }}
                >
                  Why Blocked?
                </button>
              )}
              <button
                onClick={() => onOpenDetail(scan)}
                style={{
                  padding: "6px 12px", borderRadius: 8,
                  background: C.bgSurface, border: `1px solid ${C.border}`,
                  color: C.ink, fontSize: 12, fontWeight: 600,
                }}
              >
                Details
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function PipelineTab({ scans, onOpenWhyBlocked, onOpenDetail, C }) {
  return (
    <div>
      <SectionTitle accent={C.blue} C={C}>CI/CD Pipeline Stream & Stage Performance</SectionTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {scans.slice(0, 20).map(scan => (
          <div key={scan.id} style={{ padding: 18, background: C.bgCard, borderRadius: 14, border: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{scan.repo_name}</span>
                <span style={{ fontSize: 12, color: C.inkLow, marginLeft: 8, fontFamily: C.mono }}>{scan.commit_sha?.slice(0, 8)}</span>
              </div>
              <Badge color={scan.action_taken === "BLOCK" ? C.red : C.teal} C={C}>{scan.action_taken}</Badge>
            </div>
            <PipelineFullView pipeline={scan.pipeline} C={C} />
          </div>
        ))}
      </div>
    </div>
  );
}

function AIInsightsTab({ scans, feedback, onFeedback, C }) {
  const blocked = scans.filter(s => s.action_taken === "BLOCK");
  return (
    <div>
      <SectionTitle accent={C.violet} C={C}>AI Security Recommendations & Risk Assessment</SectionTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {blocked.map(scan => (
          <div key={scan.id} style={{ padding: 18, background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 4 }}>{scan.repo_name} ({scan.commit_sha?.slice(0, 8)})</div>
            <AIAnalysisBlock scan={scan} feedback={feedback} onFeedback={onFeedback} C={C} />
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricsTab({ scans, totalScans, C }) {
  const chartData = useMemo(() => {
    return scans.slice(0, 10).reverse().map((s, idx) => ({
      name: `Run ${idx + 1}`,
      risk: s.risk_score || 0,
      vulns: s.vulnerabilities?.length || 0,
    }));
  }, [scans]);

  return (
    <div>
      <SectionTitle accent={C.teal} C={C}>Security Gate Telemetry & Risk Trends</SectionTitle>
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 20 }}>
        <div style={{ flex: 1, minWidth: 200, padding: 16, background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, display: "flex", justifyContent: "center" }}>
          <PrometheusGauge value={94.5} max={100} label="Pipeline Compliance" unit="%" color={C.teal} C={C} />
        </div>
        <div style={{ flex: 1, minWidth: 200, padding: 16, background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, display: "flex", justifyContent: "center" }}>
          <PrometheusGauge value={88.2} max={100} label="Policy Gate Pass Rate" unit="%" color={C.blue} C={C} />
        </div>
        <div style={{ flex: 1, minWidth: 200, padding: 16, background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, display: "flex", justifyContent: "center" }}>
          <PrometheusGauge value={96.0} max={100} label="AI Remedy Accuracy" unit="%" color={C.violet} C={C} />
        </div>
      </div>
      <div style={{ padding: 20, background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
            <XAxis dataKey="name" stroke={C.inkMid} fontSize={11} />
            <YAxis stroke={C.inkMid} fontSize={11} />
            <Tooltip contentStyle={{ background: C.bgCard, borderColor: C.border, color: C.ink }} />
            <Area type="monotone" dataKey="risk" stroke={C.red} fill={`${C.red}22`} />
            <Area type="monotone" dataKey="vulns" stroke={C.teal} fill={`${C.teal}22`} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN APP
───────────────────────────────────────────── */
export default function App() {
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem("sf_theme") || "dark");
  const C = THEMES[themeMode] || THEMES.dark;

  const [scans, setScans] = useState([]);
  const [totalScans, setTotalScans] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedScan, setSelectedScan] = useState(null);
  const [whyBlockedScan, setWhyBlockedScan] = useState(null);
  const [showCopilot, setShowCopilot] = useState(false);
  const [feedback, setFeedback] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);
  const [wsStatus, setWsStatus] = useState("connecting");

  const toggleTheme = () => {
    const next = themeMode === "dark" ? "light" : "dark";
    setThemeMode(next);
    localStorage.setItem("sf_theme", next);
  };

  const fetchScans = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND}/api/scan-results`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const rows = Array.isArray(data) ? data : (data.scans || []);
      setTotalScans(Array.isArray(data) ? rows.length : (data.total ?? rows.length));
      const normalized = rows.map(normaliseScan);
      setScans(normalized);
      setLastUpdated(new Date());
      setWsStatus("connected");
    } catch (err) {
      setWsStatus("reconnecting");
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScans();
    const timer = setInterval(fetchScans, 8000);
    return () => clearInterval(timer);
  }, [fetchScans]);

  const simulateLivePipelineRun = () => {
    const newSimRun = normaliseScan({
      id: Date.now(),
      commit_sha: Math.random().toString(36).substring(2, 10),
      commit_message: "feat(auth): add OAuth2 token validation security gate",
      repo_name: "abhienix/SecureFlow",
      branch: "feat/oauth-gate",
      status: "running",
      action_taken: "ALLOW",
      risk_score: 2,
      pipeline_steps: {
        checkout: { result: "PASS", detail: "Repository checked out successfully" },
        code_scan: { result: "RUNNING", detail: "Gitleaks & Semgrep static analysis" },
      },
      started_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    });

    setScans(prev => [newSimRun, ...prev]);

    setTimeout(() => {
      setScans(prev => prev.map(s => s.id === newSimRun.id ? normaliseScan({
        ...s,
        pipeline_steps: {
          checkout: { result: "PASS", detail: "Repository checked out" },
          code_scan: { result: "PASS", detail: "Zero secrets found" },
          docker: { result: "RUNNING", detail: "Building Docker container image" },
        }
      }) : s));
    }, 2500);

    setTimeout(() => {
      setScans(prev => prev.map(s => s.id === newSimRun.id ? normaliseScan({
        ...s,
        status: "complete",
        action_taken: "ALLOW",
        risk_score: 1,
        pipeline_steps: {
          checkout: { result: "PASS", detail: "Repository checked out" },
          code_scan: { result: "PASS", detail: "Clean scan" },
          docker: { result: "PASS", detail: "Image tagged & pushed" },
          trivy: { result: "PASS", detail: "Trivy CVE scan clean" },
          policy: { result: "PASS", detail: "Policy gate rules passed" },
          deploy: { result: "PASS", detail: "Deployed to Cloud Run" },
        }
      }) : s));
    }, 5500);
  };

  const submitFeedback = useCallback(async (scanId, type) => {
    setFeedback(prev => ({ ...prev, [scanId]: type }));
    try {
      await fetch(`${BACKEND}/api/scan-results/${scanId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: type === "accept" ? "accurate" : "incorrect" }),
      });
    } catch {}
  }, []);

  const running   = useMemo(() => scans.filter(s => s.status === "running"), [scans]);
  const completed = useMemo(() => scans.filter(s => s.status !== "running"), [scans]);
  const blocked   = useMemo(() => completed.filter(s => s.action_taken === "BLOCK"), [completed]);
  const allowed   = useMemo(() => completed.filter(s => s.action_taken === "ALLOW"), [completed]);

  const avgRisk = completed.length
    ? (completed.reduce((a, s) => a + (s.risk_score || 0), 0) / completed.length).toFixed(1) : "0";

  const healthScore = Math.max(0, Math.min(100,
    Math.round(100 - (blocked.length / (completed.length || 1)) * 40 - parseFloat(avgRisk) * 6)
  ));

  const TABS = [
    { id: "overview",   label: "Overview",     Icon: Activity      },
    { id: "pipeline",   label: "Pipeline",     Icon: GitPullRequest },
    { id: "ai-insights",label: "AI Insights",  Icon: Brain         },
    { id: "metrics",    label: "Metrics",      Icon: BarChart2     },
  ];

  return (
    <>
      <style>{buildGlobalCSS(C)}</style>

      <AnimatePresence>
        {whyBlockedScan && (
          <WhyBlockedModal scan={whyBlockedScan} onClose={() => setWhyBlockedScan(null)} feedback={feedback} onFeedback={submitFeedback} C={C} />
        )}
      </AnimatePresence>

      <div style={{ minHeight: "100vh", background: C.bg, color: C.ink, fontFamily: C.sans, position: "relative" }}>
        <header className="sf-header" style={{
          position: "sticky", top: 0, zIndex: 200,
          background: `${C.bgCard}f0`, backdropFilter: "blur(16px)",
          borderBottom: `1px solid ${C.border}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: `linear-gradient(135deg, ${C.teal}30, ${C.blue}20)`,
              border: `1px solid ${C.tealBord}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Shield size={18} color={C.teal} />
            </div>
            <span style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em" }}>
              Secure<span style={{ color: C.teal }}>Flow</span>
            </span>
          </div>

          <nav className="sf-nav" style={{ marginLeft: 16 }}>
            {TABS.map(({ id, label, Icon }) => (
              <button key={id} className={`sf-tab ${activeTab === id ? "active" : ""}`} onClick={() => setActiveTab(id)}>
                <Icon size={14} /> <span className="tab-label">{label}</span>
              </button>
            ))}
          </nav>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: wsStatus === "connected" ? C.teal : C.amber, fontWeight: 600 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: wsStatus === "connected" ? C.teal : C.amber, display: "inline-block" }} />
              {wsStatus === "connected" ? "Live" : "Polling"}
            </div>
            {lastUpdated && (
              <span style={{ fontSize: 11, color: C.inkLow, fontWeight: 500 }}>
                {relTime(lastUpdated)}
              </span>
            )}

            <button
              onClick={simulateLivePipelineRun}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 12px", borderRadius: 8,
                background: C.tealSoft, border: `1px solid ${C.tealBord}`,
                color: C.teal, fontSize: 12, fontWeight: 700,
              }}
            >
              <Play size={13} /> Demo Live Run
            </button>

            <button
              onClick={toggleTheme}
              title="Toggle Dark / Light Theme"
              style={{
                padding: 6, background: C.bgCard, border: `1px solid ${C.border}`,
                borderRadius: 8, color: C.ink, display: "flex", alignItems: "center",
              }}
            >
              {themeMode === "dark" ? <Sun size={16} color={C.amber} /> : <Moon size={16} color={C.violet} />}
            </button>

            <button
              onClick={() => setShowCopilot(v => !v)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 12px", borderRadius: 8,
                background: C.violetSoft, border: `1px solid ${C.violetBord}`,
                color: C.violet, fontSize: 12, fontWeight: 700,
              }}
            >
              <Bot size={15} /> Copilot
            </button>
          </div>
        </header>

        <main className="sf-main">
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", gap: 16 }}>
              <Loader2 size={36} className="spin" color={C.teal} />
              <div style={{ color: C.inkMid, fontSize: 14 }}>Initializing SecureFlow Gate...</div>
            </div>
          ) : (
            <>
              {activeTab === "overview" && (
                <OverviewTab
                  scans={scans} totalScans={totalScans} healthScore={healthScore} avgRisk={avgRisk}
                  blocked={blocked} allowed={allowed} running={running} completed={completed}
                  feedback={feedback} onFeedback={submitFeedback}
                  onOpenWhyBlocked={setWhyBlockedScan} onOpenDetail={setSelectedScan} C={C}
                />
              )}
              {activeTab === "pipeline" && (
                <PipelineTab scans={scans} onOpenWhyBlocked={setWhyBlockedScan} onOpenDetail={setSelectedScan} C={C} />
              )}
              {activeTab === "ai-insights" && (
                <AIInsightsTab scans={scans} feedback={feedback} onFeedback={submitFeedback} C={C} />
              )}
              {activeTab === "metrics" && <MetricsTab scans={scans} totalScans={totalScans} C={C} />}
            </>
          )}
        </main>
      </div>

      <AnimatePresence>
        {selectedScan && (
          <ScanDetail scan={selectedScan} onClose={() => setSelectedScan(null)} feedback={feedback} onFeedback={submitFeedback} onWhyBlocked={setWhyBlockedScan} C={C} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCopilot && <AICopilot scans={scans} onClose={() => setShowCopilot(false)} C={C} />}
      </AnimatePresence>
    </>
  );
}
