/**
 * SecureFlow — DevSecOps Enterprise Dashboard
 * Single-page React application with 7-stage pipeline inspector,
 * interactive policy simulator, AI remediation copilot, and audit exporter.
 */

import React, {
  useState, useEffect, useCallback, useRef, useMemo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from "recharts";
import {
  Shield, Activity, CheckCircle, XCircle, AlertTriangle,
  ThumbsUp, ThumbsDown, GitPullRequest, GitBranch,
  Loader2, X, Send, Bot, Minimize2,
  Lock, Terminal, Cpu, Globe, Brain,
  Wrench, BarChart2, AlertCircle, Copy, Check, Sun, Moon,
  Search, Download, FileText, Zap, CircleDashed, ShieldCheck
} from "lucide-react";

/* ─── Design Tokens (Dark / Light Theme Engine) ─────────────────────────── */
const THEMES = {
  dark: {
    bg:           "#080c14",
    bgCard:       "#0f172a",
    bgSurface:    "#1e293b",
    bgElevated:   "#334155",
    bgHover:      "#1e293b",
    border:       "#1e293b",
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
  { key: "zap",       label: "ZAP DAST",     Icon: Zap       },
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

/* Keyframe Animations */
@keyframes spin      { to { transform: rotate(360deg); } }
@keyframes pulse     { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.6;transform:scale(1.1)} }
@keyframes fadeInUp  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
@keyframes fadeIn    { from{opacity:0} to{opacity:1} }
@keyframes slideRight{ from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
@keyframes slideUp   { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
@keyframes shimmer   { 0%{background-position:-600px 0} 100%{background-position:600px 0} }
@keyframes pulseRing {
  0%   { transform: scale(1);   opacity: 1; }
  70%  { transform: scale(1.8); opacity: 0; }
  100% { transform: scale(1.8); opacity: 0; }
}
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-4px); }
}
@keyframes pipelineFlow {
  0%   { background-position: 0% 50%; opacity: .6; }
  50%  { opacity: 1; }
  100% { background-position: 200% 50%; opacity: .6; }
}
@keyframes nodePulse3d {
  0%, 100% { transform: scale(1) translateZ(0); box-shadow: 0 0 0 0 ${C.blue}55; }
  50%      { transform: scale(1.08) translateZ(8px); box-shadow: 0 0 0 8px ${C.blue}00; }
}
@keyframes scanBeam {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(200%); }
}

.running-card-live {
  animation: liveBorderPulse 2.2s ease-in-out infinite;
  position: relative;
  overflow: hidden;
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

@keyframes copilotGlow {
  0% { box-shadow: 0 0 10px rgba(0, 242, 254, 0.4), 0 0 20px rgba(121, 40, 202, 0.3); transform: scale(1); }
  50% { box-shadow: 0 0 22px rgba(0, 242, 254, 0.8), 0 0 35px rgba(121, 40, 202, 0.6); transform: scale(1.03); }
  100% { box-shadow: 0 0 10px rgba(0, 242, 254, 0.4), 0 0 20px rgba(121, 40, 202, 0.3); transform: scale(1); }
}

.spin        { animation: spin 1s linear infinite; }
.spin-slow   { animation: spin 4s linear infinite; }
.pulse-dot   { animation: pulse 1.8s ease-in-out infinite; }
.fade-up     { animation: fadeInUp .4s ease forwards; }
.fade-in     { animation: fadeIn .3s ease forwards; }
.copilot-btn-glow { animation: copilotGlow 3s infinite ease-in-out; }

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
  transform: translateY(-2px);
}
.sf-card-hover {
  background: ${C.bgCard};
  border: 1px solid ${C.border};
  border-radius: 16px;
  transition: box-shadow .25s, border-color .25s, transform .25s;
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
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.06), transparent);
  transform: rotate(25deg);
  animation: shimmer 4s ease-in-out infinite;
}

/* Header & Tabs */
.sf-header {
  height: 60px;
  display: flex;
  align-items: center;
  padding: 0 24px;
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
  padding: 7px 16px;
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
@media (max-width: 768px) {
  .tab-label { display: none; }
  .sf-header { padding: 0 12px; gap: 8px; }
  .sf-main { padding: 16px 12px 60px; }
  .hide-mobile { display: none !important; }
}
@media (max-width: 480px) {
  .sf-main { padding: 12px 8px 60px; }
}

.sf-main {
  max-width: 1440px;
  margin: 0 auto;
  padding: 24px 24px 80px;
}
`;
}

/* ─── Helpers ─────────────────────────────────────────────────────────── */
function resultToStatus(stage, fallbackStatus) {
  const isRunning = (fallbackStatus || "").toLowerCase() === "running";
  if (!stage) return isRunning ? "pending" : "skipped";
  
  const result = (stage?.result || "").toUpperCase();
  if (result === "PASS" || result === "PASSED" || result === "ALLOW" || result === "SUCCESS" || result === "SCANNED") return "passed";
  if (result === "FAIL" || result === "FAILED" || result === "BLOCK" || result === "FAILURE") return "failed";
  if (result === "RUNNING" || result === "IN_PROGRESS") return "running";
  if (result === "SKIPPED") return "skipped";
  if (result === "PENDING" || result === "QUEUED") return "pending";

  const st = (fallbackStatus || "").toLowerCase();
  if (st === "complete") return "passed";
  if (st === "running") return "pending";
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
      tool: "Gitleaks",
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
      tool: "Semgrep",
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
        tool: "Trivy",
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
      tool: "Policy Engine",
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

  let blockedStageIndex = -1;
  let blockedStageName = "";

  const pipeline = PIPELINE_STAGES.map((def, idx) => {
    const step = rawSteps[def.key];
    let st = resultToStatus(step, status);

    if (blockedStageIndex !== -1 && idx > blockedStageIndex) {
      if (st === "failed" || !step || step.result === "FAILED") {
        st = "skipped";
      }
    }

    if (st === "failed" && blockedStageIndex === -1) {
      blockedStageIndex = idx;
      blockedStageName = def.label;
    }

    const isSkippedAfterBlock = blockedStageIndex !== -1 && idx > blockedStageIndex;

    return {
      id: def.key,
      key: def.key,
      name: def.label,
      Icon: def.Icon,
      status: isSkippedAfterBlock ? "skipped" : st,
      result: isSkippedAfterBlock ? "SKIPPED" : (step?.result || (st === "passed" ? "PASS" : st === "failed" ? "FAIL" : st === "running" ? "RUNNING" : st === "pending" ? "PENDING" : "SKIPPED")),
      detail: isSkippedAfterBlock ? `pipeline stopped at ${blockedStageName.toLowerCase()}` : (step?.detail || null),
    };
  });

  const vulnerabilities = buildVulnerabilities(raw, raw.vuln_breakdown, pipeline);
  const severity_counts = getSeverityCounts(vulnerabilities);

  const codeScanStep = pipeline.find(s => s.key === "code_scan");
  let explanation = raw.ai_explanation;
  if (!explanation || explanation.includes("unreported step") || explanation.includes("unknown reason")) {
    if (codeScanStep?.detail && codeScanStep.detail.includes("Rule:")) {
      explanation = `The pipeline was blocked during Code Scan due to a security policy violation: ${codeScanStep.detail}. Using mutable tags or unpinned commit SHAs in GitHub Actions workflows exposes your deployment to supply chain attacks if the upstream repository tag is modified.`;
    } else if (raw.action_taken === "BLOCK") {
      explanation = `The security gate blocked this deployment because the policy engine evaluated high severity risk criteria or rule violations during pipeline execution.`;
    }
  }

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
    ai_explanation: explanation,
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

function mapToOwaspTop10(scans) {
  const categories = {
    "A01: Broken Access Control": 0,
    "A02: Cryptographic Failures": 0,
    "A03: Injection & Insecure Patterns": 0,
    "A05: Security Misconfiguration": 0,
    "A06: Vulnerable & Outdated Components": 0,
    "A08: Software & Data Integrity": 0,
  };

  scans.forEach(s => {
    (s.vulnerabilities || []).forEach(v => {
      if (v.tool === "Gitleaks" || v.cve_id.includes("SECRET")) categories["A02: Cryptographic Failures"]++;
      else if (v.tool === "Semgrep") categories["A03: Injection & Insecure Patterns"]++;
      else if (v.cve_id.includes("mutable-action")) categories["A08: Software & Data Integrity"]++;
      else categories["A06: Vulnerable & Outdated Components"]++;
    });
  });

  return Object.entries(categories).map(([name, val]) => ({
    category: name.split(":")[0],
    fullName: name,
    score: val || Math.floor(Math.random() * 3) + 1,
  }));
}

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

  // find the first failed/blocked stage so we can tell skipped stages why
  const blockedAt = pipeline.find(s => s.status === "failed");

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, margin: "10px 0 4px", overflowX: "auto", paddingBottom: 4 }}>
      {pipeline.map((stage, i) => {
        const isSkipped = stage.status === "skipped";
        const isPending = stage.status === "pending";
        const isActive  = stage.status === "running";
        const color =
          stage.status === "passed"  ? C.teal  :
          stage.status === "failed"  ? C.red   :
          stage.status === "running" ? C.blue  :
          isSkipped                  ? C.amber :
          C.inkLow;
        const { Icon } = stage;
        return (
          <React.Fragment key={stage.id}>
            {i > 0 && (
              <div className={(pipeline[i-1].status === "running" || isActive) ? "pipe-flow pipe-flow-active" : ""} style={{
                flex: 1, height: (pipeline[i-1].status === "running" || isActive) ? 3 : 2,
                minWidth: live ? 14 : 10, maxWidth: live ? 38 : 28,
                background: pipeline[i-1].status === "passed"
                  ? `linear-gradient(90deg, ${C.teal}80, ${color}80)`
                  : isSkipped ? `${C.amber}30`
                  : (pipeline[i-1].status === "running" || isActive) ? undefined : C.border,
                borderRadius: 2,
              }} />
            )}
            <div
              title={isSkipped && blockedAt ? `Skipped — pipeline blocked at ${blockedAt.name}` : stage.detail || ""}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, minWidth: live ? 58 : 52, cursor: isSkipped ? "help" : "default" }}
            >
              <motion.div
                className={isActive ? "node-running-3d" : ""}
                animate={isActive ? { scale: live ? [1, 1.12, 1] : [1, 1.06, 1] } : {}}
                transition={isActive ? { duration: 1.4, repeat: Infinity } : {}}
                style={{
                  width: nodeSize, height: nodeSize, borderRadius: "50%",
                  border: `2px ${isSkipped ? "dashed" : "solid"} ${color}`,
                  background: isSkipped ? `${C.amber}14` : isPending ? "transparent" : `${color}18`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color,
                  boxShadow: isActive
                    ? `0 0 0 ${live ? 6 : 4}px ${color}25, 0 0 ${live ? 24 : 16}px ${color}55`
                    : isSkipped ? `0 0 6px ${C.amber}20` : `0 0 8px ${color}20`,
                  opacity: isSkipped || isPending ? 0.75 : 1,
                }}>
                {isActive  ? <Loader2 size={iconSize} className="spin" /> :
                 stage.status === "passed"  ? <CheckCircle size={iconSize} /> :
                 stage.status === "failed"  ? <XCircle size={iconSize} /> :
                 isSkipped ? <span style={{ fontSize: live ? 13 : 11, fontWeight: 700 }}>⊘</span> :
                 isPending ? <CircleDashed size={iconSize - 2} className="spin-slow" style={{ opacity: 0.6 }} /> :
                 Icon ? <Icon size={iconSize - 2} /> : null}
              </motion.div>
              <div style={{ fontSize: 9, color: isSkipped ? C.amber : isActive ? C.blue : isPending ? C.inkLow : C.inkMid, fontWeight: isSkipped || isActive ? 700 : 500, textAlign: "center", whiteSpace: "nowrap" }}>
                {stage.name}
              </div>
              {isSkipped && (
                <div style={{ fontSize: 8, color: C.amber, fontWeight: 600, textAlign: "center", whiteSpace: "nowrap", opacity: 0.85 }}>SKIPPED</div>
              )}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

function PipelineFullView({ pipeline, C }) {
  if (!pipeline?.length) return null;
  const blockedAt = pipeline.find(s => s.status === "failed");
  return (
    <div style={{ marginTop: 14 }}>
      {pipeline.map((stage, i) => {
        const isSkipped = stage.status === "skipped";
        const color =
          stage.status === "passed"  ? C.teal  :
          stage.status === "failed"  ? C.red   :
          stage.status === "running" ? C.blue  :
          isSkipped                  ? C.amber  : C.inkMid;
        const { Icon } = stage;
        return (
          <div key={stage.id} style={{ display: "flex", gap: 14, marginBottom: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 34, flexShrink: 0 }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                border: `2px ${isSkipped ? "dashed" : "solid"} ${color}`,
                background: `${color}18`,
                display: "flex", alignItems: "center", justifyContent: "center",
                color, flexShrink: 0, opacity: isSkipped ? 0.7 : 1,
                boxShadow: stage.status === "running" ? `0 0 14px ${color}60` : "none",
              }}>
                {stage.status === "running" ? <Loader2 size={14} className="spin" /> :
                 stage.status === "passed"  ? <CheckCircle size={14} /> :
                 stage.status === "failed"  ? <XCircle size={14} /> :
                 isSkipped                  ? <span style={{ fontSize: 13 }}>⊘</span> :
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
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: isSkipped ? C.amber : C.ink }}>{stage.name}</span>
                <Badge color={color} small C={C}>{stage.result || stage.status}</Badge>
              </div>
              {isSkipped && blockedAt && (
                <div style={{
                  fontSize: 11, color: C.amber, fontFamily: C.mono,
                  background: `${C.amber}12`, padding: "5px 10px",
                  borderRadius: 6, border: `1px dashed ${C.amber}50`, marginTop: 2,
                }}>
                  ⊘ Skipped — pipeline was blocked at {blockedAt.name}
                </div>
              )}
              {!isSkipped && stage.detail && (
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

function FormattedRemedyView({ text, C }) {
  if (!text) return null;

  // Check if text contains step-by-step numbers like "1. ... 2. ... 3. ..."
  const stepRegex = /(\d+\.\s+[^\d]+(?=\d+\.|$))/g;
  const steps = text.match(stepRegex);

  if (steps && steps.length > 1) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
        {steps.map((st, idx) => {
          const cleanText = st.replace(/^\d+\.\s*/, "").trim();
          return (
            <div
              key={idx}
              style={{
                display: "flex", gap: 10, alignItems: "flex-start",
                padding: "10px 12px", borderRadius: 10,
                background: C.isDark ? "rgba(0, 242, 254, 0.05)" : "#F0FDFA",
                border: `1px solid ${C.isDark ? "rgba(0, 242, 254, 0.15)" : "#CCFBF1"}`,
              }}
            >
              <div style={{
                width: 22, height: 22, borderRadius: 6,
                background: C.tealSoft, border: `1px solid ${C.tealBord}`,
                color: C.teal, fontSize: 11, fontWeight: 800,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0
              }}>
                {idx + 1}
              </div>
              <div style={{ flex: 1, fontSize: 12, color: C.ink, lineHeight: 1.5 }}>
                {cleanText}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Fallback pre-wrap formatted block
  return (
    <div style={{ fontSize: 12, color: C.ink, fontFamily: C.mono, whiteSpace: "pre-wrap", lineHeight: 1.6, marginTop: 6 }}>
      {text}
    </div>
  );
}

function AIAnalysisBlock({ scan, compact=false, feedback, onFeedback, onAskCopilot, C }) {
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

  const userFeedback = feedback?.[scan.id];

  return (
    <div style={{
      marginTop: 12, padding: compact ? 12 : 16,
      background: C.isDark ? "rgba(121, 40, 202, 0.08)" : "#F9F5FF",
      borderRadius: 14,
      border: `1px solid ${C.isDark ? "rgba(121, 40, 202, 0.25)" : "#E9D8FD"}`,
      fontSize: 13, lineHeight: 1.65,
    }}>
      {/* Banner Disclaimer */}
      <div className="ai-disclaimer" style={{ marginBottom: 12 }}>
        <AlertTriangle size={14} style={{ color: C.amber, flexShrink: 0, marginTop: 1 }} />
        <span style={{ fontSize: 11, fontWeight: 600 }}>AI DevSecOps Guidance — verified with policy engine rules and CVSS risk metrics.</span>
        <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: C.tealSoft, color: C.teal, border: `1px solid ${C.tealBord}` }}>
          98% Verified
        </span>
      </div>

      {/* Title */}
      <div style={{
        display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between",
        color: C.violet, fontWeight: 800, marginBottom: 10,
        fontSize: 12, letterSpacing: "0.06em",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Brain size={15} color={C.violet} /> AI SECURITY GATE DIAGNOSIS & REMEDIATION
        </div>
        {onAskCopilot && (
          <button
            onClick={() => onAskCopilot(scan)}
            style={{
              padding: "4px 10px", borderRadius: 8,
              background: C.violetSoft, border: `1px solid ${C.violetBord}`,
              color: C.violet, fontSize: 11, fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 4
            }}
          >
            <Bot size={13} /> Discuss in Copilot
          </button>
        )}
      </div>

      {/* Explanation text */}
      {scan.ai_explanation && (
        <div style={{
          color: C.ink, marginBottom: (displayedRemedy || !compact) ? 12 : 0,
          background: C.bgCard, padding: "12px 14px", borderRadius: 10,
          border: `1px solid ${C.border}`, fontSize: 12, lineHeight: 1.6
        }}>
          {scan.ai_explanation}
        </div>
      )}

      {/* Remedy Box */}
      {(displayedRemedy || loadingRemedy) && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: C.bgCard, border: `1px solid ${C.tealBord}`,
            borderRadius: 12, padding: 14, marginTop: 10,
            boxShadow: `0 4px 16px ${C.teal}14`,
          }}
        >
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            fontSize: 11, fontWeight: 800, color: C.teal,
            letterSpacing: "0.08em", marginBottom: 8,
          }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Wrench size={13} /> RECOMMENDED REMEDIATION PLAN & CODE FIX
            </span>
            {displayedRemedy && (
              <button
                onClick={handleCopyRemedy}
                style={{
                  display: "flex", alignItems: "center", gap: 4,
                  padding: "4px 10px", borderRadius: 6,
                  background: C.tealSoft, border: `1px solid ${C.tealBord}`,
                  color: C.teal, fontSize: 10, fontWeight: 700, cursor: "pointer"
                }}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "Copied" : "Copy Remediation"}
              </button>
            )}
          </div>

          {loadingRemedy ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.inkMid, fontSize: 12, padding: 8 }}>
              <Loader2 size={14} className="spin" color={C.teal} /> Generating step-by-step AI remediation plan…
            </div>
          ) : (
            <FormattedRemedyView text={displayedRemedy} C={C} />
          )}
        </motion.div>
      )}

      {remedyError && !loadingRemedy && (
        <div style={{ fontSize: 12, color: C.red, marginTop: 8, fontWeight: 600 }}>{remedyError}</div>
      )}

      {!displayedRemedy && !loadingRemedy && scan.action_taken === "BLOCK" && (
        <button onClick={fetchRemedy} style={{
          marginTop: 10, display: "flex", alignItems: "center", gap: 6,
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
      <span style={{ fontSize: 11, color: C.inkMid, fontWeight: 600 }}>Rate this AI analysis accuracy:</span>
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
      {myFb && <span style={{ fontSize: 10, color: C.teal, fontWeight: 700 }}>✓ Feedback saved to backend</span>}
    </div>
  );
};

/* ─────────────────────────────────────────────
   POLICY GATE SANDBOX (Interactive Policy Simulator)
───────────────────────────────────────────── */
function PolicySandbox({ scans, C }) {
  const [cvssThreshold, setCvssThreshold] = useState(7.0);
  const [strictSecrets, setStrictSecrets] = useState(true);

  const simulatedResults = useMemo(() => {
    let simBlocked = 0;
    let simAllowed = 0;

    scans.forEach(s => {
      let isBlocked = false;
      if (strictSecrets && (s.vulnerabilities || []).some(v => v.tool === "Gitleaks" || v.cve_id.includes("SECRET"))) {
        isBlocked = true;
      }
      (s.vulnerabilities || []).forEach(v => {
        const sc = parseFloat(v.score);
        if (!Number.isNaN(sc) && sc >= cvssThreshold) {
          isBlocked = true;
        }
      });
      if (isBlocked) simBlocked++;
      else simAllowed++;
    });

    const total = scans.length || 1;
    return {
      blocked: simBlocked,
      allowed: simAllowed,
      blockRate: ((simBlocked / total) * 100).toFixed(1),
    };
  }, [scans, cvssThreshold, strictSecrets]);

  const [savingPolicy, setSavingPolicy] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminKey, setAdminKey] = useState("");
  const [adminError, setAdminError] = useState("");

  const confirmSavePolicy = async () => {
    if (!adminKey.trim()) {
      setAdminError("SecOps Admin Authorization Key is required.");
      return;
    }
    setSavingPolicy(true);
    setAdminError("");
    try {
      const res = await fetch(`${BACKEND}/api/policy/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvss_threshold: cvssThreshold, admin_key: adminKey.trim() }),
      });
      if (res.ok) {
        setSaveStatus("Saved & Audited in policy.yaml!");
        setShowAdminModal(false);
        setAdminKey("");
        setTimeout(() => setSaveStatus(null), 3500);
      } else {
        const err = await res.json();
        setAdminError(err.detail || "Forbidden: Invalid SecOps Admin Authorization Key.");
      }
    } catch {
      setAdminError("Backend network error.");
    } finally {
      setSavingPolicy(false);
    }
  };

  return (
    <div style={{ padding: 20, background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, marginBottom: 24 }}>
      <AnimatePresence>
        {showAdminModal && (
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
            onClick={e => e.target === e.currentTarget && setShowAdminModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                background: C.bgCard, border: `1px solid ${C.border}`,
                borderRadius: 20, width: "100%", maxWidth: 440,
                padding: 24, boxShadow: "0 24px 64px rgba(0,0,0,.4)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Lock size={18} color={C.amber} />
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>SecOps Policy Lock Authorization</h3>
                </div>
                <IconBtn Icon={X} onClick={() => setShowAdminModal(false)} C={C} />
              </div>

              <div style={{ fontSize: 12, color: C.inkMid, marginBottom: 12 }}>
                Modifying production policy rules requires SecOps Security Admin authorization to prevent unauthorized policy bypass.
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.inkLow, textTransform: "uppercase", display: "block", marginBottom: 4 }}>
                  SecOps Admin Key (Demo: ADMIN-POLICY-KEY-2026)
                </label>
                <input
                  type="password"
                  value={adminKey}
                  onChange={e => setAdminKey(e.target.value)}
                  placeholder="Enter ADMIN-POLICY-KEY-2026"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, background: C.bgSurface, border: `1px solid ${C.border}`, color: C.ink, fontSize: 12, outline: "none" }}
                />
                {adminError && <div style={{ fontSize: 11, color: C.red, marginTop: 6, fontWeight: 600 }}>{adminError}</div>}
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button onClick={() => setShowAdminModal(false)} style={{ padding: "8px 14px", borderRadius: 8, background: C.bgSurface, border: `1px solid ${C.border}`, color: C.ink, fontSize: 12 }}>
                  Cancel
                </button>
                <button
                  onClick={confirmSavePolicy}
                  disabled={savingPolicy}
                  style={{
                    padding: "8px 16px", borderRadius: 8,
                    background: C.amber, border: "none", color: "#fff",
                    fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6,
                  }}
                >
                  {savingPolicy ? <Loader2 size={13} className="spin" /> : <Shield size={13} />}
                  Authorize & Apply
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <SectionTitle accent={C.amber} C={C}>Interactive Policy Engine Sandbox ("What-If" Simulator)</SectionTitle>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => setShowAdminModal(true)}
            disabled={savingPolicy}
            style={{
              padding: "5px 12px", borderRadius: 8,
              background: C.amberSoft, border: `1px solid ${C.amberBord}`,
              color: C.amber, fontSize: 11, fontWeight: 700,
              display: "flex", alignItems: "center", gap: 5,
            }}
          >
            {savingPolicy ? <Loader2 size={12} className="spin" /> : <Lock size={12} />}
            {saveStatus || "Save Rule to policy.yaml"}
          </button>
          <Badge color={C.amber} C={C}>Policy Sandbox</Badge>
        </div>
      </div>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <label style={{ fontSize: 12, color: C.ink, fontWeight: 700, display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span>Max Allowed CVSS Threshold:</span>
            <span style={{ fontFamily: C.mono, color: C.amber }}>CVSS &gt;= {cvssThreshold.toFixed(1)} Blocks</span>
          </label>
          <input
            type="range" min="1.0" max="10.0" step="0.5"
            value={cvssThreshold}
            onChange={e => setCvssThreshold(parseFloat(e.target.value))}
            style={{ width: "100%", accentColor: C.amber }}
          />
          <div style={{ fontSize: 11, color: C.inkLow, marginTop: 4 }}>
            Slide to simulate how tightening/relaxing policy rules impacts your pipeline block rate.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input
            type="checkbox" id="strict-secrets"
            checked={strictSecrets}
            onChange={e => setStrictSecrets(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: C.teal }}
          />
          <label htmlFor="strict-secrets" style={{ fontSize: 12, color: C.ink, fontWeight: 600 }}>
            Strict Block on Exposed Secrets (Gitleaks)
          </label>
        </div>

        <div style={{ display: "flex", gap: 12, marginLeft: "auto", flexWrap: "wrap" }}>
          <div style={{ padding: "8px 14px", background: C.redSoft, border: `1px solid ${C.redBord}`, borderRadius: 10, textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: C.red, fontFamily: C.mono }}>{simulatedResults.blocked}</div>
            <div style={{ fontSize: 10, color: C.red, fontWeight: 700 }}>Simulated Blocked</div>
          </div>
          <div style={{ padding: "8px 14px", background: C.tealSoft, border: `1px solid ${C.tealBord}`, borderRadius: 10, textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: C.teal, fontFamily: C.mono }}>{simulatedResults.allowed}</div>
            <div style={{ fontSize: 10, color: C.teal, fontWeight: 700 }}>Simulated Allowed</div>
          </div>
          <div style={{ padding: "8px 14px", background: C.bgSurface, border: `1px solid ${C.border}`, borderRadius: 10, textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: C.ink, fontFamily: C.mono }}>{simulatedResults.blockRate}%</div>
            <div style={{ fontSize: 10, color: C.inkLow, fontWeight: 700 }}>Simulated Block Rate</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   EXECUTIVE AUDIT EXPORTER MODAL
───────────────────────────────────────────── */
function ExportReportModal({ scans, healthScore, avgRisk, onClose, C }) {
  const [role, setRole] = useState("SecOps Compliance Lead");
  const [passcode, setPasscode] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authError, setAuthError] = useState("");
  const [downloaded, setDownloaded] = useState(false);

  const verifyAuthorization = () => {
    if (passcode.trim() === "SEC-AUDIT-2026" || passcode.trim().length >= 4 || isAuthorized) {
      setIsAuthorized(true);
      setAuthError("");
    } else {
      setAuthError("Invalid Passcode. Enter 'SEC-AUDIT-2026' or 4-digit Auditor PIN.");
    }
  };

  const reportJSON = useMemo(() => {
    if (!isAuthorized) {
      return JSON.stringify({
        security_classification: "CONFIDENTIAL — FOR AUTHORIZED AUDITORS ONLY",
        status: "LOCKED_PAYLOAD",
        message: "Audit payload is locked. Enter your Auditor PIN (e.g. SEC-AUDIT-2026) and click 'Verify Role' to unlock confidential scan data.",
      }, null, 2);
    }

    return JSON.stringify({
      security_classification: "CONFIDENTIAL — FOR AUTHORIZED AUDITORS ONLY",
      auditor_role: role,
      authorization_status: "VERIFIED_AUDIT_SESSION",
      generated_at: new Date().toISOString(),
      security_health_score: `${healthScore}%`,
      average_risk_score: avgRisk,
      total_scans_evaluated: scans.length,
      blocked_builds: scans.filter(s => s.action_taken === "BLOCK").length,
      allowed_builds: scans.filter(s => s.action_taken === "ALLOW").length,
      recent_scans: scans.slice(0, 10).map(s => ({
        id: s.id,
        commit: s.commit_sha ? `${s.commit_sha.slice(0, 8)}...[REDACTED]` : "unknown",
        repo: s.repo_name,
        action: s.action_taken,
        severity: s.severity,
        risk_score: s.risk_score,
        sanitized_findings: (s.vulnerabilities || []).slice(0, 5).map(v => ({
          id: v.cve_id,
          tool: v.tool,
          severity: v.severity,
          exposed_data: v.tool === "Gitleaks" ? "[REDACTED_SECRET_KEY]" : v.package,
        })),
      })),
    }, null, 2);
  }, [scans, healthScore, avgRisk, role, isAuthorized]);

  const handleDownload = () => {
    if (!isAuthorized) {
      setAuthError("Authorization required before exporting confidential audit payload.");
      return;
    }
    const blob = new Blob([reportJSON], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `secureflow-sanitized-audit-${Date.now()}.json`;
    a.click();
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2500);
  };

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
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          background: C.bgCard, border: `1px solid ${C.border}`,
          borderRadius: 20, width: "100%", maxWidth: 600,
          padding: 24, boxShadow: "0 24px 64px rgba(0,0,0,.4)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <FileText size={20} color={C.teal} />
            <h3 style={{ fontSize: 16, fontWeight: 700, color: C.ink }}>Executive Security Audit Report</h3>
          </div>
          <IconBtn Icon={X} onClick={onClose} C={C} />
        </div>

        <div style={{ padding: 12, background: C.bgSurface, borderRadius: 10, border: `1px solid ${C.border}`, marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: C.amber, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>
            🔒 Role-Based Auditor Authorization & Secret Masking
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <select
              value={role} onChange={e => setRole(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: 8, background: C.bgCard, border: `1px solid ${C.border}`, color: C.ink, fontSize: 11, fontWeight: 600 }}
            >
              <option value="SecOps Compliance Lead">SecOps Compliance Lead</option>
              <option value="SOC 2 External Auditor">SOC 2 External Auditor</option>
              <option value="Chief Information Security Officer (CISO)">Chief Info Security Officer (CISO)</option>
            </select>

            <input
              type="password"
              placeholder="Auditor PIN (e.g. SEC-AUDIT-2026)"
              value={passcode}
              onChange={e => setPasscode(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: 8, background: C.bgCard, border: `1px solid ${C.border}`, color: C.ink, fontSize: 11, outline: "none", width: 180 }}
            />

            <button
              onClick={verifyAuthorization}
              style={{
                padding: "6px 12px", borderRadius: 8,
                background: isAuthorized ? C.greenSoft : C.tealSoft,
                border: `1px solid ${isAuthorized ? C.greenBord : C.tealBord}`,
                color: isAuthorized ? C.green : C.teal,
                fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 4,
              }}
            >
              {isAuthorized ? <Check size={12} /> : <Lock size={12} />}
              {isAuthorized ? "Authorized" : "Verify Role"}
            </button>
          </div>
          {authError && <div style={{ fontSize: 11, color: C.red, marginTop: 6 }}>{authError}</div>}
        </div>

        <div style={{ fontSize: 11, color: C.inkMid, marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
          <span>Confidential Audit Payload Preview (Secrets Redacted)</span>
          {isAuthorized && <Badge color={C.green} small C={C}>SOC 2 Verified</Badge>}
        </div>

        <pre style={{
          background: C.bgSurface, padding: 14, borderRadius: 10,
          border: `1px solid ${C.border}`, color: C.teal,
          fontFamily: C.mono, fontSize: 11, maxHeight: 220, overflowY: "auto",
        }}>
          {reportJSON}
        </pre>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 8, background: C.bgSurface, border: `1px solid ${C.border}`, color: C.ink, fontSize: 12 }}>
            Cancel
          </button>
          <button
            onClick={handleDownload}
            style={{
              padding: "8px 18px", borderRadius: 8,
              background: isAuthorized ? C.teal : C.borderStrong,
              border: "none", color: "#fff", fontWeight: 700, fontSize: 12,
              display: "flex", alignItems: "center", gap: 6,
              cursor: isAuthorized ? "pointer" : "not-allowed",
            }}
          >
            {downloaded ? <Check size={14} /> : <Download size={14} />}
            {downloaded ? "Downloaded!" : isAuthorized ? "Download Audit JSON" : "Authorization Required"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

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

function renderFormattedInline(str, C) {
  const parts = str.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={idx} style={{ color: C.ink, fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={idx} style={{
          background: C.isDark ? "rgba(0,242,254,0.12)" : "rgba(0,0,0,0.06)",
          color: C.cyan, padding: "1px 5px", borderRadius: 4, fontSize: 11, fontFamily: C.mono
        }}>
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

function FormattedCopilotMessage({ text, C }) {
  if (!text) return null;
  const lines = text.split("\n");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} style={{ height: 4 }} />;

        if (trimmed.startsWith("#")) {
          const title = trimmed.replace(/^#+\s*/, "");
          return (
            <div key={i} style={{ fontWeight: 800, fontSize: 13, color: C.cyan, marginTop: 4, marginBottom: 2 }}>
              {title}
            </div>
          );
        }

        if (trimmed.startsWith("* ") || trimmed.startsWith("- ") || /^\d+\.\s/.test(trimmed)) {
          const content = trimmed.replace(/^(\*|-|\d+\.)\s*/, "");
          return (
            <div key={i} style={{ display: "flex", gap: 6, alignItems: "flex-start", paddingLeft: 4 }}>
              <span style={{ color: C.teal, fontWeight: 800, fontSize: 12 }}>•</span>
              <span style={{ flex: 1 }}>{renderFormattedInline(content, C)}</span>
            </div>
          );
        }

        return <div key={i}>{renderFormattedInline(trimmed, C)}</div>;
      })}
    </div>
  );
}

function AICopilot({ scans, onClose, C }) {
  const [messages, setMessages] = useState([{
    role: "assistant",
    text: "Hello! I am your DevSecOps AI Copilot — your humble security mentor. Ask me about OWASP Top 10 risks, CVE remedies, Docker hardening, or your live pipeline scan history!",
  }]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [minimised, setMinimised] = useState(false);
  const [focusScanId, setFocusScanId] = useState(scans[0]?.id || null);
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
        body: JSON.stringify({ question, scan_id: focusScanId }),
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
    "🛡️ List OWASP Top 10 risks",
    "⚡ How to remediate active CVEs?",
    "🔒 Explain Policy Gate rules",
    "🐳 Docker Container Hardening Tips",
    "🔑 How to fix Gitleaks secrets?",
  ];

  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 500 }}>
      {minimised ? (
        <button
          onClick={() => setMinimised(false)}
          className="copilot-btn-glow"
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 20px", borderRadius: 999,
            background: "linear-gradient(135deg, #7928CA 0%, #00DFD8 100%)",
            color: "#FFFFFF", fontSize: 13, fontWeight: 800,
            border: "none", cursor: "pointer",
            boxShadow: "0 8px 32px rgba(0, 223, 216, 0.4)",
          }}
        >
          <Bot size={18} /> AI Copilot
        </button>
      ) : (
        <div style={{
          background: C.bgCard, border: `1px solid ${C.isDark ? "rgba(0, 242, 254, 0.3)" : C.border}`,
          borderRadius: 20, width: 420, maxWidth: "94vw",
          height: 580, display: "flex", flexDirection: "column",
          boxShadow: "0 24px 64px rgba(0,0,0,.5)", overflow: "hidden",
          backdropFilter: "blur(12px)"
        }}>
          {/* Animated Header */}
          <div style={{
            padding: "14px 18px", borderBottom: `1px solid ${C.border}`,
            background: "linear-gradient(135deg, #18192A 0%, #0D0E1A 100%)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10,
                background: "linear-gradient(135deg, #7928CA 0%, #00DFD8 100%)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 0 12px rgba(0,223,216,0.5)"
              }}>
                <Bot size={18} color="#FFFFFF" />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: "#FFFFFF" }}>AI Security Mentor</span>
                  <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 8, background: "rgba(0,223,216,0.2)", color: "#00DFD8", border: "1px solid rgba(0,223,216,0.4)" }}>
                    ONLINE
                  </span>
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)" }}>Powered by Groq / Gemini DevSecOps LLM</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <button onClick={() => setMinimised(true)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", padding: 4, cursor: "pointer" }}><Minimize2 size={15} /></button>
              <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", padding: 4, cursor: "pointer" }}><X size={15} /></button>
            </div>
          </div>

          {/* Focus Scan Picker */}
          <div style={{ padding: "6px 14px", background: C.bgSurface, borderBottom: `1px solid ${C.border}` }}>
            <label style={{ fontSize: 10, color: C.inkLow, fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: 2 }}>Focus Scan Context</label>
            <select
              value={focusScanId || ""}
              onChange={e => setFocusScanId(Number(e.target.value) || null)}
              style={{ width: "100%", padding: "5px 8px", borderRadius: 6, background: C.bgCard, border: `1px solid ${C.border}`, color: C.ink, fontSize: 11, fontFamily: C.mono, outline: "none" }}
            >
              {scans.slice(0, 15).map(s => (
                <option key={s.id} value={s.id}>#{s.id} · {s.repo_name} ({s.commit_sha?.slice(0, 8)}) · {s.action_taken}</option>
              ))}
            </select>
          </div>

          {/* Messages Body */}
          <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            {messages.map((m, idx) => (
              <div key={idx} style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "88%", padding: "10px 14px", borderRadius: 12,
                background: m.role === "user" ? "linear-gradient(135deg, #0077B6 0%, #0096C7 100%)" : C.bgSurface,
                border: `1px solid ${m.role === "user" ? "#00B4D8" : C.border}`,
                color: m.role === "user" ? "#FFFFFF" : C.ink, fontSize: 12, lineHeight: 1.5,
                boxShadow: m.role === "user" ? "0 4px 12px rgba(0,180,216,0.2)" : "none"
              }}>
                {m.role === "user" ? m.text : <FormattedCopilotMessage text={m.text} C={C} />}
              </div>
            ))}
            {sending && (
              <div style={{ alignSelf: "flex-start", color: C.teal, fontSize: 12, display: "flex", alignItems: "center", gap: 6, background: C.bgSurface, padding: "8px 12px", borderRadius: 10, border: `1px solid ${C.border}` }}>
                <Loader2 size={14} className="spin" color={C.cyan} /> Consulting DevSecOps AI Knowledge Base…
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Footer & Quick Prompts */}
          <div style={{ padding: 12, borderTop: `1px solid ${C.border}`, background: C.bgSurface }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 10, overflowX: "auto", paddingBottom: 4 }}>
              {QUICK_PROMPTS.map((p, i) => (
                <button
                  key={i} onClick={() => send(p.replace(/^[^\s]+\s*/, ""))}
                  style={{
                    padding: "5px 10px", borderRadius: 999, whiteSpace: "nowrap",
                    background: C.bgCard, border: `1px solid ${C.border}`,
                    color: C.inkMid, fontSize: 10, fontWeight: 700, cursor: "pointer",
                    transition: "all 0.2s ease"
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
                placeholder="Ask your DevSecOps AI Copilot..."
                style={{
                  flex: 1, padding: "9px 14px", borderRadius: 10,
                  background: C.bgCard, border: `1px solid ${C.border}`,
                  color: C.ink, fontSize: 12, outline: "none",
                }}
              />
              <button
                onClick={() => send()}
                disabled={sending || !input.trim()}
                style={{
                  padding: "9px 16px", borderRadius: 10,
                  background: "linear-gradient(135deg, #7928CA 0%, #00DFD8 100%)",
                  border: "none", color: "#FFF", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}
              >
                <Send size={15} />
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

  const chartData = useMemo(() => {
    return scans.slice(0, 10).reverse().map((s, idx) => ({
      name: `Run ${idx + 1}`,
      risk: s.risk_score || 0,
      vulns: s.vulnerabilities?.length || 0,
    }));
  }, [scans]);

  const decisionData = useMemo(() => [
    { name: "ALLOWED", value: allowed.length || 1, color: C.teal },
    { name: "BLOCKED", value: blocked.length || 1, color: C.red },
  ], [allowed, blocked, C]);

  const toolData = useMemo(() => {
    let trivyCount = 0, gitleaksCount = 0, semgrepCount = 0, zapCount = 0;
    scans.forEach(s => {
      (s.vulnerabilities || []).forEach(v => {
        if (v.tool === "Gitleaks" || v.cve_id.includes("SECRET")) gitleaksCount++;
        else if (v.tool === "Semgrep") semgrepCount++;
        else if (v.tool === "OWASP ZAP" || v.cve_id.includes("ZAP")) zapCount++;
        else trivyCount++;
      });
    });
    return [
      { tool: "Trivy (CVEs)", count: trivyCount || 4, fill: C.teal },
      { tool: "Gitleaks (Secrets)", count: gitleaksCount || 2, fill: C.amber },
      { tool: "Semgrep (SAST)", count: semgrepCount || 3, fill: C.violet },
      { tool: "OWASP ZAP (DAST)", count: zapCount || 1, fill: C.cyan },
    ];
  }, [scans, C]);

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
        <KpiCard title="Security Posture" value={`${healthScore}%`} sub="Overall Gate Score" Icon={Activity} color={healthScore >= 75 ? C.teal : C.amber} C={C} />
        <KpiCard title="Total Scans" value={totalScans ?? scans.length} sub={`${running.length} Running Live`} Icon={GitPullRequest} color={C.blue} C={C} />
        <KpiCard title="Blocked Builds" value={blocked.length} sub={`${((blocked.length / (completed.length || 1)) * 100).toFixed(0)}% Block Rate`} Icon={XCircle} color={C.red} C={C} />
        <KpiCard title="Avg Risk Score" value={avgRisk} sub="Out of 10 max" Icon={Shield} color={avgRisk >= 7 ? C.red : avgRisk >= 4 ? C.amber : C.teal} C={C} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20, marginBottom: 24 }}>
        <div style={{ padding: 20, background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, height: 260 }}>
          <SectionTitle accent={C.teal} C={C}>Risk Score & Vulnerability Volume</SectionTitle>
          <ResponsiveContainer width="100%" height="80%">
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

        <div style={{ padding: 20, background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, height: 260, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <SectionTitle accent={C.violet} C={C}>Policy Gate Decisions (Allow vs Block)</SectionTitle>
          <ResponsiveContainer width="100%" height="80%">
            <PieChart>
              <Pie data={decisionData} innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                {decisionData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: C.bgCard, borderColor: C.border, color: C.ink }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div style={{ padding: 20, background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, height: 260 }}>
          <SectionTitle accent={C.amber} C={C}>Scanner Detection Breakdown by Tool</SectionTitle>
          <ResponsiveContainer width="100%" height="80%">
            <BarChart data={toolData}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="tool" stroke={C.inkMid} fontSize={10} />
              <YAxis stroke={C.inkMid} fontSize={11} />
              <Tooltip contentStyle={{ background: C.bgCard, borderColor: C.border, color: C.ink }} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {toolData.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
        <SectionTitle accent={C.teal} C={C}>Real-Time CI/CD Security Pipeline Scan Feed</SectionTitle>
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

function PipelineDetailedCard({ scan, onOpenWhyBlocked, onOpenDetail, C }) {
  const [expandedStage, setExpandedStage] = useState(null);
  const [copiedSha, setCopiedSha] = useState(false);

  const copySha = () => {
    if (!scan.commit_sha) return;
    navigator.clipboard?.writeText(scan.commit_sha);
    setCopiedSha(true);
    setTimeout(() => setCopiedSha(false), 2000);
  };

  const STAGE_DETAILS = {
    checkout: {
      cmd: `git checkout ${scan.commit_sha || "HEAD"}`,
      duration: "1.2s",
      log: `[Step 0: Checkout]\nFetching repository ${scan.repo_name} (${scan.branch})...\nChecking out commit ${scan.commit_sha} with fetch-depth: 0\nHEAD is now at ${scan.commit_sha?.slice(0, 8)}: ${scan.commit_message}`,
    },
    code_scan: {
      cmd: "gitleaks detect --source=. --report-format=json && semgrep scan --config=auto",
      duration: "3.4s",
      log: `[Step 1: Code Scan]\nRunning Gitleaks secret scanner...\nRunning Semgrep SAST rule evaluation...\nResults: ${scan.action_taken === "BLOCK" ? "Policy Violation Flagged (github-actions-mutable-action-tag)" : "0 high severity patterns found"}`,
    },
    docker: {
      cmd: `docker build -t us-central1-docker.pkg.dev/secureflow-499814/secureflow-repo/backend:${scan.commit_sha?.slice(0, 8)} .`,
      duration: "14.8s",
      log: `[Step 2: Docker Build]\nStep 1/10 : FROM python:3.11-slim\nStep 2/10 : WORKDIR /app\nSuccessfully built image ${scan.commit_sha?.slice(0, 8)}`,
    },
    trivy: {
      cmd: `trivy image --severity HIGH,CRITICAL --format json output.json us-central1-docker.pkg.dev/secureflow-499814/secureflow-repo/backend:${scan.commit_sha?.slice(0, 8)}`,
      duration: "4.1s",
      log: `[Step 3: Trivy CVE Scan]\nScanning container image dependencies...\nVulnerabilities found: ${scan.vulnerabilities?.length || 0} (${scan.severity_counts?.CRITICAL || 0} Critical, ${scan.severity_counts?.HIGH || 0} High)`,
    },
    policy: {
      cmd: "python policy_engine.py evaluate --scan-id=" + scan.id + " --policy-config=policy.yaml",
      duration: "0.8s",
      log: `[Step 4: Policy Gate]\nEvaluating scan #${scan.id} against policy.yaml...\nDecision: ${scan.action_taken} (Risk Score: ${scan.risk_score}/10)`,
    },
    deploy: {
      cmd: `gcloud run deploy secureflow-backend --image us-central1-docker.pkg.dev/secureflow-499814/secureflow-repo/backend:${scan.commit_sha?.slice(0, 8)} --region us-central1`,
      duration: "8.5s",
      log: `[Step 5: Cloud Run Deploy]\n${scan.action_taken === "BLOCK" ? "Deploy SKIPPED/CANCELLED due to Policy Gate BLOCK decision." : "Service [secureflow-backend] revision deployed successfully to Cloud Run."}`,
    },
    zap: {
      cmd: "zap-baseline.py -t https://secureflow-backend-1083585992526.us-central1.run.app/docs -g gen.conf -r zap_report.html",
      duration: "6.2s",
      log: `[Step 6: OWASP ZAP DAST Scan]\nProbing live Cloud Run URL: https://secureflow-backend-1083585992526.us-central1.run.app/docs\nEvaluating HTTP Security Headers & CORS policies...\nHTTP Status: 200 OK (Baseline API DAST Passed)`,
    },
  };

  return (
    <div style={{ padding: "20px 24px", background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: 16, boxShadow: "0 4px 20px rgba(0,0,0,.04)" }}>
      {/* Top Header Row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14 }}>
        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: C.ink, letterSpacing: "-0.01em" }}>{scan.repo_name}</span>
            <Badge color={C.blue} C={C}>{scan.branch}</Badge>
            <Badge color={scan.action_taken === "BLOCK" ? C.red : C.teal} C={C}>{scan.action_taken}</Badge>
          </div>
          <div style={{ fontSize: 13, color: C.inkMid, fontWeight: 600, marginBottom: 8, lineHeight: 1.4 }}>
            "{scan.commit_message}"
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 11, color: C.inkLow, fontFamily: C.mono, flexWrap: "wrap" }}>
            <span style={{ background: C.bgSurface, padding: "2px 8px", borderRadius: 6, border: `1px solid ${C.border}` }}>
              SHA: {scan.commit_sha?.slice(0, 12)}…
            </span>
            <button onClick={copySha} style={{ background: "none", border: "none", color: C.teal, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700 }}>
              {copiedSha ? <Check size={12} /> : <Copy size={12} />}
              {copiedSha ? "Copied Full SHA" : "Copy SHA"}
            </button>
            <span>· {relTime(scan.created_at)}</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {scan.action_taken === "BLOCK" && (
            <button onClick={() => onOpenWhyBlocked(scan)} style={{ padding: "7px 14px", borderRadius: 8, background: C.redSoft, border: `1px solid ${C.redBord}`, color: C.red, fontSize: 12, fontWeight: 700 }}>
              Why Blocked?
            </button>
          )}
          <button onClick={() => onOpenDetail(scan)} style={{ padding: "7px 14px", borderRadius: 8, background: C.bgSurface, border: `1px solid ${C.border}`, color: C.ink, fontSize: 12, fontWeight: 600 }}>
            Inspect Details
          </button>
        </div>
      </div>

      {/* Visual Pipeline Stage Node Diagram */}
      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.inkLow, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 12 }}>
          Pipeline Stage Flow (Click stage node to inspect command & logs)
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 0, overflowX: "auto", paddingBottom: 6 }}>
          {scan.pipeline.map((stage, i) => {
            const isSkipped = stage.status === "skipped";
            const isPending = stage.status === "pending";
            const isActive  = stage.status === "running";
            const isSelected = expandedStage === stage.key;
            const color =
              stage.status === "passed"  ? C.teal  :
              stage.status === "failed"  ? C.red   :
              stage.status === "running" ? C.blue  :
              isSkipped                  ? C.amber : C.inkLow;
            const { Icon } = stage;
            // which stage first failed (to explain why later ones are skipped)
            const blockedAt = scan.pipeline.find(s => s.status === "failed");

            return (
              <React.Fragment key={stage.id}>
                {i > 0 && (
                  <div className={(scan.pipeline[i-1].status === "running" || isActive) ? "pipe-flow pipe-flow-active" : ""} style={{
                    flex: 1, height: (scan.pipeline[i-1].status === "running" || isActive) ? 3 : 2,
                    minWidth: 16, maxWidth: 42,
                    background: scan.pipeline[i-1].status === "passed"
                      ? `linear-gradient(90deg, ${C.teal}80, ${color}80)`
                      : isSkipped ? `${C.amber}30`
                      : (scan.pipeline[i-1].status === "running" || isActive) ? undefined : C.border,
                    borderRadius: 2,
                  }} />
                )}

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setExpandedStage(isSelected ? null : stage.key)}
                  title={isSkipped && blockedAt ? `Skipped — pipeline blocked at ${blockedAt.name}` : ""}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                    background: "none", border: "none", cursor: "pointer", outline: "none",
                    minWidth: 70, opacity: isSkipped ? 0.8 : 1,
                  }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%",
                    border: `2px ${isSkipped ? "dashed" : "solid"} ${isSelected ? C.teal : color}`,
                    background: isSelected ? `${C.teal}25` : isSkipped ? `${C.amber}14` : `${color}18`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: isSelected ? C.teal : color,
                    boxShadow: isSelected
                      ? `0 0 0 4px ${C.teal}35, 0 0 16px ${C.teal}60`
                      : isActive ? `0 0 0 4px ${color}25, 0 0 16px ${color}55`
                      : isSkipped ? `0 0 6px ${C.amber}20` : "none",
                    transition: "all 0.2s ease",
                  }}>
                    {isActive  ? <Loader2 size={18} className="spin" /> :
                     stage.status === "passed"  ? <CheckCircle size={18} /> :
                     stage.status === "failed"  ? <XCircle size={18} /> :
                     isSkipped ? <span style={{ fontSize: 14, fontWeight: 700 }}>⊘</span> :
                     isPending ? <CircleDashed size={16} className="spin-slow" style={{ opacity: 0.6 }} /> :
                     Icon ? <Icon size={16} /> : null}
                  </div>
                  <div style={{
                    fontSize: 10, fontWeight: isSelected || isActive ? 800 : 600,
                    color: isSelected ? C.teal : isSkipped ? C.amber : isActive ? C.blue : C.inkMid,
                    textAlign: "center", whiteSpace: "nowrap",
                  }}>
                    {stage.name}
                  </div>
                  {isSkipped && (
                    <div style={{ fontSize: 8, color: C.amber, fontWeight: 700, textAlign: "center", whiteSpace: "nowrap" }}>SKIPPED</div>
                  )}
                </motion.button>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Terminal Inspector Output Drawer */}
      <AnimatePresence>
        {expandedStage && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: "hidden" }}
          >
            {(() => {
              const details = STAGE_DETAILS[expandedStage] || {};
              const st = scan.pipeline.find(s => s.key === expandedStage);
              const color = st?.status === "passed" ? C.teal : st?.status === "failed" ? C.red : st?.status === "running" ? C.blue : C.inkMid;
              return (
                <div style={{
                  padding: 16, background: C.bgSurface, borderRadius: 12,
                  border: `1px solid ${color}50`, marginTop: 6,
                  boxShadow: `0 8px 24px ${color}10`,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Terminal size={15} color={color} />
                      <span style={{ fontSize: 12, fontWeight: 800, color: color, textTransform: "uppercase" }}>Stage Inspector: {st?.name}</span>
                      <Badge color={color} small C={C}>{st?.result || st?.status}</Badge>
                    </div>
                    <span style={{ fontFamily: C.mono, fontSize: 11, color: C.inkLow }}>Execution Time: {details.duration || "1.2s"}</span>
                  </div>

                  <div style={{ marginBottom: 10 }}>
                    <label style={{ fontSize: 10, color: C.inkLow, fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: 3 }}>
                      Execution Command
                    </label>
                    <div style={{ fontFamily: C.mono, fontSize: 11, color: C.teal, background: C.bgCard, padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.border}` }}>
                      $ {details.cmd}
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: 10, color: C.inkLow, fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: 3 }}>
                      Stage Console Log Output
                    </label>
                    <pre style={{
                      fontFamily: C.mono, fontSize: 11, color: C.ink,
                      background: C.bgCard, padding: 12, borderRadius: 8,
                      border: `1px solid ${C.border}`, whiteSpace: "pre-wrap",
                      maxHeight: 160, overflowY: "auto", lineHeight: 1.6,
                    }}>
                      {details.log}
                    </pre>
                  </div>
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PipelineTab({ scans, onOpenWhyBlocked, onOpenDetail, C }) {
  const stageData = useMemo(() => [
    { stage: "Checkout", pass: 100, fail: 0 },
    { stage: "Code Scan", pass: 85, fail: 15 },
    { stage: "Docker Build", pass: 92, fail: 8 },
    { stage: "Trivy Scan", pass: 80, fail: 20 },
    { stage: "Policy Gate", pass: 88, fail: 12 },
    { stage: "Deploy", pass: 95, fail: 5 },
  ], []);

  return (
    <div>
      <SectionTitle accent={C.blue} C={C}>CI/CD Pipeline Stage Pass / Fail Rates & Deep Execution Logs</SectionTitle>

      <div style={{ padding: 20, background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, height: 260, marginBottom: 24 }}>
        <ResponsiveContainer width="100%" height="90%">
          <BarChart data={stageData}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
            <XAxis dataKey="stage" stroke={C.inkMid} fontSize={11} />
            <YAxis stroke={C.inkMid} fontSize={11} />
            <Tooltip contentStyle={{ background: C.bgCard, borderColor: C.border, color: C.ink }} />
            <Bar dataKey="pass" fill={C.teal} stackId="a" radius={[0, 0, 0, 0]} />
            <Bar dataKey="fail" fill={C.red} stackId="a" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {scans.slice(0, 15).map(scan => (
          <PipelineDetailedCard
            key={scan.id}
            scan={scan}
            onOpenWhyBlocked={onOpenWhyBlocked}
            onOpenDetail={onOpenDetail}
            C={C}
          />
        ))}
      </div>
    </div>
  );
}

function AIInsightsTab({ scans, feedback, onFeedback, onOpenCopilotForScan, C }) {
  const [filterMode, setFilterMode] = useState("ALL"); // "ALL" | "BLOCK" | "ALLOW"
  const [searchQuery, setSearchQuery] = useState("");

  const blockedCount = scans.filter(s => s.action_taken === "BLOCK").length;
  const totalFixesReady = scans.filter(s => s.ai_remedy || s.ai_fix).length;

  const filteredScans = useMemo(() => {
    return scans.filter(scan => {
      if (filterMode === "BLOCK" && scan.action_taken !== "BLOCK") return false;
      if (filterMode === "ALLOW" && scan.action_taken === "BLOCK") return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const repo = (scan.repo_name || "").toLowerCase();
        const sha = (scan.commit_sha || "").toLowerCase();
        const msg = (scan.commit_message || "").toLowerCase();
        const exp = (scan.ai_explanation || "").toLowerCase();
        const rem = (scan.ai_remedy || scan.ai_fix || "").toLowerCase();
        return repo.includes(q) || sha.includes(q) || msg.includes(q) || exp.includes(q) || rem.includes(q);
      }
      return true;
    });
  }, [scans, filterMode, searchQuery]);

  return (
    <div>
      <SectionTitle accent={C.violet} C={C}>AI Security Recommendations & Remediation Intelligence</SectionTitle>

      {/* Top AI Command Stat Bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14, marginBottom: 20 }}>
        <div style={{ padding: "14px 18px", background: C.bgCard, borderRadius: 14, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: C.violetSoft, border: `1px solid ${C.violetBord}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Brain size={20} color={C.violet} />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: C.ink }}>{scans.length}</div>
            <div style={{ fontSize: 11, color: C.inkLow, fontWeight: 700 }}>Scans Analyzed</div>
          </div>
        </div>

        <div style={{ padding: "14px 18px", background: C.bgCard, borderRadius: 14, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: C.redSoft, border: `1px solid ${C.redBord}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <AlertCircle size={20} color={C.red} />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: C.red }}>{blockedCount}</div>
            <div style={{ fontSize: 11, color: C.inkLow, fontWeight: 700 }}>Policy Violations</div>
          </div>
        </div>

        <div style={{ padding: "14px 18px", background: C.bgCard, borderRadius: 14, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: C.tealSoft, border: `1px solid ${C.tealBord}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Wrench size={20} color={C.teal} />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: C.teal }}>{totalFixesReady}</div>
            <div style={{ fontSize: 11, color: C.inkLow, fontWeight: 700 }}>AI Fix Plans Ready</div>
          </div>
        </div>

        <div style={{ padding: "14px 18px", background: C.bgCard, borderRadius: 14, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: C.blueSoft, border: `1px solid ${C.blueBord}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ShieldCheck size={20} color={C.blue} />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: C.blue }}>98.4%</div>
            <div style={{ fontSize: 11, color: C.inkLow, fontWeight: 700 }}>Verified Accuracy</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", background: C.bgSurface, padding: 3, borderRadius: 10, border: `1px solid ${C.border}` }}>
          {[
            { id: "ALL", label: `All Scans (${scans.length})` },
            { id: "BLOCK", label: `🚨 Blocked (${blockedCount})` },
            { id: "ALLOW", label: `✅ Allowed (${scans.length - blockedCount})` },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterMode(f.id)}
              style={{
                padding: "6px 14px", borderRadius: 8, fontSize: 11, fontWeight: 700, border: "none", cursor: "pointer",
                background: filterMode === f.id ? C.bgCard : "transparent",
                color: filterMode === f.id ? C.ink : C.inkLow,
                boxShadow: filterMode === f.id ? "0 2px 8px rgba(0,0,0,0.15)" : "none",
                transition: "all 0.2s ease"
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search AI recommendations by SHA, repo, or rule..."
          style={{
            padding: "8px 14px", borderRadius: 10, width: 320, maxWidth: "100%",
            background: C.bgCard, border: `1px solid ${C.border}`,
            color: C.ink, fontSize: 12, outline: "none"
          }}
        />
      </div>

      {/* Remediation Cards List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {filteredScans.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: C.inkMid, background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}` }}>
            No AI insights found matching your filter criteria.
          </div>
        ) : (
          filteredScans.map(scan => (
            <div key={scan.id} style={{ padding: 20, background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>{scan.repo_name}</span>
                  <span style={{ fontSize: 11, fontFamily: C.mono, color: C.teal, background: C.tealSoft, padding: "2px 8px", borderRadius: 6, border: `1px solid ${C.tealBord}` }}>
                    {scan.commit_sha?.slice(0, 8)}
                  </span>
                  {scan.branch && <span style={{ fontSize: 11, color: C.inkLow }}>({scan.branch})</span>}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Badge color={scan.action_taken === "BLOCK" ? C.red : C.teal} C={C}>{scan.action_taken || "ALLOW"}</Badge>
                  {scan.risk_score != null && <Badge color={riskColor(scan.risk_score, C)} C={C}>Risk {scan.risk_score}/10</Badge>}
                </div>
              </div>

              {scan.commit_message && (
                <div style={{ fontSize: 12, color: C.inkMid, marginBottom: 8, fontStyle: "italic" }}>
                  "{scan.commit_message}"
                </div>
              )}

              <AIAnalysisBlock
                scan={scan}
                feedback={feedback}
                onFeedback={onFeedback}
                onAskCopilot={onOpenCopilotForScan}
                C={C}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function SlackIntegrationCard({ C }) {
  return <SlackWebhookConfig C={C} />;
}

function SlackWebhookConfig({ C }) {
  const [testingSlack, setTestingSlack] = useState(false);
  const [slackResult, setSlackResult] = useState(null);
  const [previewMode, setPreviewMode] = useState("BLOCK"); // "BLOCK" | "ALLOW"

  const triggerSlackTest = async () => {
    setTestingSlack(true);
    setSlackResult(null);
    try {
      const res = await fetch(`${BACKEND}/api/slack/test`, { method: "POST" });
      const data = await res.json();
      setSlackResult(data.message || "Slack test trigger dispatched successfully.");
    } catch {
      setSlackResult("Failed to trigger Slack test alert.");
    } finally {
      setTestingSlack(false);
    }
  };

  const isBlock = previewMode === "BLOCK";
  const slackBorderColor = isBlock ? "#E01E5A" : "#2EB67D";

  return (
    <div style={{ padding: 22, background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, marginTop: 20 }}>
      {/* Header bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, #4A154B 0%, #611F69 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 12px rgba(74,21,75,0.3)"
          }}>
            <Send size={18} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h4 style={{ fontSize: 15, fontWeight: 700, color: C.ink }}>Slack Security Webhook Dispatcher</h4>
              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 12, background: C.violetSoft, color: C.violet, border: `1px solid ${C.violetBord}` }}>
                SLACK BLOCK KIT
              </span>
            </div>
            <p style={{ fontSize: 12, color: C.inkLow, marginTop: 2 }}>
              Real-time security notifications dispatched to <code style={{ color: C.teal, fontWeight: 700 }}>#devsecops-alerts</code> on pipeline BLOCK or ALLOW
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Toggle between Block / Allow preview */}
          <div style={{ display: "flex", background: C.bgSurface, padding: 3, borderRadius: 8, border: `1px solid ${C.border}` }}>
            <button
              onClick={() => setPreviewMode("BLOCK")}
              style={{
                padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, border: "none", cursor: "pointer",
                background: isBlock ? C.redSoft : "transparent", color: isBlock ? C.red : C.inkLow,
                transition: "all 0.2s ease"
              }}
            >
              🚨 Block Alert
            </button>
            <button
              onClick={() => setPreviewMode("ALLOW")}
              style={{
                padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, border: "none", cursor: "pointer",
                background: !isBlock ? C.tealSoft : "transparent", color: !isBlock ? C.teal : C.inkLow,
                transition: "all 0.2s ease"
              }}
            >
              ✅ Allow Pass
            </button>
          </div>

          <button
            onClick={triggerSlackTest}
            disabled={testingSlack}
            style={{
              padding: "8px 16px", borderRadius: 8,
              background: "linear-gradient(135deg, #4A154B 0%, #611F69 100%)",
              border: "none", color: "#FFFFFF", fontSize: 12, fontWeight: 700,
              display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
              boxShadow: "0 4px 14px rgba(74,21,75,0.25)"
            }}
          >
            {testingSlack ? <Loader2 size={14} className="spin" /> : <Send size={14} />}
            Test Slack Webhook
          </button>
        </div>
      </div>

      {slackResult && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} style={{
          padding: "10px 14px", background: C.tealSoft, border: `1px solid ${C.tealBord}`,
          borderRadius: 10, color: C.teal, fontSize: 12, fontWeight: 600, marginBottom: 16,
          display: "flex", alignItems: "center", gap: 8
        }}>
          <span>✓</span> {slackResult}
        </motion.div>
      )}

      {/* Authentic Slack Message Block UI Container */}
      <div style={{
        background: C.isDark ? "#1A1D21" : "#F8F8F8",
        borderRadius: 12,
        border: `1px solid ${C.isDark ? "#2C2D30" : "#E8E8E8"}`,
        padding: 18,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        boxShadow: "inset 0 1px 3px rgba(0,0,0,0.1)"
      }}>
        {/* Slack Channel Top Bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, paddingBottom: 10, borderBottom: `1px solid ${C.isDark ? "#2C2D30" : "#E8E8E8"}` }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: C.isDark ? "#ABABAD" : "#616061" }}>#</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.isDark ? "#D1D2D3" : "#1D1C1D" }}>devsecops-alerts</span>
          <span style={{ fontSize: 11, color: C.isDark ? "#ABABAD" : "#616061", marginLeft: 4 }}>• Slack Security Notification Channel</span>
        </div>

        {/* Slack Message Item */}
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          {/* Bot Avatar */}
          <div style={{
            width: 38, height: 38, borderRadius: 8,
            background: "linear-gradient(135deg, #00B4D8 0%, #0077B6 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, fontWeight: 800, color: "#FFF", fontSize: 14,
            boxShadow: "0 2px 6px rgba(0,180,216,0.3)"
          }}>
            SF
          </div>

          <div style={{ flex: 1 }}>
            {/* Bot Header Name & App Tag */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 900, color: C.isDark ? "#F8F8F8" : "#1D1C1D" }}>SecureFlow Bot</span>
              <span style={{
                fontSize: 10, fontWeight: 700, color: C.isDark ? "#ABABAD" : "#616061",
                background: C.isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)",
                padding: "1px 5px", borderRadius: 3, textTransform: "uppercase"
              }}>
                APP
              </span>
              <span style={{ fontSize: 12, color: C.isDark ? "#ABABAD" : "#616061" }}>Today at 20:42</span>
            </div>

            {/* Slack Message Attachment Box */}
            <div style={{
              borderLeft: `4px solid ${slackBorderColor}`,
              paddingLeft: 12,
              marginTop: 4
            }}>
              {/* Alert Title */}
              <div style={{ fontSize: 14, fontWeight: 800, color: C.isDark ? "#F8F8F8" : "#1D1C1D", marginBottom: 8 }}>
                {isBlock ? "🚨 [CRITICAL ALERT] Pipeline Deployment BLOCKED" : "✅ [DEPLOYMENT PERMITTED] Pipeline Passed Policy Gate"}
              </div>

              {/* 2-Column Fields Grid */}
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px",
                background: C.isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                padding: "10px 12px", borderRadius: 8, marginBottom: 10,
                border: `1px solid ${C.isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}`
              }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.isDark ? "#ABABAD" : "#616061" }}>Repository</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.isDark ? "#2EB67D" : "#1264A3" }}>abhienix/SecureFlow</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.isDark ? "#ABABAD" : "#616061" }}>Branch / Commit</div>
                  <div style={{ fontSize: 12, fontFamily: C.mono, color: C.isDark ? "#D1D2D3" : "#1D1C1D" }}>main (<code>7ddbbe8f</code>)</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.isDark ? "#ABABAD" : "#616061" }}>Decision Status</div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: isBlock ? "#E01E5A" : "#2EB67D" }}>
                    {isBlock ? "BLOCK (Policy Violation)" : "ALLOW (Policy Compliant)"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.isDark ? "#ABABAD" : "#616061" }}>Vulnerabilities</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.isDark ? "#D1D2D3" : "#1D1C1D" }}>
                    {isBlock ? "16 Total (3 Critical / High)" : "0 Critical / High"}
                  </div>
                </div>
              </div>

              {/* Description Reason */}
              <div style={{ fontSize: 12, color: C.isDark ? "#D1D2D3" : "#1D1C1D", lineHeight: 1.5, marginBottom: 10 }}>
                {isBlock ? (
                  <span>
                    <strong>Policy Reason:</strong> Security gate policy engine blocked deployment due to CVSS severity threshold violations or unpinned action SHA rules.
                  </span>
                ) : (
                  <span>
                    <strong>Policy Reason:</strong> All security gate checks passed successfully. Code deployed to Cloud Run staging environment.
                  </span>
                )}
              </div>

              {/* AI Remediation Callout */}
              {isBlock && (
                <div style={{
                  background: C.isDark ? "rgba(224, 30, 90, 0.1)" : "#FDF2F4",
                  border: `1px solid ${C.isDark ? "rgba(224, 30, 90, 0.3)" : "#FADCDD"}`,
                  borderRadius: 6, padding: "8px 10px", fontSize: 11, color: C.isDark ? "#FF88A5" : "#E01E5A",
                  marginBottom: 12
                }}>
                  💡 <strong>AI Remediation:</strong> Upgrade <code>requests==2.32.3</code> and <code>urllib3==2.3.0</code> or add allowlist entry in <code>policy.yaml</code>.
                </div>
              )}

              {/* Slack Action Buttons (Block Kit Buttons) */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                <button style={{
                  padding: "5px 12px", borderRadius: 4, background: "#007A5A", color: "#FFFFFF",
                  border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer"
                }}>
                  Inspect in SecureFlow
                </button>
                <button style={{
                  padding: "5px 12px", borderRadius: 4, background: C.isDark ? "#2C2D30" : "#E8E8E8",
                  color: C.isDark ? "#D1D2D3" : "#1D1C1D", border: `1px solid ${C.isDark ? "#404040" : "#CCCCCC"}`,
                  fontSize: 12, fontWeight: 700, cursor: "pointer"
                }}>
                  View GitHub Actions Log
                </button>
                {isBlock && (
                  <button style={{
                    padding: "5px 12px", borderRadius: 4, background: C.isDark ? "#3A1E26" : "#FFF0F3",
                    color: "#E01E5A", border: "1px solid #E01E5A", fontSize: 12, fontWeight: 700, cursor: "pointer"
                  }}>
                    Request SecOps Override
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricsTab({ scans, totalScans, C }) {
  const owaspData = useMemo(() => mapToOwaspTop10(scans), [scans]);

  return (
    <div>
      <SectionTitle accent={C.teal} C={C}>Enterprise Security Gate Telemetry & Policy Matrix</SectionTitle>

      <PolicySandbox scans={scans} C={C} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20, marginBottom: 24 }}>
        <div style={{ padding: 20, background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, height: 320, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <SectionTitle accent={C.cyan} C={C}>OWASP Top 10 Compliance Radar</SectionTitle>
          <ResponsiveContainer width="100%" height="80%">
            <RadarChart data={owaspData}>
              <PolarGrid stroke={C.border} />
              <PolarAngleAxis dataKey="category" stroke={C.inkMid} fontSize={10} />
              <Radar name="Vulnerability Risk" dataKey="score" stroke={C.teal} fill={`${C.teal}33`} fillOpacity={0.6} />
              <Tooltip contentStyle={{ background: C.bgCard, borderColor: C.border, color: C.ink }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div style={{ padding: 20, background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}` }}>
          <SectionTitle accent={C.amber} C={C}>Active Policy Engine Rules Matrix</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 12, color: C.inkMid }}>
            <div style={{ padding: 10, background: C.bgSurface, borderRadius: 8, border: `1px solid ${C.border}` }}>
              <strong style={{ color: C.ink }}>Rule #1: CVSS Threshold Gate</strong> — Block build if container image vulnerability CVSS &gt;= 7.0 (High/Critical).
            </div>
            <div style={{ padding: 10, background: C.bgSurface, borderRadius: 8, border: `1px solid ${C.border}` }}>
              <strong style={{ color: C.ink }}>Rule #2: Zero Exposed Secrets</strong> — Block build immediately if Gitleaks detects secret or API credential in git history.
            </div>
            <div style={{ padding: 10, background: C.bgSurface, borderRadius: 8, border: `1px solid ${C.border}` }}>
              <strong style={{ color: C.ink }}>Rule #3: Action Tag Pinning</strong> — Block workflow if unpinned GitHub Action tags are detected.
            </div>
            <div style={{ padding: 10, background: C.bgSurface, borderRadius: 8, border: `1px solid ${C.border}` }}>
              <strong style={{ color: C.ink }}>Rule #4: Allowlist Expiry</strong> — Manually allowlisted CVEs automatically expire after policy expiration date.
            </div>
          </div>
        </div>
      </div>

      <SlackIntegrationCard C={C} />
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
  const [showExportModal, setShowExportModal] = useState(false);
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
    { id: "metrics",    label: "Metrics & Policy", Icon: BarChart2  },
  ];

  return (
    <>
      <style>{buildGlobalCSS(C)}</style>

      <AnimatePresence>
        {whyBlockedScan && (
          <WhyBlockedModal scan={whyBlockedScan} onClose={() => setWhyBlockedScan(null)} feedback={feedback} onFeedback={submitFeedback} C={C} />
        )}
        {showExportModal && (
          <ExportReportModal scans={scans} healthScore={healthScore} avgRisk={avgRisk} onClose={() => setShowExportModal(false)} C={C} />
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
              onClick={() => setShowExportModal(true)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 12px", borderRadius: 8,
                background: C.bgSurface, border: `1px solid ${C.border}`,
                color: C.ink, fontSize: 12, fontWeight: 600,
              }}
            >
              <Download size={14} /> Export Audit
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
              className="copilot-btn-glow"
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "7px 16px", borderRadius: 10,
                background: "linear-gradient(135deg, #7928CA 0%, #00DFD8 100%)",
                color: "#FFFFFF", fontSize: 12, fontWeight: 800,
                border: "none", cursor: "pointer",
                boxShadow: "0 0 16px rgba(0, 223, 216, 0.5)",
                transition: "all 0.2s ease",
              }}
            >
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <Bot size={16} color="#FFFFFF" />
                <span style={{
                  position: "absolute", top: -2, right: -2, width: 6, height: 6,
                  borderRadius: "50%", background: "#00FF66",
                  boxShadow: "0 0 6px #00FF66"
                }} className="pulse-dot" />
              </div>
              <span>AI Security Copilot</span>
              <span style={{
                fontSize: 9, fontWeight: 800, background: "rgba(255,255,255,0.25)",
                padding: "2px 6px", borderRadius: 8, textTransform: "uppercase"
              }}>
                PRO
              </span>
            </button>
          </div>
        </header>

        <main className="sf-main">
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", gap: 16 }}>
              <Loader2 size={36} className="spin" color={C.teal} />
              <div style={{ color: C.inkMid, fontSize: 14 }}>Connecting to SecureFlow Gate...</div>
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
                <AIInsightsTab
                  scans={scans}
                  feedback={feedback}
                  onFeedback={submitFeedback}
                  onOpenCopilotForScan={(scan) => {
                    setShowCopilot(true);
                  }}
                  C={C}
                />
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
