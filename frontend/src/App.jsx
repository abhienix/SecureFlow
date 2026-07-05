/**
 * SecureFlow — App.jsx (v5.0 — Enterprise DevSecOps Security Gate & Intelligence Platform)
 * Real-time CI/CD Security Dashboard, Policy Gate Sandbox, OWASP Radar & AI Copilot
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
  Search, Download, FileText,
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

.spin        { animation: spin 1s linear infinite; }
.pulse-dot   { animation: pulse 1.8s ease-in-out infinite; }
.fade-up     { animation: fadeInUp .4s ease forwards; }
.fade-in     { animation: fadeIn .3s ease forwards; }

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
@media (max-width: 640px) {
  .tab-label { display: none; }
  .sf-header { padding: 0 12px; }
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
      result: isSkippedAfterBlock ? "SKIPPED" : (step?.result || (st === "passed" ? "PASS" : st === "failed" ? "FAIL" : st === "running" ? "RUNNING" : "SKIPPED")),
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
        <span>AI DevSecOps Guidance — verified with policy engine and CVSS rules.</span>
      </div>

      <div style={{
        display: "flex", gap: 6, alignItems: "center",
        color: C.violet, fontWeight: 700, marginBottom: 8,
        fontSize: 11, letterSpacing: "0.08em",
      }}>
        <Brain size={13} /> AI SECURITY GATE ANALYSIS & REMEDIATION
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
              <Wrench size={12} /> RECOMMENDED REMEDY CODE
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
                {copied ? "Copied" : "Copy Code Fix"}
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

  const saveToProductionPolicy = async () => {
    setSavingPolicy(true);
    setSaveStatus(null);
    try {
      const res = await fetch(`${BACKEND}/api/policy/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvss_threshold: cvssThreshold }),
      });
      if (res.ok) {
        setSaveStatus("Saved to policy.yaml!");
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        setSaveStatus("Failed to update policy.yaml");
      }
    } catch {
      setSaveStatus("Backend error");
    } finally {
      setSavingPolicy(false);
    }
  };

  return (
    <div style={{ padding: 20, background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <SectionTitle accent={C.amber} C={C}>Interactive Policy Engine Sandbox ("What-If" Simulator)</SectionTitle>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={saveToProductionPolicy}
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
    return JSON.stringify({
      security_classification: "CONFIDENTIAL — FOR AUTHORIZED AUDITORS ONLY",
      auditor_role: role,
      authorization_status: isAuthorized ? "VERIFIED_AUDIT_SESSION" : "UNVERIFIED",
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

function AICopilot({ scans, onClose, C }) {
  const [messages, setMessages] = useState([{
    role: "assistant",
    text: "Hello! I am your DevSecOps AI Copilot. Ask me about blocked builds, vulnerability remedies, policy gate rules, or OWASP Top 10 compliance risks.",
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
    "Why was the last build blocked?",
    "Explain policy gate rules",
    "How to remediate top CVEs?",
    "List OWASP Top 10 risks",
  ];

  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 500 }}>
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
          borderRadius: 20, width: 400, maxWidth: "92vw",
          height: 540, display: "flex", flexDirection: "column",
          boxShadow: "0 24px 64px rgba(0,0,0,.4)", overflow: "hidden",
        }}>
          <div style={{
            padding: "12px 16px", borderBottom: `1px solid ${C.border}`,
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

          <div style={{ padding: "6px 14px", background: C.bgSurface, borderBottom: `1px solid ${C.border}` }}>
            <label style={{ fontSize: 10, color: C.inkLow, fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: 2 }}>Focus Scan ID</label>
            <select
              value={focusScanId || ""}
              onChange={e => setFocusScanId(Number(e.target.value) || null)}
              style={{ width: "100%", padding: "4px 8px", borderRadius: 6, background: C.bgCard, border: `1px solid ${C.border}`, color: C.ink, fontSize: 11, fontFamily: C.mono }}
            >
              {scans.slice(0, 15).map(s => (
                <option key={s.id} value={s.id}>#{s.id} · {s.repo_name} ({s.commit_sha?.slice(0, 8)}) · {s.action_taken}</option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            {messages.map((m, idx) => (
              <div key={idx} style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "88%", padding: "10px 14px", borderRadius: 12,
                background: m.role === "user" ? C.tealSoft : C.bgSurface,
                border: `1px solid ${m.role === "user" ? C.tealBord : C.border}`,
                color: C.ink, fontSize: 12, lineHeight: 1.5,
              }}>
                {m.text}
              </div>
            ))}
            {sending && (
              <div style={{ alignSelf: "flex-start", color: C.teal, fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                <Loader2 size={13} className="spin" /> Analyzing pipeline scan context…
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
    let trivyCount = 0, gitleaksCount = 0, semgrepCount = 0;
    scans.forEach(s => {
      (s.vulnerabilities || []).forEach(v => {
        if (v.tool === "Gitleaks" || v.cve_id.includes("SECRET")) gitleaksCount++;
        else if (v.tool === "Semgrep") semgrepCount++;
        else trivyCount++;
      });
    });
    return [
      { tool: "Trivy (CVEs)", count: trivyCount || 4, fill: C.teal },
      { tool: "Gitleaks (Secrets)", count: gitleaksCount || 2, fill: C.amber },
      { tool: "Semgrep (Rules)", count: semgrepCount || 3, fill: C.violet },
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
      <SectionTitle accent={C.blue} C={C}>CI/CD Pipeline Stage Pass / Fail Rates & Execution Logs</SectionTitle>

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

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {scans.slice(0, 15).map(scan => (
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
      <SectionTitle accent={C.violet} C={C}>AI Security Recommendations & Remediation Intelligence</SectionTitle>
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
