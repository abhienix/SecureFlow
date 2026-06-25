/**
 * SecureFlow — Final App.jsx
 *
 * Fully patched to match:
 *   • GitHub Actions pipeline stages: checkout → code_scan → docker → trivy → policy → deploy
 *   • Backend API shape from main.py (pipeline_steps keys, result values, feedback endpoint)
 *   • ai_analysis module (analyze_scan / analyze_code_scan_failure — explanation, fix, risk_score)
 *   • POST /api/scan-results/{id}/feedback endpoint wired up for real feedback submission
 *   • Real-time auto-refresh every 10s for running scans, 30s otherwise
 *   • Vuln breakdown parsed correctly from Trivy Results[] → Vulnerabilities[]
 *   • No broken JSX, no syntax errors, single-file export
 */

import React, {
  useState, useEffect, useCallback, useRef, useMemo,
} from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  Shield, Activity, CheckCircle, XCircle, AlertTriangle, Zap, Cpu,
  RefreshCw, Search, X, ThumbsUp, ThumbsDown,
  ChevronDown, ChevronUp, Package, Info, Clock, TrendingUp,
  Filter, GitPullRequest, Copy, Check, Sparkles,
  ShieldAlert, GitBranch, User, Flame, ArrowRight, ListChecks, Loader2,
  Minus,
} from "lucide-react";

// ─── Design tokens ──────────────────────────────────────────────────────────
const C = {
  bg:           "#080c10",
  bgCard:       "#0d1117",
  bgHover:      "#131a22",
  bgSurface:    "#161b22",
  bgElevated:   "#1c2330",
  border:       "#1e2d3d",
  borderBright: "#2a3f55",
  ink:          "#e6edf3",
  inkMid:       "#8b949e",
  inkLow:       "#3d4f61",
  teal:         "#00d9a6",
  tealSoft:     "#00d9a615",
  tealBord:     "#00d9a635",
  tealDim:      "#003d2e",
  blue:         "#58a6ff",
  blueSoft:     "#58a6ff12",
  blueDim:      "#0a2040",
  green:        "#3fb950",
  greenSoft:    "#3fb95015",
  red:          "#f85149",
  redSoft:      "#f8514912",
  redBord:      "#5c1a1a",
  amber:        "#f0883e",
  amberSoft:    "#f0883e12",
  amberBord:    "#7a3800",
  violet:       "#bc8cff",
  violetSoft:   "#bc8cff12",
  violetBord:   "#4a1a8a",
  mono: "'JetBrains Mono','Fira Mono','Consolas',monospace",
  sans: "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
};

const BACKEND = "https://secureflow-backend-1083585992526.us-central1.run.app";

const TABS = [
  { id: "overview", label: "Overview",  icon: Activity      },
  { id: "pipeline", label: "Pipeline",  icon: GitPullRequest },
  { id: "feed",     label: "Scan Feed", icon: ListChecks    },
  { id: "metrics",  label: "Metrics",   icon: TrendingUp    },
];

// ─── Pipeline stage config — matches GitHub Actions + backend pipeline_steps keys ──
const PIPELINE_STAGES = [
  { key: "checkout",  label: "Checkout",      icon: "⬇" },
  { key: "code_scan", label: "Code Scan",     icon: "🔍" },
  { key: "docker",    label: "Docker Build",  icon: "🐳" },
  { key: "trivy",     label: "Trivy Scan",    icon: "🛡" },
  { key: "policy",    label: "Policy Gate",   icon: "⚖" },
  { key: "deploy",    label: "Deploy",        icon: "🚀" },
];

// Map backend result strings → display status
function resultToStatus(result) {
  if (!result) return "pending";
  const r = result.toUpperCase();
  if (["PASS", "SCANNED"].includes(r))             return "passed";
  if (["FAIL", "FAILED", "BLOCK"].includes(r))     return "failed";
  if (r === "RUNNING")                             return "running";
  if (r === "SKIPPED")                             return "skipped";
  return "passed"; // default for unknown
}

/**
 * Normalise a raw scan from the backend into the shape the UI expects.
 * pipeline_steps (dict) → pipeline (array of stage objects)
 */
function normaliseScan(raw) {
  const steps = raw.pipeline_steps || {};
  const pipeline = PIPELINE_STAGES.map(({ key, label, icon }) => {
    const info = steps[key] || {};
    const status = resultToStatus(info.result);
    return {
      id:    key,
      name:  label,
      icon,
      status,
      result: info.result || "",
      detail: info.detail || "",
      logs:  info.detail ? [info.detail] : [],
    };
  });

  // Extract vuln breakdown from findings if present
  let vuln_breakdown = raw.vuln_breakdown || null;
  if (!vuln_breakdown && raw.findings && raw.findings.Results) {
    const allVulns = [];
    (raw.findings.Results || []).forEach(r => {
      (r.Vulnerabilities || []).forEach(v => allVulns.push(v));
    });
    const fixable = allVulns.filter(v => v.FixedVersion);
    vuln_breakdown = {
      total: allVulns.length,
      fixable_count: fixable.length,
      app_count: allVulns.filter(v => v.Type === "gobinary" || v.Type === "pip").length,
      base_image_count: allVulns.filter(v => !v.FixedVersion).length,
      fixable_details: fixable.slice(0, 6).map(v => ({
        id:       v.VulnerabilityID,
        package:  v.PkgName,
        severity: v.Severity,
        fix:      v.FixedVersion || "—",
        cvss:     v.CVSS ? Math.max(...Object.values(v.CVSS).map(c => c.V3Score || c.V2Score || 0)) : 0,
      })),
      base_image_note: allVulns.filter(v => !v.FixedVersion).length > 8
        ? "Most CVEs originate from the base image and are not directly fixable in your code."
        : undefined,
    };
  }

  return {
    ...raw,
    pipeline,
    vuln_breakdown,
    ai_confidence: raw.ai_confidence || (raw.risk_score ? Math.min(99, Math.max(60, raw.risk_score * 10)) : null),
  };
}

// ─── Formatters ──────────────────────────────────────────────────────────────
const fmt     = (iso) => { if (!iso) return "—"; const d = new Date(iso); return isNaN(d) ? "—" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }); };
const fmtFull = (iso) => { if (!iso) return "—"; const d = new Date(iso); return isNaN(d) ? "—" : d.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); };
const fmtTime = (d)   => d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
const fmtDur  = (ms)  => { if (!ms) return "—"; if (ms < 1000) return `${ms}ms`; return `${(ms / 1000).toFixed(1)}s`; };
const relTime = (iso) => {
  if (!iso) return "—";
  const fixedIso = /Z$|[+-]\d\d:\d\d$/.test(iso) ? iso : iso + "Z";
  const m = Math.floor((Date.now() - new Date(fixedIso)) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const severityColor = (s) => ({
  CRITICAL: C.red,
  HIGH:     C.amber,
  MEDIUM:   C.blue,
  LOW:      C.inkMid,
  CLEAN:    C.teal,
}[String(s || "").toUpperCase()] || C.inkMid);

const riskColor = (n) => n >= 7 ? C.red : n >= 4 ? C.amber : C.teal;
const TT = { background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 12, color: C.ink };

const lsGet = (k, fb) => { try { const v = localStorage.getItem(k); return v !== null ? JSON.parse(v) : fb; } catch { return fb; } };
const lsSet = (k, v)  => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

// ─── Threat feed (static — not in backend) ───────────────────────────────────
const THREAT_FEED_DATA = [
  { id: "tf1", level: "CRITICAL", title: "urllib3 CVE-2024-37891 actively exploited in the wild",  source: "NVD / GHSA",      time: "12m ago" },
  { id: "tf2", level: "HIGH",     title: "New GitHub fine-grained token leak pattern detected",     source: "GitHub Advisory", time: "48m ago" },
  { id: "tf3", level: "HIGH",     title: "Docker privilege escalation via misconfigured runtime",   source: "CISA",            time: "2h ago"  },
  { id: "tf4", level: "MEDIUM",   title: "OpenSSL downgrade attack affecting TLS handshakes",       source: "OpenSSL",         time: "5h ago"  },
  { id: "tf5", level: "MEDIUM",   title: "Supply-chain typosquat targeting npm registry",           source: "Socket.dev",      time: "9h ago"  },
];

// ─── Global CSS ──────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { background: ${C.bg}; color: ${C.ink}; font-family: ${C.sans}; }
  button { font-family: inherit; }
  input  { font-family: inherit; }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }

  @keyframes blink     { 0%,100%{opacity:1} 50%{opacity:0.15} }
  @keyframes shimmer   { 0%,100%{opacity:0.35} 50%{opacity:0.7} }
  @keyframes spin      { to{transform:rotate(360deg)} }
  @keyframes scaleIn   { from{transform:scale(0.88);opacity:0} to{transform:scale(1);opacity:1} }
  @keyframes fadeUp    { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeIn    { from{opacity:0} to{opacity:1} }
  @keyframes countUp   { from{opacity:0;transform:scale(0.8)} to{opacity:1;transform:scale(1)} }
  @keyframes pulseRing { 0%{box-shadow:0 0 0 0 rgba(0,217,166,.5)} 70%{box-shadow:0 0 0 8px rgba(0,217,166,0)} 100%{box-shadow:0 0 0 0 rgba(0,217,166,0)} }
  @keyframes pulseBlue { 0%{box-shadow:0 0 0 0 rgba(88,166,255,.5)} 70%{box-shadow:0 0 0 8px rgba(88,166,255,0)} 100%{box-shadow:0 0 0 0 rgba(88,166,255,0)} }
  @keyframes aiGlow    { 0%,100%{box-shadow:0 0 0 0 rgba(188,140,255,0)} 50%{box-shadow:0 0 16px 2px rgba(188,140,255,0.2)} }
  @keyframes nodePulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.18);opacity:0.75} }
  @keyframes stageGrow { from{width:0} to{width:100%} }

  button:focus-visible { outline: 2px solid ${C.teal}; outline-offset: 2px; }
  input:focus { border-color: ${C.tealBord} !important; box-shadow: 0 0 0 3px ${C.teal}18; }

  .anim-fadeUp  { animation: fadeUp 0.28s ease both; }
  .anim-countUp { animation: countUp 0.35s cubic-bezier(0.34,1.56,0.64,1) both; }
  .anim-scaleIn { animation: scaleIn 0.2s ease both; }
  .running-dot  { animation: blink 1s step-end infinite; }
  .spin         { animation: spin 1s linear infinite; }
  .stage-pulse  { animation: nodePulse 1.2s ease-in-out infinite; }
  .ai-glow      { animation: aiGlow 2.5s ease-in-out infinite; }
`;

(function injectGlobalCSS() {
  if (typeof document === "undefined") return;
  if (document.getElementById("sf-global-css")) return;
  const style = document.createElement("style");
  style.id = "sf-global-css";
  style.textContent = GLOBAL_CSS;
  document.head.appendChild(style);
})();

// ═══════════════════════════════════════════════════════════════════════════
// PRIMITIVES
// ═══════════════════════════════════════════════════════════════════════════

const EmptyChart = () => (
  <div style={{ height: 150, display: "flex", alignItems: "center", justifyContent: "center", color: C.inkLow, fontSize: 13 }}>No data yet</div>
);
const EmptyState = ({ text }) => (
  <div style={{ color: C.inkLow, fontSize: 13, padding: "24px 0", textAlign: "center" }}>{text}</div>
);

const Badge = ({ color, children, small }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 3,
    padding: small ? "2px 7px" : "3px 10px",
    borderRadius: 999, fontSize: small ? 9 : 10, fontWeight: 700,
    background: color + "18", color,
    border: `1px solid ${color}30`, whiteSpace: "nowrap", letterSpacing: "0.05em",
    fontFamily: C.mono,
  }}>{children}</span>
);

const Card = ({ children, style, glow }) => (
  <div style={{
    background: C.bgCard, borderRadius: 14,
    border: `1px solid ${glow ? C.tealBord : C.border}`,
    padding: "18px 20px", marginBottom: 12,
    boxShadow: glow ? `0 0 24px ${C.teal}10` : "none",
    ...style,
  }}>{children}</div>
);

const SectionTitle = ({ children, accent }) => (
  <div style={{
    fontSize: 9, fontWeight: 800, color: accent || C.inkLow,
    letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 14,
    display: "flex", alignItems: "center", gap: 6,
  }}>
    {accent && <span style={{ width: 3, height: 10, background: accent, borderRadius: 2, display: "inline-block" }} />}
    {children}
  </div>
);

const Skeleton = ({ w = "100%", h = 16, r = 6 }) => (
  <div style={{ width: w, height: h, borderRadius: r, background: C.bgSurface, animation: "shimmer 1.4s ease infinite" }} />
);

const SkeletonCard = () => (
  <div style={{ background: C.bgCard, borderRadius: 14, border: `1px solid ${C.border}`, padding: "18px 20px", marginBottom: 10 }}>
    <div style={{ display: "flex", gap: 10, marginBottom: 12 }}><Skeleton w={80} h={12} /><Skeleton w={60} h={12} /></div>
    <Skeleton h={14} /><div style={{ marginTop: 8 }}><Skeleton w="60%" h={10} /></div>
  </div>
);

const StatusDot = ({ status }) => {
  const color = status === "running" ? C.blue : status === "complete" ? C.green : status === "failed" ? C.red : C.inkMid;
  return (
    <span style={{
      display: "inline-block", width: 7, height: 7, borderRadius: "50%",
      background: color, flexShrink: 0,
      animation: status === "running" ? "pulseBlue 1.6s ease-out infinite" : "none",
    }} />
  );
};

const ActionBadge = ({ action }) => (
  <Badge color={action === "BLOCK" ? C.red : C.teal}>
    {action === "BLOCK" ? <XCircle size={9} /> : <CheckCircle size={9} />}
    {action}
  </Badge>
);

const RiskBar = ({ score }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
    <div style={{ flex: 1, height: 4, borderRadius: 4, background: C.bgSurface, overflow: "hidden" }}>
      <div style={{ width: `${score * 10}%`, height: "100%", background: riskColor(score), borderRadius: 4, transition: "width 0.6s ease" }} />
    </div>
    <span style={{ fontSize: 11, fontFamily: C.mono, color: riskColor(score), minWidth: 22 }}>{score}</span>
  </div>
);

const ConfidencePip = ({ value }) => {
  const color = value >= 85 ? C.teal : value >= 70 ? C.amber : C.red;
  return <span style={{ fontSize: 10, fontFamily: C.mono, color, fontWeight: 700 }}>{value}%</span>;
};

// ─── Health Ring ─────────────────────────────────────────────────────────────
const HealthRing = ({ score, size = 120 }) => {
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 75 ? C.teal : score >= 50 ? C.amber : C.red;
  const label = score >= 75 ? "Healthy" : score >= 50 ? "At Risk" : "Critical";
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.bgSurface} strokeWidth={8} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1)", filter: `drop-shadow(0 0 8px ${color}99)` }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 24, fontWeight: 900, color: C.ink, fontFamily: C.mono, lineHeight: 1 }}>{score}</div>
        <div style={{ fontSize: 8, color, fontWeight: 700, letterSpacing: "0.1em", marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, color, sub }) => (
  <div className="anim-countUp" style={{
    background: C.bgCard, borderRadius: 14, border: `1px solid ${C.border}`,
    padding: "16px 18px", display: "flex", flexDirection: "column", gap: 8,
    position: "relative", overflow: "hidden",
  }}>
    <div style={{ position: "absolute", top: 0, right: 0, width: 60, height: 60, background: color + "08", borderRadius: "0 14px 0 60px" }} />
    <div style={{ background: color + "15", borderRadius: 9, padding: 7, width: "fit-content" }}>
      <Icon size={14} color={color} strokeWidth={2.5} />
    </div>
    <div style={{ fontSize: 28, fontWeight: 900, color: C.ink, lineHeight: 1, fontFamily: C.mono }}>{value}</div>
    <div style={{ fontSize: 11, color: C.inkMid, fontWeight: 600 }}>{label}</div>
    {sub && <div style={{ fontSize: 10, color: C.inkLow }}>{sub}</div>}
  </div>
);

// ─── Vuln Breakdown ───────────────────────────────────────────────────────────
const VulnBreakdown = ({ breakdown }) => {
  const [open, setOpen] = useState(false);
  if (!breakdown) return null;
  const { base_image_count=0, fixable_count=0, app_count=0, total=0, fixable_details=[], base_image_note } = breakdown;
  return (
    <div style={{ marginTop: 10, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "9px 12px", background: C.bgSurface, border: "none", cursor: "pointer",
        fontSize: 11, fontWeight: 700, color: C.inkMid,
      }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Package size={12} />
          {total} CVEs — {base_image_count} base · {fixable_count} fixable · {app_count} other
        </span>
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {open && (
        <div style={{ padding: "10px 12px", background: C.bgCard, fontSize: 12 }} className="anim-fadeUp">
          {base_image_note && (
            <div style={{ display: "flex", gap: 8, padding: "8px 10px", borderRadius: 8, background: C.amberSoft, border: `1px solid ${C.amberBord}`, marginBottom: 10, color: C.amber, lineHeight: 1.5 }}>
              <Info size={13} style={{ flexShrink: 0, marginTop: 1 }} /><span>{base_image_note}</span>
            </div>
          )}
          {fixable_details.length > 0 && (
            <>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.red, marginBottom: 6, letterSpacing: "0.06em" }}>⚠ FIXABLE — ACTION REQUIRED</div>
              {fixable_details.map((v, idx) => (
                <div key={v.id + idx} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
                  <Badge color={severityColor(v.severity)} small>{v.severity}</Badge>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontFamily: C.mono, fontSize: 10, color: C.blue }}>{v.id}</span>
                    <span style={{ color: C.inkMid, marginLeft: 6 }}>{v.package}</span>
                    <div style={{ fontSize: 10, color: C.teal, marginTop: 2 }}>Fix: {v.fix}</div>
                  </div>
                  {v.cvss > 0 && <span style={{ fontSize: 10, fontFamily: C.mono, color: C.amber }}>CVSS {v.cvss.toFixed(1)}</span>}
                </div>
              ))}
            </>
          )}
          {fixable_count === 0 && <div style={{ color: C.teal, fontSize: 11 }}>✓ No fixable CVEs</div>}
        </div>
      )}
    </div>
  );
};

// ─── Fix Diff View ────────────────────────────────────────────────────────────
const FixDiffView = ({ scan }) => {
  const [copied, setCopied] = useState(false);
  const pkgs = scan?.vuln_breakdown?.fixable_details || [];
  if (!pkgs.length) return null;
  const before = pkgs.map(p => `${p.package}  # ${p.id} — vulnerable`).join("\n");
  const after  = pkgs.map(p => `${p.package}==${p.fix}`).join("\n");
  const copy = () => navigator.clipboard.writeText(after).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  return (
    <Card style={{ marginTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <SectionTitle accent={C.teal}>Suggested Fix</SectionTitle>
        <button onClick={copy} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.inkMid, background: "none", border: "none", cursor: "pointer" }}>
          {copied ? <Check size={13} color={C.teal} /> : <Copy size={13} />}
          {copied ? "Copied!" : "Copy fix"}
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[
          { label: "BEFORE", bg: C.redSoft,  border: C.redBord,  color: C.red,  content: before },
          { label: "AFTER",  bg: C.tealSoft, border: C.tealBord, color: C.teal, content: after  },
        ].map(({ label, bg, border, color, content }) => (
          <div key={label}>
            <div style={{ fontSize: 9, color, fontWeight: 700, marginBottom: 6, letterSpacing: "0.1em" }}>{label}</div>
            <pre style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: "10px 12px", fontSize: 11, fontFamily: C.mono, color: C.ink, margin: 0, whiteSpace: "pre-wrap" }}>{content}</pre>
          </div>
        ))}
      </div>
    </Card>
  );
};

// ─── Why Blocked Modal ────────────────────────────────────────────────────────
const WhyBlockedModal = ({ scan, onClose }) => {
  const [activeTab, setActiveTab] = useState("human");
  if (!scan) return null;

  const sev = (scan?.severity || "").toUpperCase();
  const fixable = scan?.vuln_breakdown?.fixable_details || [];
  const fixableCount = scan?.vuln_breakdown?.fixable_count ?? fixable.length;
  const worst = fixable[0];

  const human = scan?.ai_explanation ||
    `This deploy was stopped because the pipeline found ${fixableCount > 0 ? `${fixableCount} fixable security issue${fixableCount === 1 ? "" : "s"}` : "a policy violation"}${sev ? ` rated ${sev}` : ""}. ${worst ? `The most serious one is in ${worst.package} (${worst.id}), which already has a known fix.` : ""} Nothing reached production.`;

  const technical = [
    `Scan type: ${(scan?.scan_type || "unknown").replace(/-/g, " ")}.`,
    `Risk score ${scan?.risk_score ?? "—"}/10.`,
    scan?.vuln_breakdown?.total ? `${scan.vuln_breakdown.total} CVEs detected, ${fixableCount} with available fixes.` : "",
    `Policy engine action: ${scan?.action_taken}.`,
    scan?.ai_fix ? `Recommended fix: ${scan.ai_fix}` : "",
  ].filter(Boolean).join(" ");

  const business = sev === "CRITICAL"
    ? "Deploying this would expose customer PII to known exploit chains. Regulatory fines (GDPR Art. 83) and incident response costs typically exceed $250k for this vector."
    : sev === "HIGH"
    ? "This vulnerability has a working public PoC. A successful exploit could allow lateral movement within the cluster and data exfiltration."
    : sev === "MEDIUM"
    ? "While not immediately exploitable, leaving this unpatched increases attack surface. Patch now to avoid compounding risk."
    : "Policy mandates remediation before deploy to maintain compliance posture.";

  const tabs = [
    { id: "human",     label: "Human",     emoji: "🗣",  body: human    },
    { id: "technical", label: "Technical", emoji: "⚙",  body: technical },
    { id: "business",  label: "Business",  emoji: "💼", body: business  },
  ];
  const active = tabs.find(t => t.id === activeTab);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 250, background: "rgba(0,0,0,0.78)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div className="anim-scaleIn" style={{ width: "100%", maxWidth: 560, background: C.bgCard, borderRadius: 16, border: `1px solid ${C.redBord}`, boxShadow: `0 24px 64px rgba(0,0,0,0.8), 0 0 0 1px ${C.red}20`, overflow: "hidden" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, background: C.redSoft }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <XCircle size={15} color={C.red} />
              <span style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>Why was this blocked?</span>
            </div>
            <div style={{ fontSize: 11, color: C.inkMid, fontFamily: C.mono }}>{scan.commit_sha?.slice(0,8)} · {scan.repo_name} · {fmt(scan.created_at)}</div>
          </div>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: C.inkMid }}><X size={16} /></button>
        </div>
        <div style={{ display: "flex", gap: 4, padding: "12px 20px 0" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              padding: "7px 14px", borderRadius: "9px 9px 0 0", border: "none", cursor: "pointer",
              fontSize: 12, fontWeight: 700,
              background: activeTab === t.id ? C.bgSurface : "transparent",
              color: activeTab === t.id ? C.ink : C.inkMid,
              borderBottom: activeTab === t.id ? `2px solid ${C.red}` : "2px solid transparent",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <span>{t.emoji}</span>{t.label}
            </button>
          ))}
        </div>
        <div style={{ padding: "18px 20px 20px", background: C.bgSurface }}>
          <div className="anim-fadeUp" style={{ fontSize: 13, color: C.ink, lineHeight: 1.75 }}>{active.body}</div>
          {activeTab === "technical" && scan.vuln_breakdown && (
            <div style={{ marginTop: 14 }}><VulnBreakdown breakdown={scan.vuln_breakdown} /></div>
          )}
          {scan.ai_fix && (
            <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 10, background: C.tealSoft, border: `1px solid ${C.tealBord}`, fontSize: 12, color: C.inkMid, lineHeight: 1.6 }}>
              <strong style={{ color: C.teal, display: "block", marginBottom: 4, fontSize: 10, letterSpacing: "0.08em" }}>RECOMMENDED FIX</strong>
              {scan.ai_fix}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Pipeline Stage Nodes ─────────────────────────────────────────────────────
function PipelineMiniNodes({ pipeline }) {
  if (!pipeline?.length) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, margin: "10px 0 4px", overflowX: "auto", paddingBottom: 2 }}>
      {pipeline.map((stage, i) => {
        const color =
          stage.status === "passed"  ? C.teal :
          stage.status === "failed"  ? C.red :
          stage.status === "running" ? C.blue : C.inkLow;
        const inner =
          stage.status === "passed"  ? "✓" :
          stage.status === "failed"  ? "✗" :
          stage.status === "running" ? "…" : "·";
        return (
          <React.Fragment key={stage.id}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 52 }}>
              <div
                title={`${stage.name}: ${stage.result || stage.status}${stage.detail ? " — " + stage.detail : ""}`}
                className={stage.status === "running" ? "stage-pulse" : ""}
                style={{
                  width: 24, height: 24, borderRadius: "50%",
                  background: stage.status === "skipped" || stage.status === "pending" ? C.bgSurface : color + "18",
                  border: `2px solid ${color}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, color,
                  boxShadow:
                    stage.status === "failed" ? `0 0 8px ${C.red}60` :
                    stage.status === "passed" ? `0 0 6px ${C.teal}40` : "none",
                }}
              >{inner}</div>
              <div style={{ fontSize: 8, color: C.inkMid, marginTop: 3, textAlign: "center", whiteSpace: "nowrap" }}>{stage.name}</div>
            </div>
            {i < pipeline.length - 1 && (
              <div style={{ flex: 1, height: 2, minWidth: 6, background: stage.status === "passed" ? C.teal + "50" : C.border, marginBottom: 18 }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function PipelineLogView({ scan }) {
  const [expanded, setExpanded] = useState(null);
  if (!scan?.pipeline?.length) return <EmptyState text="No pipeline data" />;

  return (
    <div>
      {scan.pipeline.map((stage, i) => {
        const isLast = i === scan.pipeline.length - 1;
        const color =
          stage.status === "passed"  ? C.teal :
          stage.status === "failed"  ? C.red :
          stage.status === "running" ? C.blue : C.inkLow;
        const icon =
          stage.status === "passed"  ? <CheckCircle size={15} color={C.teal} /> :
          stage.status === "failed"  ? <XCircle size={15} color={C.red} /> :
          stage.status === "running" ? <Loader2 size={15} color={C.blue} className="spin" /> :
          <Minus size={15} color={C.inkLow} />;

        const displayLogs = stage.logs?.length ? stage.logs : stage.detail ? [stage.detail] : ["No details"];

        return (
          <div key={stage.id} style={{ display: "flex", gap: 14, marginBottom: 4 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 24, flexShrink: 0 }}>
              {icon}
              {!isLast && <div style={{ width: 2, flex: 1, minHeight: 16, background: color, opacity: 0.3, marginTop: 4 }} />}
            </div>
            <div style={{ flex: 1, marginBottom: 10 }}>
              <div
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                onClick={() => setExpanded(expanded === stage.id ? null : stage.id)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color }}>{stage.name}</span>
                  <Badge color={color} small>{stage.result || stage.status}</Badge>
                </div>
                {expanded === stage.id ? <ChevronUp size={12} color={C.inkMid} /> : <ChevronDown size={12} color={C.inkMid} />}
              </div>
              {expanded === stage.id && (
                <div className="anim-fadeUp" style={{ marginTop: 8, background: C.bgSurface, borderRadius: 8, padding: "10px 12px", border: `1px solid ${C.border}` }}>
                  {displayLogs.map((line, li) => (
                    <div key={li} style={{
                      fontSize: 11, fontFamily: C.mono, lineHeight: 1.8,
                      color: /error|fail|block/i.test(line) ? C.red : /pass|ok|success|allow/i.test(line) ? C.teal : /skip/i.test(line) ? C.inkMid : /scan|running|in progress/i.test(line) ? C.blue : C.inkMid,
                    }}>{line}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── AI Panel ─────────────────────────────────────────────────────────────────
const AIPanel = ({ scan, feedback, onFeedback, onOpenWhyBlocked }) => {
  const bl = scan.action_taken === "BLOCK";
  if (!scan.ai_explanation) return null;
  const fb = feedback?.[scan.id];
  return (
    <div className="ai-glow" style={{
      marginTop: 14, borderRadius: 12,
      background: `linear-gradient(135deg, ${C.violetSoft}, ${C.blueSoft})`,
      border: `1px solid ${C.violetBord}`,
      padding: "14px 16px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
        <div style={{ background: C.violet + "25", borderRadius: 8, padding: "4px 6px", display: "flex", alignItems: "center" }}>
          <Zap size={11} color={C.violet} />
        </div>
        <span style={{ fontSize: 10, fontWeight: 800, color: C.violet, letterSpacing: "0.12em", textTransform: "uppercase" }}>AI Analysis</span>
        {scan.ai_confidence && <ConfidencePip value={scan.ai_confidence} />}
      </div>
      <p style={{ fontSize: 12, color: C.ink, lineHeight: 1.75, marginBottom: 10 }}>{scan.ai_explanation}</p>
      {scan.ai_fix && (
        <div style={{ padding: "9px 12px", borderRadius: 9, background: C.tealSoft, border: `1px solid ${C.tealBord}`, fontSize: 12, color: C.inkMid, lineHeight: 1.6, marginBottom: 10 }}>
          <strong style={{ color: C.teal, display: "block", marginBottom: 3, fontSize: 9, letterSpacing: "0.08em" }}>REMEDIATION</strong>
          {scan.ai_fix}
        </div>
      )}
      {bl && (
        <button onClick={() => onOpenWhyBlocked(scan)} style={{
          display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, marginBottom: 10,
          border: `1px solid ${C.redBord}`, background: C.redSoft, color: C.red,
          cursor: "pointer", fontSize: 11, fontWeight: 700,
        }}>
          <AlertTriangle size={11} /> Why was this blocked?
        </button>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 9, color: C.inkLow, letterSpacing: "0.08em" }}>FEEDBACK</span>
        {fb ? (
          <Badge color={fb === "accept" ? C.teal : C.red} small>
            {fb === "accept" ? "✓ Marked accurate" : "✗ Marked incorrect"}
          </Badge>
        ) : (
          <>
            <button onClick={() => onFeedback(scan.id, "accept")} style={{ border: `1px solid ${C.tealBord}`, borderRadius: 7, background: C.tealSoft, padding: "3px 10px", cursor: "pointer", fontSize: 11, color: C.teal, display: "flex", alignItems: "center", gap: 4 }}>
              <ThumbsUp size={10} /> Accurate
            </button>
            <button onClick={() => onFeedback(scan.id, "reject")} style={{ border: `1px solid ${C.border}`, borderRadius: 7, background: C.bgSurface, padding: "3px 10px", cursor: "pointer", fontSize: 11, color: C.inkMid, display: "flex", alignItems: "center", gap: 4 }}>
              <ThumbsDown size={10} /> Incorrect
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// ─── Commit Card ──────────────────────────────────────────────────────────────
const CommitCard = ({ scan, feedback, onFeedback, onOpenWhyBlocked, delay = 0, defaultExpanded = false }) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const bl = scan.action_taken === "BLOCK";
  const isRunning = scan.status === "running";
  const accentColor = isRunning ? C.blue : bl ? C.red : C.teal;

  return (
    <div className="anim-fadeUp" style={{
      background: C.bgCard, borderRadius: 14, border: `1px solid ${C.border}`,
      borderLeft: `3px solid ${accentColor}`, padding: "14px 16px", marginBottom: 10,
      animationDelay: `${delay}s`, transition: "transform 0.15s",
    }}
      onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
      onMouseLeave={e => e.currentTarget.style.transform = "none"}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginBottom: 5 }}>
            <span style={{ fontFamily: C.mono, fontSize: 12, color: C.blue, fontWeight: 700 }}>{scan.commit_sha?.slice(0,8) || "—"}</span>
            {isRunning
              ? <Badge color={C.blue}><Loader2 size={9} className="spin" /> RUNNING</Badge>
              : <ActionBadge action={scan.action_taken || "—"} />
            }
            {!isRunning && scan.severity && <Badge color={severityColor(scan.severity)}>{scan.severity}</Badge>}
            {scan.risk_score != null && !isRunning && <Badge color={riskColor(scan.risk_score)} small>Risk {scan.risk_score}/10</Badge>}
          </div>
          <div style={{ fontSize: 13, color: C.ink, fontWeight: 600, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {scan.commit_message || scan.repo_name || "—"}
          </div>
          <div style={{ fontSize: 11, color: C.inkMid }}>{scan.repo_name} · {scan.branch} · {relTime(scan.created_at)}</div>
        </div>
        <button onClick={() => setExpanded(e => !e)} style={{
          border: `1px solid ${C.border}`, borderRadius: 8, background: C.bgSurface,
          padding: "5px 10px", cursor: "pointer", fontSize: 11, color: C.inkMid,
          display: "flex", alignItems: "center", gap: 4, flexShrink: 0,
        }}>
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {expanded ? "Less" : "Details"}
        </button>
      </div>

      <PipelineMiniNodes pipeline={scan.pipeline} />

      {expanded && (
        <div className="anim-fadeUp" style={{ marginTop: 12, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            {[
              { label: "REPO / BRANCH", value: `${scan.repo_name || "—"} / ${scan.branch || "—"}` },
              { label: "SCANNED AT",    value: fmtFull(scan.created_at) },
              { label: "SCAN TYPE",     value: (scan.scan_type || "").toUpperCase().replace(/-/g, " ") || "FULL PIPELINE" },
              { label: "DURATION",      value: fmtDur(scan.duration_ms), mono: true },
            ].map(({ label, value, mono }) => (
              <div key={label}>
                <div style={{ fontSize: 9, color: C.inkLow, fontWeight: 800, letterSpacing: "0.1em", marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 12, color: C.inkMid, fontFamily: mono ? C.mono : "inherit" }}>{value}</div>
              </div>
            ))}
          </div>
          {scan.vuln_breakdown && <VulnBreakdown breakdown={scan.vuln_breakdown} />}
          {!isRunning && <FixDiffView scan={scan} />}
          <AIPanel scan={scan} feedback={feedback} onFeedback={onFeedback} onOpenWhyBlocked={onOpenWhyBlocked} />
        </div>
      )}
    </div>
  );
};

// ─── Scan Detail Slide-In ─────────────────────────────────────────────────────
function ScanDetail({ scan, onClose, onWhyBlocked, feedback, onFeedback }) {
  if (!scan) return null;
  const blocked = scan.action_taken === "BLOCK";
  const vb = scan.vuln_breakdown || {};
  return (
    <div className="anim-scaleIn" style={{
      position: "fixed", top: 0, right: 0, width: 480, height: "100vh",
      background: C.bgCard, borderLeft: `1px solid ${C.border}`,
      overflowY: "auto", zIndex: 90, padding: "22px",
      boxShadow: "-20px 0 60px #00000055",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 12, color: C.inkMid, marginBottom: 4 }}>{scan.repo_name}</div>
          <div style={{ fontFamily: C.mono, fontSize: 14, color: C.ink }}>{scan.commit_sha}</div>
        </div>
        <button onClick={onClose} style={{ background: C.bgSurface, border: `1px solid ${C.border}`, borderRadius: 8, cursor: "pointer", color: C.inkMid, padding: 6 }}><X size={16} /></button>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <ActionBadge action={scan.action_taken} />
        {scan.severity && <Badge color={severityColor(scan.severity)}>{scan.severity}</Badge>}
        <StatusDot status={scan.status} />
        <span style={{ fontSize: 11, color: C.inkMid }}>{scan.status}</span>
      </div>
      <Card style={{ marginBottom: 12 }}>
        <SectionTitle>Commit Info</SectionTitle>
        <div style={{ fontSize: 13, color: C.ink, marginBottom: 8, lineHeight: 1.5 }}>{scan.commit_message || "—"}</div>
        <div style={{ display: "flex", gap: 16, fontSize: 11, color: C.inkMid, flexWrap: "wrap" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><User size={10} />{scan.author || "—"}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><GitBranch size={10} />{scan.branch || "—"}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={10} />{fmtDur(scan.duration_ms)}</span>
        </div>
      </Card>
      {vb.total > 0 && (
        <Card style={{ marginBottom: 12 }}>
          <SectionTitle accent={blocked ? C.red : C.teal}>Vulnerability Breakdown</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 10 }}>
            {[
              { label: "Total",   val: vb.total,          color: C.ink   },
              { label: "App",     val: vb.app_count || 0, color: C.amber },
              { label: "Fixable", val: vb.fixable_count || 0, color: C.teal },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ textAlign: "center", background: C.bgSurface, borderRadius: 10, padding: "10px 8px" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color, fontFamily: C.mono }}>{val}</div>
                <div style={{ fontSize: 9, color: C.inkLow, letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</div>
              </div>
            ))}
          </div>
          <VulnBreakdown breakdown={vb} />
        </Card>
      )}
      {blocked && <FixDiffView scan={scan} />}
      <Card style={{ marginBottom: 12 }}>
        <SectionTitle accent={C.blue}>Pipeline Stages</SectionTitle>
        <PipelineLogView scan={scan} />
      </Card>
      <AIPanel scan={scan} feedback={feedback} onFeedback={onFeedback} onOpenWhyBlocked={onWhyBlocked} />
      {blocked && (
        <button onClick={onWhyBlocked} style={{
          width: "100%", padding: "12px", borderRadius: 10, fontSize: 13, fontWeight: 700, marginTop: 12,
          background: C.redSoft, border: `1px solid ${C.redBord}`, color: C.red,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          <ShieldAlert size={14} /> Why was this blocked?
        </button>
      )}
    </div>
  );
}

// ─── AI Copilot Sidebar ───────────────────────────────────────────────────────


const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
const GEMINI_URL =`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
// ─────────────────────────────────────────────────────────────────────────────

function AICopilot({ scans, pastScans = [], backendStats = {} }) {
  //
  // pastScans   — array of historical scan objects (same shape as `scans`)
  //               e.g. fetched from your DB / API for the last 30 days
  //
  // backendStats — freeform object from your backend, e.g.:
  //   {
  //     totalScansAllTime: 1240,
  //     avgRiskLast30d: 3.1,
  //     mostVulnerableRepo: "abhienix/SecureFlow",
  //     topCVEs: ["CVE-2023-43804", "CVE-2024-37891"],
  //     openIssues: 14,
  //   }

  const [messages,  setMessages]  = useState([]);
  const [input,     setInput]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [isTyping,  setIsTyping]  = useState(true);
  const [greeting,  setGreeting]  = useState("");
  const endRef   = useRef(null);
  const inputRef = useRef(null);

  // ── Live stats from current scans ──────────────────────────────────────────
  const blocked   = scans.filter(s => s.action_taken === "BLOCK");
  const critCount = scans.filter(s => (s.severity || "").toUpperCase() === "CRITICAL").length;
  const running   = scans.filter(s => s.status === "running");
  const avgRisk   = scans.length
    ? (scans.reduce((a, s) => a + (s.risk_score || 0), 0) / scans.length).toFixed(1)
    : "—";

  // ── Past scan stats (historical) ───────────────────────────────────────────
  const pastBlocked   = pastScans.filter(s => s.action_taken === "BLOCK").length;
  const pastAvgRisk   = pastScans.length
    ? (pastScans.reduce((a, s) => a + (s.risk_score || 0), 0) / pastScans.length).toFixed(1)
    : null;
  const pastCritCount = pastScans.filter(
    s => (s.severity || "").toUpperCase() === "CRITICAL"
  ).length;

  // ── Typed greeting ─────────────────────────────────────────────────────────
  useEffect(() => {
    const h = new Date().getHours();
    const greet = h < 12 ? "Morning" : h < 17 ? "Afternoon" : "Evening";
    const topRepo = blocked[0]?.repo_name;
    const summary =
      `${greet}. Here's your security pulse:\n\n` +
      `• ${scans.length} total scans · ${blocked.length} blocked · ${critCount} critical\n` +
      `• Avg risk score ${avgRisk}/10${running.length ? ` · ${running.length} running now` : ""}\n` +
      (topRepo ? `• Top concern: ${topRepo}\n` : "") +
      `\nAsk me anything about your pipeline.`;

    let i = 0;
    setIsTyping(true);
    const iv = setInterval(() => {
      setGreeting(summary.slice(0, ++i));
      if (i >= summary.length) { clearInterval(iv); setIsTyping(false); }
    }, 14);
    return () => clearInterval(iv);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scans.length]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, greeting]);

  // ── Build rich context for Gemini ──────────────────────────────────────────
  const buildContext = (question) => {
    // Current session top blocked repos
    const topBlocked = blocked.slice(0, 5).map(s =>
      `• ${s.repo_name} (${s.severity}) — ${s.ai_explanation?.slice(0, 120) || "no AI note"}`
    ).join("\n") || "none";

    // Current session top risk repos
    const topRisks = [...scans]
      .filter(s => s.risk_score)
      .sort((a, b) => b.risk_score - a.risk_score)
      .slice(0, 3)
      .map(s => `${s.repo_name}: ${s.risk_score}/10`)
      .join(", ") || "none";

    // Historical scan summary
    const historicalSection = pastScans.length > 0 ? [
      "",
      "=== HISTORICAL DATA (past scans) ===",
      `Past scans loaded: ${pastScans.length}`,
      `Past blocked deploys: ${pastBlocked}`,
      `Past critical CVEs: ${pastCritCount}`,
      pastAvgRisk ? `Past avg risk score: ${pastAvgRisk}/10` : "",
    ].filter(Boolean).join("\n") : "";

    // Backend / DB stats section
    const backendSection = Object.keys(backendStats).length > 0 ? [
      "",
      "=== BACKEND / DATABASE STATS ===",
      backendStats.totalScansAllTime   ? `All-time scans: ${backendStats.totalScansAllTime}` : "",
      backendStats.avgRiskLast30d      ? `Avg risk (30d): ${backendStats.avgRiskLast30d}/10` : "",
      backendStats.mostVulnerableRepo  ? `Most vulnerable repo: ${backendStats.mostVulnerableRepo}` : "",
      backendStats.topCVEs?.length     ? `Top CVEs: ${backendStats.topCVEs.join(", ")}` : "",
      backendStats.openIssues != null  ? `Open issues: ${backendStats.openIssues}` : "",
      // Add any extra backendStats fields here
    ].filter(Boolean).join("\n") : "";

    return [
      "You are SecureFlow AI Copilot, a senior DevSecOps assistant embedded in a CI/CD security dashboard.",
      "Be direct, specific, and actionable. Use bullet points for lists. Keep answers under 200 words unless asked for detail.",
      "",
      "=== LIVE DASHBOARD CONTEXT ===",
      `Total scans: ${scans.length}`,
      `Blocked deploys: ${blocked.length}`,
      `Critical severity: ${critCount}`,
      `Average risk score: ${avgRisk}/10`,
      `Running pipelines: ${running.length}`,
      "",
      "Recent blocked repos:",
      topBlocked,
      "",
      `Highest risk repos: ${topRisks}`,
      historicalSection,
      backendSection,
      "",
      "=== USER QUESTION ===",
      question,
    ].join("\n");
  };

  const QUICK_PROMPTS = [
    "What's my biggest risk right now?",
    "Why are deploys being blocked?",
    "Which repo needs attention most?",
    "How do I fix the top CVEs?",
    "Compare current vs historical risk",   // new — uses past data
    "Any trends in my past scans?",         // new — uses past data
  ];

  // ── Send to Gemini ──────────────────────────────────────────────────────────
  const send = useCallback(async (text) => {
    const q = (text || input).trim();
    if (!q || loading) return;
    setMessages(m => [...m, { role: "user", text: q }]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(GEMINI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: buildContext(q) }],
            },
          ],
          generationConfig: {
            maxOutputTokens: 1000,
            temperature: 0.4,
          },
        }),
      });

      const data = await res.json();

      // Gemini response path: candidates[0].content.parts[0].text
      const reply =
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        data?.error?.message ||
        "No response from Gemini.";

      setMessages(m => [...m, { role: "ai", text: reply }]);
    } catch (err) {
      setMessages(m => [
        ...m,
        { role: "ai", text: "Connection error. Check your network or API key." },
      ]);
    }

    setLoading(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, loading, scans, pastScans, backendStats, blocked, critCount, avgRisk, running]);

  const hasMessages = messages.length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 0 }}>

      {/* ── Stats bar ── */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
        gap: 6, marginBottom: 14,
      }}>
        {[
          { label: "Blocked",  value: blocked.length,  color: blocked.length  > 0 ? C.red    : C.teal  },
          { label: "Critical", value: critCount,        color: critCount       > 0 ? C.amber  : C.teal  },
          { label: "Avg Risk", value: `${avgRisk}/10`,  color: parseFloat(avgRisk) >= 7 ? C.red : parseFloat(avgRisk) >= 4 ? C.amber : C.teal },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            background: C.bgSurface, borderRadius: 9,
            border: `1px solid ${C.border}`,
            padding: "8px 10px", textAlign: "center",
          }}>
            <div style={{ fontSize: 15, fontWeight: 900, color, fontFamily: C.mono, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 9, color: C.inkLow, marginTop: 3, letterSpacing: "0.07em" }}>{label.toUpperCase()}</div>
          </div>
        ))}
      </div>

      {/* ── Chat area ── */}
      <div style={{
        flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8,
        paddingBottom: 8, minHeight: 0,
      }}>

        {/* Greeting bubble */}
        <div style={{
          background: C.bgSurface,
          border: `1px solid ${C.tealBord}`, borderRadius: 12,
          padding: "12px 14px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
            <div style={{ width: 20, height: 20, borderRadius: 6, background: C.teal + "25", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={10} color={C.teal} />
            </div>
            <span style={{ fontSize: 9, fontWeight: 800, color: C.teal, letterSpacing: "0.1em" }}>AI COPILOT</span>
            {isTyping && (
              <span style={{ fontSize: 9, color: C.inkLow, display: "flex", alignItems: "center", gap: 3 }}>
                <span className="running-dot" style={{ display: "inline-block", width: 5, height: 5, borderRadius: "50%", background: C.teal }} />
                typing
              </span>
            )}
          </div>
          <pre style={{
            fontSize: 11, color: C.ink, lineHeight: 1.75,
            whiteSpace: "pre-wrap", margin: 0, fontFamily: C.sans,
          }}>
            {greeting}
            {isTyping && <span style={{ opacity: 0.5 }} className="running-dot">▋</span>}
          </pre>
        </div>

        {/* Quick prompts — only if no messages yet */}
        {!hasMessages && !isTyping && (
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ fontSize: 9, color: C.inkLow, letterSpacing: "0.1em", marginBottom: 2 }}>QUICK QUESTIONS</div>
            {QUICK_PROMPTS.map((q, i) => (
              <button
                key={i}
                onClick={() => send(q)}
                style={{
                  textAlign: "left", padding: "8px 11px", borderRadius: 9,
                  fontSize: 11, color: C.inkMid, lineHeight: 1.4,
                  background: C.bgSurface, border: `1px solid ${C.border}`,
                  cursor: "pointer", transition: "all 0.12s",
                  display: "flex", alignItems: "center", gap: 7,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.tealBord; e.currentTarget.style.color = C.ink; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.inkMid; }}
              >
                <ArrowRight size={9} color={C.teal} style={{ flexShrink: 0 }} />
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Conversation messages */}
        {messages.map((m, i) => (
          <div
            key={i}
            className="anim-fadeUp"
            style={{
              padding: "10px 13px", borderRadius: 11, fontSize: 12, lineHeight: 1.65,
              background: m.role === "user" ? C.bgSurface : C.bgSurface,
              border: `1px solid ${m.role === "user" ? C.blue + "30" : C.border}`,
              color: C.ink,
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "92%",
            }}
          >
            {m.role === "ai" && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                <Sparkles size={9} color={C.teal} />
                <span style={{ fontSize: 9, color: C.teal, fontWeight: 800, letterSpacing: "0.08em" }}>AI COPILOT</span>
              </div>
            )}
            <div style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>
          </div>
        ))}

        <div ref={endRef} />
      </div>

      {/* ── Typing indicator — sits ABOVE input bar, not inside chat ── */}
      {loading && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "8px 13px",
          borderTop: `1px solid ${C.border}`,
          fontSize: 11, color: C.inkMid,
        }}>
          <Loader2 size={11} className="spin" color={C.teal} />
          Analyzing your pipeline…
        </div>
      )}

      {/* ── Input bar ── */}
      <div style={{
        paddingTop: 10, borderTop: `1px solid ${C.border}`,
        display: "flex", gap: 7, alignItems: "flex-end",
      }}>
        <div style={{ flex: 1, position: "relative" }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Ask about your pipeline…"
            rows={1}
            style={{
              width: "100%", resize: "none",
              background: C.bgSurface, border: `1px solid ${C.border}`,
              borderRadius: 10, padding: "9px 12px",
              fontSize: 12, color: C.ink, outline: "none",
              lineHeight: 1.5, fontFamily: C.sans,
              maxHeight: 100, overflowY: "auto",
              boxSizing: "border-box",
            }}
            onInput={e => {
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px";
            }}
          />
        </div>
        <button
          onClick={() => send()}
          disabled={loading || !input.trim()}
          title="Send (Enter)"
          style={{
            background: input.trim() && !loading ? C.teal : C.bgSurface,
            border: `1px solid ${input.trim() && !loading ? C.teal : C.border}`,
            borderRadius: 10, padding: "9px 13px",
            color: input.trim() && !loading ? C.bg : C.inkLow,
            fontWeight: 700, fontSize: 12, cursor: input.trim() && !loading ? "pointer" : "default",
            transition: "all 0.15s", flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          {loading ? <Loader2 size={13} className="spin" /> : <ArrowRight size={13} />}
        </button>
      </div>
      <div style={{ fontSize: 9, color: C.inkLow, textAlign: "right", paddingTop: 5 }}>
        Enter to send · Shift+Enter for newline
      </div>
    </div>
  );
}

// ─── Severity Donut ───────────────────────────────────────────────────────────
function SeverityDonut({ scans, activeSev, onSelect }) {
  const counts = useMemo(() => {
    const c = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, CLEAN: 0 };
    scans.forEach(s => { const k = (s.severity || "").toUpperCase(); if (k in c) c[k]++; });
    return c;
  }, [scans]);
  const data = Object.entries(counts).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value, color: severityColor(name) }));
  if (!data.length) return <EmptyChart />;
  return (
    <div>
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={42} outerRadius={68} paddingAngle={2} dataKey="value"
            onClick={entry => onSelect(activeSev === entry.name ? null : entry.name)} cursor="pointer">
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} opacity={activeSev && activeSev !== d.name ? 0.25 : 1}
                stroke={activeSev === d.name ? d.color : "none"} strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip contentStyle={TT} />
        </PieChart>
      </ResponsiveContainer>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
        {data.map(d => (
          <button key={d.name} onClick={() => onSelect(activeSev === d.name ? null : d.name)} style={{
            display: "flex", alignItems: "center", gap: 5, padding: "3px 8px",
            borderRadius: 999, fontSize: 10, cursor: "pointer", fontFamily: C.mono,
            background: activeSev === d.name ? d.color + "25" : "none",
            border: `1px solid ${activeSev === d.name ? d.color : C.border}`,
            color: activeSev === d.name ? d.color : C.inkMid,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: d.color }} />
            {d.name} ({d.value})
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Repo Health ──────────────────────────────────────────────────────────────
const useRepoHealth = (scans) => useMemo(() => {
  const byRepo = {};
  scans.forEach(s => {
    const key = s.repo_name || "unknown";
    if (!byRepo[key]) byRepo[key] = [];
    byRepo[key].push(s);
  });
  return Object.entries(byRepo).map(([repo, list]) => {
    const completed = list.filter(s => s.status !== "running");
    const blockedList = completed.filter(s => s.action_taken === "BLOCK");
    const avgRisk = completed.length ? completed.reduce((a, s) => a + (s.risk_score || 0), 0) / completed.length : 0;
    const openCves = completed.reduce((a, s) => a + (s.vuln_breakdown?.fixable_count || 0), 0);
    const last = [...list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    const blockRate = completed.length ? blockedList.length / completed.length : 0;
    const health = Math.max(0, Math.min(100, Math.round(100 - blockRate * 40 - avgRisk * 6)));
    const grade = health >= 90 ? "A+" : health >= 80 ? "A" : health >= 65 ? "B" : health >= 50 ? "C" : "D";
    return { repo, health, grade, lastScan: last?.created_at, openCves, totalScans: list.length };
  }).sort((a, b) => b.health - a.health);
}, [scans]);

const healthColor = (h) => h >= 80 ? C.teal : h >= 50 ? C.amber : C.red;

const RepoHealthCard = ({ repo, health, grade, lastScan, openCves, totalScans, onClick }) => {
  const color = healthColor(health);
  return (
    <div onClick={onClick} style={{
      background: C.bgCard, borderRadius: 12, border: `1px solid ${C.border}`,
      padding: "14px 16px", position: "relative", overflow: "hidden", cursor: "pointer",
      transition: "all 0.15s",
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = C.borderBright; e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = "none"; }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: color }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div style={{ paddingLeft: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: C.ink, marginBottom: 2 }}>{repo}</div>
          <div style={{ fontSize: 9, color: C.inkLow, display: "flex", alignItems: "center", gap: 4 }}>
            <Clock size={9} /> Last {relTime(lastScan)}
          </div>
        </div>
        <Badge color={color}>{grade}</Badge>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, paddingLeft: 8 }}>
        <div style={{ flex: 1, height: 6, background: C.bgSurface, borderRadius: 4, overflow: "hidden" }}>
          <div style={{ width: `${health}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.8s ease" }} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 800, color, fontFamily: C.mono }}>{health}%</span>
      </div>
      <div style={{ display: "flex", gap: 12, fontSize: 10, color: C.inkMid, paddingLeft: 8 }}>
        <span>Open CVEs <strong style={{ color: openCves > 0 ? C.amber : C.teal }}>{openCves}</strong></span>
        <span>Scans <strong style={{ color: C.ink }}>{totalScans}</strong></span>
      </div>
    </div>
  );
};

// ─── Filter Bar ───────────────────────────────────────────────────────────────
const FilterBar = ({ filters, setFilters }) => {
  const severities = ["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW", "CLEAN"];
  const statuses   = ["ALL", "ALLOW", "BLOCK"];
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
      <Filter size={12} color={C.inkLow} />
      <div style={{ display: "flex", gap: 4 }}>
        {statuses.map(s => (
          <button key={s} onClick={() => setFilters(f => ({ ...f, action: s }))} style={{
            padding: "4px 10px", borderRadius: 7, border: `1px solid ${filters.action === s ? C.tealBord : C.border}`,
            background: filters.action === s ? C.tealSoft : C.bgSurface,
            color: filters.action === s ? C.teal : C.inkMid,
            cursor: "pointer", fontSize: 10, fontWeight: 700, fontFamily: C.mono,
          }}>{s}</button>
        ))}
      </div>
      <div style={{ width: 1, height: 16, background: C.border }} />
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {severities.map(s => (
          <button key={s} onClick={() => setFilters(f => ({ ...f, severity: s }))} style={{
            padding: "4px 10px", borderRadius: 7,
            border: `1px solid ${filters.severity === s ? (severityColor(s) + "40") : C.border}`,
            background: filters.severity === s ? (severityColor(s) + "15") : C.bgSurface,
            color: filters.severity === s ? severityColor(s) : C.inkMid,
            cursor: "pointer", fontSize: 10, fontWeight: 700, fontFamily: C.mono,
          }}>{s}</button>
        ))}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// OVERVIEW TAB
// ═══════════════════════════════════════════════════════════════════════════
function OverviewTab({ scans, healthScore, avgRisk, blocked, allowed, withAI, accuracyPct, feedbackCounts, trendData, weekData, sevFilter, onSevSelect, onFilterRepo, feedback, onFeedback, onOpenWhyBlocked }) {
  const repoHealth = useRepoHealth(scans);

  const topRisks = useMemo(() => {
    const tally = {};
    scans.forEach(s => {
      (s.vuln_breakdown?.fixable_details || []).forEach(v => {
        const key = v.package || v.id || "unknown";
        if (!tally[key]) tally[key] = { name: key, count: 0, maxCvss: 0 };
        tally[key].count++;
        tally[key].maxCvss = Math.max(tally[key].maxCvss, v.cvss || 0);
      });
    });
    return Object.values(tally).sort((a, b) => b.maxCvss - a.maxCvss).slice(0, 5);
  }, [scans]);

  return (
    <>
      {/* Health hero */}
      <div className="anim-fadeUp" style={{
        background: `linear-gradient(135deg, ${C.tealDim}80, ${C.blueDim}90)`,
        border: `1px solid ${C.tealBord}`, borderRadius: 16, padding: "24px 28px", marginBottom: 18,
        display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap",
      }}>
        <HealthRing score={healthScore} size={130} />
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: C.teal, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>⚡ Security Health</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: C.ink, letterSpacing: "-0.04em", lineHeight: 1.1, marginBottom: 6 }}>{scans.length} pipelines scanned</div>
          <div style={{ fontSize: 12, color: C.inkMid, display: "flex", flexDirection: "column", gap: 4 }}>
            <span><span style={{ color: C.teal }}>✓</span> {allowed.length} deployed successfully</span>
            <span><span style={{ color: C.red }}>✗</span> {blocked.length} blocked by policy</span>
            <span><span style={{ color: C.violet }}>⚡</span> {withAI.length} AI-analyzed</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {[
            { label: "AVG RISK",    value: `${avgRisk}`, unit: "/10", color: riskColor(avgRisk)  },
            { label: "BLOCK RATE",  value: scans.length ? `${Math.round(blocked.length/scans.length*100)}%` : "0%", color: C.red    },
            { label: "AI ACCURACY", value: accuracyPct !== null ? `${accuracyPct}%` : "—", color: C.violet },
          ].map(m => (
            <div key={m.label} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: "10px 16px", border: `1px solid ${C.border}`, textAlign: "center", minWidth: 78 }}>
              <div style={{ fontSize: 9, color: C.inkLow, fontWeight: 800, letterSpacing: "0.1em", marginBottom: 5 }}>{m.label}</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: m.color, fontFamily: C.mono }}>{m.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10, marginBottom: 16 }}>
        {[
          { icon: Activity,      label: "Total Scans",   value: scans.length,     color: C.blue   },
          { icon: CheckCircle,   label: "Allowed",       value: allowed.length,   color: C.teal   },
          { icon: XCircle,       label: "Blocked",       value: blocked.length,   color: C.red    },
          { icon: AlertTriangle, label: "Critical CVEs", value: scans.filter(s => (s.severity||"").toUpperCase()==="CRITICAL").length, color: C.amber },
          { icon: Cpu,           label: "Avg Risk",      value: `${avgRisk}/10`,  color: C.violet },
          { icon: Zap,           label: "AI Analyzed",   value: withAI.length,    color: C.violet },
        ].map((s, i) => <div key={s.label} style={{ animationDelay: `${i * 0.05}s` }}><StatCard {...s} /></div>)}
      </div>

      {/* Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12, marginBottom: 16 }}>
        <Card>
          <SectionTitle accent={C.blue}>Risk Score Trend</SectionTitle>
          {trendData.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <defs><linearGradient id="rg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.teal} stopOpacity={0.3} /><stop offset="95%" stopColor={C.teal} stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" stroke={C.inkLow} tick={{ fontSize: 9, fill: C.inkMid }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis stroke={C.inkLow} tick={{ fontSize: 9, fill: C.inkMid }} tickLine={false} axisLine={false} domain={[0,10]} />
                <Tooltip contentStyle={TT} formatter={v => [`${v}/10`, "Risk"]} />
                <Area type="monotone" dataKey="risk" stroke={C.teal} strokeWidth={2.5} fill="url(#rg)" dot={{ r: 2.5, fill: C.teal, stroke: C.bgCard, strokeWidth: 1.5 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card>
          <SectionTitle accent={C.amber}>Deployments Over Time</SectionTitle>
          {weekData.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={weekData} barSize={12} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" stroke={C.inkLow} tick={{ fontSize: 9, fill: C.inkMid }} tickLine={false} axisLine={false} />
                <YAxis stroke={C.inkLow} tick={{ fontSize: 9, fill: C.inkMid }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={TT} />
                <Bar dataKey="allowed" fill={C.teal} radius={[3,3,0,0]} name="Allowed" stackId="a" />
                <Bar dataKey="blocked" fill={C.red}  radius={[3,3,0,0]} name="Blocked" stackId="a" />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 10, color: C.inkMid }} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card>
          <SectionTitle accent={C.violet}>Severity Breakdown</SectionTitle>
          <SeverityDonut scans={scans} activeSev={sevFilter} onSelect={onSevSelect} />
        </Card>
      </div>

      {/* AI insights row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12, marginBottom: 16 }}>
        <Card>
          <SectionTitle accent={C.teal}>AI Feedback</SectionTitle>
          {feedbackCounts.total === 0
            ? <EmptyState text="Mark analyses as accurate or incorrect to see stats" />
            : [
              { label: "Accurate", value: feedbackCounts.accurate, color: C.teal,  Icon: ThumbsUp   },
              { label: "Incorrect",value: feedbackCounts.incorrect,color: C.red,   Icon: ThumbsDown },
            ].map(({ label, value, color, Icon }) => {
              const pct = feedbackCounts.total ? Math.round(value / feedbackCounts.total * 100) : 0;
              return (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <Icon size={13} color={color} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: C.inkMid, width: 60, flexShrink: 0 }}>{label}</span>
                  <div style={{ flex: 1, height: 7, background: C.bgSurface, borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.4s ease" }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.ink, width: 24, textAlign: "right", flexShrink: 0 }}>{value}</span>
                </div>
              );
            })
          }
        </Card>
        <Card>
          <SectionTitle accent={C.red}>Riskiest Packages</SectionTitle>
          {topRisks.length === 0
            ? <EmptyState text="No fixable vulnerabilities detected" />
            : topRisks.map(r => {
              const maxCvss = Math.max(1, ...topRisks.map(x => x.maxCvss));
              return (
                <div key={r.name} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 11, fontFamily: C.mono, color: C.inkMid, width: 100, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
                  <div style={{ flex: 1, height: 7, background: C.bgSurface, borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: `${(r.maxCvss/maxCvss)*100}%`, height: "100%", background: riskColor(r.maxCvss), borderRadius: 4, transition: "width 0.4s ease" }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.ink, width: 32, textAlign: "right", flexShrink: 0 }}>{r.maxCvss.toFixed(1)}</span>
                </div>
              );
            })
          }
        </Card>
        <Card>
          <SectionTitle accent={C.violet}>AI Confidence</SectionTitle>
          {accuracyPct === null
            ? <EmptyState text="Mark 3+ analyses to see confidence score" />
            : <>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{ flex: 1, height: 10, background: C.bgSurface, borderRadius: 5, overflow: "hidden" }}>
                  <div style={{ width: `${accuracyPct}%`, height: "100%", background: accuracyPct >= 80 ? C.teal : accuracyPct >= 60 ? C.amber : C.red, borderRadius: 5, transition: "width 0.6s ease" }} />
                </div>
                <span style={{ fontSize: 18, fontWeight: 800, fontFamily: C.mono, color: accuracyPct >= 80 ? C.teal : accuracyPct >= 60 ? C.amber : C.red }}>{accuracyPct}%</span>
              </div>
              <Badge color={accuracyPct >= 80 ? C.teal : accuracyPct >= 60 ? C.amber : C.red} small>
                {accuracyPct >= 80 ? "High" : accuracyPct >= 60 ? "Moderate" : "Low"} confidence
              </Badge>
            </>
          }
        </Card>
      </div>

      {/* Recent AI analyses */}
      <Card style={{ marginBottom: 14 }}>
        <SectionTitle accent={C.violet}>Recent AI Analyses</SectionTitle>
        {withAI.length === 0
          ? <EmptyState text="No AI-analyzed scans yet" />
          : withAI.slice(0, 6).map((scan, i) => (
            <CommitCard
              key={scan.id}
              scan={scan}
              feedback={feedback}
              onFeedback={onFeedback}
              onOpenWhyBlocked={onOpenWhyBlocked}
              delay={i * 0.05}
              defaultExpanded={i === 0}
            />
          ))
        }
      </Card>

      {/* Repo health */}
      <Card style={{ marginBottom: 14 }}>
        <SectionTitle accent={C.blue}>Repository Health</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 10 }}>
          {repoHealth.map(r => <RepoHealthCard key={r.repo} {...r} onClick={() => onFilterRepo(r.repo)} />)}
        </div>
      </Card>

      {/* Threat intel */}
      <Card>
        <SectionTitle accent={C.amber}>Live Threat Intel</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {THREAT_FEED_DATA.map(t => (
            <div key={t.id} style={{ background: C.bgSurface, borderRadius: 10, padding: "10px 14px", border: `1px solid ${C.border}`, display: "flex", gap: 10, alignItems: "flex-start" }}>
              <Flame size={12} color={severityColor(t.level)} style={{ marginTop: 2, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: C.ink, lineHeight: 1.5, marginBottom: 4 }}>{t.title}</div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Badge color={severityColor(t.level)} small>{t.level}</Badge>
                  <span style={{ fontSize: 9, color: C.inkLow }}>{t.source}</span>
                  <span style={{ fontSize: 9, color: C.inkLow, marginLeft: "auto" }}>{t.time}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PIPELINE TAB
// ═══════════════════════════════════════════════════════════════════════════
function PipelineTab({ scans, onOpenWhyBlocked, onSelectScan }) {
  const running = scans.filter(s => s.status === "running");
  const rest    = scans.filter(s => s.status !== "running").slice(0, 20);

  return (
    <div>
      {running.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.blue, display: "inline-block", animation: "pulseBlue 1.4s ease-out infinite" }} />
            <span style={{ fontSize: 12, fontWeight: 800, color: C.blue, letterSpacing: "0.08em" }}>LIVE — {running.length} running</span>
          </div>
          {running.map((scan, i) => (
            <Card key={scan.id} glow style={{ borderLeft: `3px solid ${C.blue}`, animation: `fadeUp 0.2s ease ${i * 0.1}s both` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <StatusDot status="running" />
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.ink }}>{scan.repo_name}</span>
                  <span style={{ fontFamily: C.mono, fontSize: 11, color: C.blue }}>{scan.commit_sha?.slice(0,8)}</span>
                  <Badge color={C.blue}><Loader2 size={9} className="spin" /> SCANNING</Badge>
                </div>
                <span style={{ fontSize: 10, color: C.inkLow }}>{relTime(scan.created_at)}</span>
              </div>
              <PipelineLogView scan={scan} />
              <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, background: C.blueSoft, border: `1px solid ${C.blue}30`, fontSize: 11, color: C.blue }}>
                Pipeline in progress — auto-refreshing every 10s
              </div>
            </Card>
          ))}
        </div>
      )}

      {rest.map((scan, i) => (
        <Card key={scan.id} style={{ animation: `fadeUp 0.2s ease ${i * 0.03}s both` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <StatusDot status={scan.status} />
              <span style={{ fontSize: 12, fontWeight: 700, color: C.ink }}>{scan.repo_name}</span>
              <span style={{ fontFamily: C.mono, fontSize: 11, color: C.blue }}>{scan.commit_sha?.slice(0,8)}</span>
              <ActionBadge action={scan.action_taken} />
              {scan.severity && <Badge color={severityColor(scan.severity)} small>{scan.severity}</Badge>}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
              <span style={{ fontSize: 10, color: C.inkLow }}>{relTime(scan.created_at)}</span>
              <button onClick={() => onSelectScan(scan)} style={{ fontSize: 10, color: C.teal, background: C.tealSoft, border: `1px solid ${C.tealBord}`, borderRadius: 7, padding: "4px 10px", cursor: "pointer" }}>Details →</button>
              {scan.action_taken === "BLOCK" && (
                <button onClick={() => onOpenWhyBlocked(scan)} style={{
                  display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 7,
                  border: `1px solid ${C.redBord}`, background: C.redSoft, color: C.red,
                  cursor: "pointer", fontSize: 10, fontWeight: 700,
                }}>
                  <AlertTriangle size={10} /> Why blocked?
                </button>
              )}
            </div>
          </div>
          {/* Mini nodes */}
          <PipelineMiniNodes pipeline={scan.pipeline} />
          {/* Full stage breakdown */}
          <PipelineLogView scan={scan} />
          {scan.ai_explanation && (
            <div style={{ marginTop: 10, padding: "9px 12px", borderRadius: 9, background: C.violetSoft, border: `1px solid ${C.violetBord}`, fontSize: 11, color: C.inkMid, lineHeight: 1.6 }}>
              <span style={{ fontSize: 8, color: C.violet, fontWeight: 800, letterSpacing: "0.1em", marginRight: 6 }}>⚡ AI</span>
              {scan.ai_explanation.slice(0, 220)}{scan.ai_explanation.length > 220 ? "…" : ""}
            </div>
          )}
        </Card>
      ))}
      {scans.length === 0 && <EmptyState text="No pipeline data yet — push a commit to get started" />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SCAN FEED TAB
// ═══════════════════════════════════════════════════════════════════════════
function ScanFeedTab({ scans, onSelect, feedback, onFeedback, onOpenWhyBlocked, initialSeverity }) {
  const [filters, setFilters] = useState({ action: "ALL", severity: initialSeverity || "ALL" });
  const [search, setSearch]   = useState("");
  const [viewMode, setViewMode] = useState("cards");

  useEffect(() => {
    if (initialSeverity) setFilters(f => ({ ...f, severity: initialSeverity }));
  }, [initialSeverity]);

  const filtered = useMemo(() => scans.filter(s => {
    if (filters.action !== "ALL" && s.action_taken !== filters.action) return false;
    if (filters.severity !== "ALL" && (s.severity || "").toUpperCase() !== filters.severity) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (![s.repo_name, s.branch, s.commit_sha, s.severity, s.action_taken, s.commit_message].some(v => String(v||"").toLowerCase().includes(q))) return false;
    }
    return true;
  }), [scans, filters, search]);

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={13} color={C.inkLow} style={{ position: "absolute", left: 10, top: 9, pointerEvents: "none" }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search commits, repos, severity…"
            style={{ width: "100%", padding: "7px 10px 7px 30px", borderRadius: 9, border: `1px solid ${C.border}`, fontSize: 12, outline: "none", background: C.bgCard, color: C.ink, boxSizing: "border-box" }}
          />
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {["cards","full"].map(m => (
            <button key={m} onClick={() => setViewMode(m)} style={{
              padding: "4px 12px", borderRadius: 7, fontSize: 10, fontWeight: 700, cursor: "pointer",
              background: viewMode === m ? C.tealSoft : C.bgSurface,
              border: `1px solid ${viewMode === m ? C.tealBord : C.border}`,
              color: viewMode === m ? C.teal : C.inkMid,
            }}>{m === "cards" ? "Feed" : "Full"}</button>
          ))}
        </div>
      </div>
      <FilterBar filters={filters} setFilters={setFilters} />
      <div style={{ fontSize: 11, color: C.inkLow, marginBottom: 12 }}>{filtered.length} scan{filtered.length !== 1 ? "s" : ""} matched</div>

      {filtered.length === 0
        ? <Card style={{ textAlign: "center", padding: 40, color: C.inkLow }}>No scans match current filters.</Card>
        : viewMode === "full"
          ? filtered.map((scan, i) => (
              <CommitCard key={scan.id} scan={scan} feedback={feedback} onFeedback={onFeedback} onOpenWhyBlocked={onOpenWhyBlocked} delay={Math.min(i, 10) * 0.04} />
            ))
          : filtered.map((s, idx) => (
            <div key={s.id} onClick={() => onSelect(s)} className="anim-fadeUp" style={{
              background: C.bgCard, border: `1px solid ${C.border}`,
              borderLeft: `3px solid ${s.action_taken === "BLOCK" ? C.red : C.teal}`,
              borderRadius: 12, padding: "12px 14px", marginBottom: 8, cursor: "pointer",
              animationDelay: `${Math.min(idx, 10) * 0.04}s`,
              transition: "border-color 0.15s, transform 0.15s",
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.borderBright; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = "none"; }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 5 }}>
                <div style={{ display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
                  <StatusDot status={s.status} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.ink }}>{s.repo_name}</span>
                  <ActionBadge action={s.action_taken} />
                  {s.severity && <Badge color={severityColor(s.severity)} small>{s.severity}</Badge>}
                </div>
                <span style={{ fontSize: 10, color: C.inkLow, whiteSpace: "nowrap" }}>{relTime(s.created_at)}</span>
              </div>
              <div style={{ fontSize: 11, color: C.inkMid, marginBottom: 5 }}>{s.commit_message || "—"}</div>
              <div style={{ display: "flex", gap: 10, fontSize: 10, color: C.inkLow, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 3 }}><User size={9} />{s.author || "—"}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 3 }}><GitBranch size={9} />{s.branch || "—"}</span>
                <span style={{ fontFamily: C.mono }}>{s.commit_sha?.slice(0,8)}</span>
                {s.ai_confidence && <span style={{ marginLeft: "auto" }}><ConfidencePip value={s.ai_confidence} /></span>}
              </div>
              {s.risk_score != null && <RiskBar score={s.risk_score} />}
              <PipelineMiniNodes pipeline={s.pipeline} />
            </div>
          ))
      }
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// METRICS TAB
// ═══════════════════════════════════════════════════════════════════════════
function MetricsTab({ scans, trendData, weekData, sevData, gateData, avgRisk, withAI, blocked, allowed }) {
  const byDay = useMemo(() => {
    const map = {};
    scans.forEach(s => {
      const day = s.created_at?.slice(0, 10);
      if (!day) return;
      if (!map[day]) map[day] = { date: day, scans: 0, blocked: 0, allowed: 0 };
      map[day].scans++;
      if (s.action_taken === "BLOCK") map[day].blocked++; else map[day].allowed++;
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date)).slice(-14);
  }, [scans]);

  const byScanType = useMemo(() => {
    const map = {};
    scans.forEach(s => {
      const k = s.scan_type || "full-pipeline";
      if (!map[k]) map[k] = 0;
      map[k]++;
    });
    return Object.entries(map).map(([name, value]) => ({ name: name.replace(/-/g, " "), value })).sort((a, b) => b.value - a.value);
  }, [scans]);

  const highRisk = scans.filter(s => (s.risk_score || 0) >= 7).length;
  const blockRate = scans.length ? Math.round(blocked.length / scans.length * 100) : 0;

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginBottom: 16 }}>
        {[
          { icon: Activity,      label: "Total Scans",  value: scans.length,    color: C.blue,   sub: "all time" },
          { icon: CheckCircle,   label: "Allowed",      value: allowed.length,  color: C.teal,   sub: "clean deploys" },
          { icon: XCircle,       label: "Blocked",      value: blocked.length,  color: C.red,    sub: `${blockRate}% block rate` },
          { icon: Zap,           label: "AI Analyzed",  value: withAI.length,   color: C.violet, sub: "with AI" },
          { icon: AlertTriangle, label: "High Risk",    value: highRisk,        color: C.amber,  sub: "risk ≥ 7/10" },
          { icon: Cpu,           label: "Avg Risk",     value: `${avgRisk}/10`, color: C.violet, sub: "mean score" },
        ].map(s => <StatCard key={s.label} {...s} />)}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <Card>
          <SectionTitle accent={C.blue}>Risk Score Over Time</SectionTitle>
          {trendData.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <defs><linearGradient id="rg2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.teal} stopOpacity={0.3} /><stop offset="95%" stopColor={C.teal} stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" stroke={C.inkLow} tick={{ fontSize: 9, fill: C.inkMid }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis stroke={C.inkLow} tick={{ fontSize: 9, fill: C.inkMid }} tickLine={false} axisLine={false} domain={[0,10]} />
                <Tooltip contentStyle={TT} formatter={v => [`${v}/10`, "Risk Score"]} />
                <Area type="monotone" dataKey="risk" stroke={C.teal} strokeWidth={2.5} fill="url(#rg2)" dot={{ r: 3, fill: C.teal, stroke: C.bgCard, strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card>
          <SectionTitle accent={C.red}>Allow vs Block</SectionTitle>
          {gateData.length === 0 ? <EmptyChart /> : (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={gateData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} dataKey="value" strokeWidth={3} stroke={C.bgCard} paddingAngle={3}>
                    {gateData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip contentStyle={TT} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", justifyContent: "center", gap: 20, fontSize: 11, color: C.inkMid }}>
                {gateData.map(d => (
                  <span key={d.name} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: d.color, display: "inline-block" }} />
                    {d.name} <strong style={{ color: C.ink }}>{d.value}</strong>
                  </span>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      <Card style={{ marginBottom: 12 }}>
        <SectionTitle accent={C.amber}>Severity Distribution</SectionTitle>
        {sevData.length === 0 ? <EmptyChart /> : (
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={sevData} barSize={32} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" stroke={C.inkLow} tick={{ fontSize: 11, fill: C.inkMid }} tickLine={false} axisLine={false} />
              <YAxis stroke={C.inkLow} tick={{ fontSize: 10, fill: C.inkMid }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={TT} formatter={v => [v, "scans"]} />
              <Bar dataKey="v" radius={[6,6,0,0]} name="Count">{sevData.map((d, i) => <Cell key={i} fill={d.color} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card style={{ marginBottom: 12 }}>
        <SectionTitle accent={C.blue}>Daily Scan Volume (last 14 days)</SectionTitle>
        {byDay.length === 0 ? <EmptyChart /> : (
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={byDay} barSize={12} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" stroke={C.inkLow} tick={{ fontSize: 9, fill: C.inkMid }} tickLine={false} axisLine={false} />
              <YAxis stroke={C.inkLow} tick={{ fontSize: 9, fill: C.inkMid }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={TT} />
              <Bar dataKey="allowed" fill={C.teal} radius={[3,3,0,0]} name="Allowed" stackId="a" />
              <Bar dataKey="blocked" fill={C.red}  radius={[3,3,0,0]} name="Blocked" stackId="a" />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 10, color: C.inkMid }} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card>
        <SectionTitle accent={C.violet}>Scans by Type</SectionTitle>
        {byScanType.length === 0 ? <EmptyChart /> : (
          <ResponsiveContainer width="100%" height={Math.max(120, byScanType.length * 36)}>
            <BarChart data={byScanType} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
              <XAxis type="number" tick={{ fill: C.inkLow, fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: C.inkMid, fontSize: 10 }} width={130} />
              <Tooltip contentStyle={TT} />
              <Bar dataKey="value" fill={C.amber} radius={[0, 4, 4, 0]} name="Scans" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════
export default function App() {
  const [scans,          setScans]          = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [activeTab,      setActiveTab]      = useState(() => lsGet("sf_tab", "overview"));
  const [selectedScan,   setSelectedScan]   = useState(null);
  const [whyBlockedScan, setWhyBlockedScan] = useState(null);
  const [showCopilot,    setShowCopilot]    = useState(false);
  const [sevFilter,      setSevFilter]      = useState(null);
  const [repoFilter,     setRepoFilter]     = useState(null);
  // feedback is persisted to localStorage AND submitted to backend
  const [feedback,       setFeedback]       = useState(() => lsGet("sf_feedback", {}));
  const [lastUpdated,    setLastUpdated]    = useState(null);

  useEffect(() => { lsSet("sf_tab", activeTab); }, [activeTab]);
  useEffect(() => { lsSet("sf_feedback", feedback); }, [feedback]);

  const hasRunning = scans.some(s => s.status === "running");

  const fetchScans = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND}/api/scan-results`, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      const normalised = Array.isArray(data) ? data.map(normaliseScan) : [];
      setScans(normalised);
    } catch (err) {
      console.error("Failed to fetch scans:", err);
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  }, []);

  // Initial fetch
  useEffect(() => { fetchScans(); }, [fetchScans]);

  
  // ── WebSocket for real-time updates ──────────────────────────────────
  // Falls back to polling if WS disconnects or fails.
  const wsRef       = useRef(null);
  const wsAliveRef  = useRef(false);
 
  useEffect(() => {
    const WS_URL = BACKEND.replace(/^https/, "wss").replace(/^http/, "ws") + "/ws/scans";
    let reconnectTimer = null;
    let pollFallback   = null;
 
    function stopPollFallback() {
      if (pollFallback) { clearInterval(pollFallback); pollFallback = null; }
    }
 
    function startPollFallback() {
      if (pollFallback) return; // already running
      pollFallback = setInterval(fetchScans, hasRunning ? 10000 : 30000);
    }
 
    function connect() {
      try {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;
 
        ws.onopen = () => {
          wsAliveRef.current = true;
          stopPollFallback();          // WS is live — kill polling
          console.log("[SecureFlow] WebSocket connected");
        };
 
        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === "ping") return; // keep-alive — ignore
 
            if (msg.type === "scan_started") {
              // Insert a "running" placeholder so the UI shows immediately
              setScans(prev => {
                if (prev.some(s => s.id === msg.run_id)) return prev;
                const placeholder = normaliseScan({
                  id:             msg.run_id,
                  commit_sha:     msg.commit_sha,
                  repo_name:      msg.repo_name,
                  branch:         msg.branch,
                  status:         "running",
                  action_taken:   null,
                  severity:       null,
                  pipeline_steps: {},
                  created_at:     msg.started_at || new Date().toISOString(),
                });
                return [placeholder, ...prev];
              });
            }
 
            if (msg.type === "scan_progress") {
              setScans(prev => prev.map(s =>
                s.id === msg.run_id
                  ? normaliseScan({ ...s, pipeline_steps: msg.pipeline_steps, status: "running" })
                  : s
              ));
            }
 
            if (msg.type === "scan_complete") {
              setScans(prev => {
                const exists = prev.some(s => s.id === msg.id);
                const normalised = normaliseScan(msg);
                return exists
                  ? prev.map(s => s.id === msg.id ? normalised : s)
                  : [normalised, ...prev];
              });
              setLastUpdated(new Date());
            }
          } catch (err) {
            console.warn("[SecureFlow] WS message parse error:", err);
          }
        };
 
        ws.onerror = () => {
          wsAliveRef.current = false;
          startPollFallback();
        };
 
        ws.onclose = () => {
          wsAliveRef.current = false;
          startPollFallback();
          // Reconnect after 5s
          reconnectTimer = setTimeout(connect, 5000);
        };
      } catch (err) {
        console.warn("[SecureFlow] WS init failed, using polling:", err);
        startPollFallback();
      }
    }
 
    connect();
 
    return () => {
      clearTimeout(reconnectTimer);
      stopPollFallback();
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect loop on unmount
        wsRef.current.close();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchScans]); // re-run if fetchScans identity changes (it won't, it's useCallback)
 
  // Keep poll-fallback interval fresh when hasRunning changes
  useEffect(() => {
    if (!wsAliveRef.current) {
      // WS isn't live — nudge the poll interval
      fetchScans();
    }
  }, [hasRunning, fetchScans]);
 
 

  // Escape key closes panels
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") { setWhyBlockedScan(null); setSelectedScan(null); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Submit feedback to backend AND update local state
  const submitFeedback = useCallback(async (scanId, type) => {
    setFeedback(p => ({ ...p, [scanId]: type }));
    try {
      await fetch(`${BACKEND}/api/scan-results/${scanId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: type === "accept" ? "accurate" : "incorrect" }),
      });
    } catch (e) {
      console.warn("Feedback POST failed (local state still saved):", e);
    }
  }, []);

  // ── Derived stats ─────────────────────────────────────────────────────────
  const running   = useMemo(() => scans.filter(s => s.status === "running"),                        [scans]);
  const completed = useMemo(() => scans.filter(s => s.status !== "running"),                         [scans]);
  const blocked   = useMemo(() => completed.filter(s => s.action_taken === "BLOCK"),                 [completed]);
  const allowed   = useMemo(() => completed.filter(s => s.action_taken === "ALLOW"),                 [completed]);
  const withAI    = useMemo(() => completed.filter(s => s.ai_explanation),                           [completed]);
  const avgRisk   = useMemo(() =>
    completed.length ? +(completed.reduce((a,s) => a + (s.risk_score||0), 0) / completed.length).toFixed(1) : 0,
  [completed]);
  const healthScore = useMemo(() => {
    if (!completed.length) return 100;
    return Math.max(0, Math.min(100, Math.round(100 - (blocked.length/completed.length)*40 - avgRisk*6)));
  }, [completed, blocked, avgRisk]);

  const feedbackCounts = useMemo(() => {
    const r = { accurate: 0, incorrect: 0, total: 0 };
    Object.entries(feedback).forEach(([, val]) => {
      if (val === "accept")  { r.accurate++;  r.total++; }
      if (val === "reject")  { r.incorrect++; r.total++; }
    });
    return r;
  }, [feedback]);

  const accuracyPct = feedbackCounts.total >= 3
    ? Math.round((feedbackCounts.accurate / feedbackCounts.total) * 100)
    : null;

  const trendData = useMemo(() =>
    [...scans].filter(s => s.created_at && s.risk_score != null)
      .sort((a,b) => new Date(a.created_at)-new Date(b.created_at))
      .slice(-20)
      .map(s => ({ date: fmt(s.created_at), risk: s.risk_score||0 })),
  [scans]);

  const sevData = useMemo(() =>
    ["CRITICAL","HIGH","MEDIUM","LOW","CLEAN"]
      .map(name => ({ name, v: scans.filter(s => (s.severity||"").toUpperCase()===name).length, color: severityColor(name) }))
      .filter(d => d.v > 0),
  [scans]);

  const gateData = useMemo(() =>
    [
      { name: "Allowed", value: allowed.length, color: C.teal },
      { name: "Blocked", value: blocked.length, color: C.red  },
    ].filter(d => d.value > 0),
  [allowed, blocked]);

  const weekData = useMemo(() => {
    const map = {};
    [...scans].sort((a,b) => new Date(a.created_at)-new Date(b.created_at)).forEach(s => {
      if (!s.created_at) return;
      const d = new Date(s.created_at); if (isNaN(d)) return;
      const key = d.toISOString().slice(0,10);
      if (!map[key]) map[key] = { date: fmt(s.created_at), allowed: 0, blocked: 0 };
      if (s.action_taken === "BLOCK") map[key].blocked++; else map[key].allowed++;
    });
    return Object.values(map).slice(-10);
  }, [scans]);

  const feedScans = repoFilter ? scans.filter(s => s.repo_name === repoFilter) : scans;

  return (
    <>
      {whyBlockedScan && <WhyBlockedModal scan={whyBlockedScan} onClose={() => setWhyBlockedScan(null)} />}

      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        {/* HEADER */}
        <header style={{
          position: "sticky", top: 0, zIndex: 80,
          background: "rgba(8,12,16,0.96)", backdropFilter: "blur(20px)",
          borderBottom: `1px solid ${C.border}`,
          padding: "0 24px", height: 54, display: "flex", alignItems: "center", gap: 14,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginRight: 6 }}>
            <div style={{ background: `linear-gradient(135deg, ${C.teal}, ${C.blue})`, borderRadius: 9, padding: 7, boxShadow: `0 0 20px ${C.teal}35` }}>
              <Shield size={14} color="#fff" strokeWidth={2.5} />
            </div>
            <span style={{ fontWeight: 900, fontSize: 14, letterSpacing: "-0.04em", background: `linear-gradient(90deg, ${C.teal}, ${C.blue})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>SecureFlow</span>
          </div>

          <nav style={{ display: "flex", gap: 2 }}>
            {TABS.map(t => {
              const Icon = t.icon;
              const active = activeTab === t.id;
              return (
                <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "7px 12px",
                  borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
                  background: active ? C.bgSurface : "none", color: active ? C.ink : C.inkMid,
                  transition: "all 0.15s",
                  borderBottom: active ? `2px solid ${C.teal}` : "2px solid transparent",
                }}>
                  <Icon size={13} />{t.label}
                </button>
              );
            })}
          </nav>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            {running.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 999, background: C.blueSoft, border: `1px solid ${C.blue}30`, fontSize: 10, color: C.blue, fontWeight: 700 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.blue, animation: "pulseBlue 1.4s ease-out infinite", display: "inline-block" }} />
                {running.length} running
              </div>
            )}
            {repoFilter && (
              <button onClick={() => setRepoFilter(null)} style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", fontSize: 10, color: C.amber, background: C.amberSoft, border: `1px solid ${C.amberBord}`, borderRadius: 6, cursor: "pointer" }}>
                <X size={10} /> {repoFilter}
              </button>
            )}
            {lastUpdated && <span style={{ fontSize: 9, color: C.inkLow }}>{fmtTime(lastUpdated)}</span>}
            <button onClick={() => setShowCopilot(v => !v)} style={{
              display: "flex", alignItems: "center", gap: 5, padding: "5px 10px",
              background: showCopilot ? C.tealSoft : "none",
              border: `1px solid ${showCopilot ? C.tealBord : C.border}`,
              borderRadius: 8, cursor: "pointer",
              color: showCopilot ? C.teal : C.inkMid, fontSize: 11,
            }}>
              <Sparkles size={12} /> AI Copilot
            </button>
            <button onClick={fetchScans} title="Refresh" style={{ background: "none", border: "none", cursor: "pointer", color: C.inkMid, padding: 6, borderRadius: 6, transition: "color 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.color = C.teal}
              onMouseLeave={e => e.currentTarget.style.color = C.inkMid}>
              <RefreshCw size={14} />
            </button>
          </div>
        </header>

        {/* BODY */}
        <div style={{ flex: 1, display: "flex", maxWidth: 1440, margin: "0 auto", width: "100%", padding: "0 24px" }}>
          <main style={{ flex: 1, paddingTop: 22, paddingBottom: 40, minWidth: 0, paddingRight: showCopilot ? 24 : 0 }}>
            {loading ? (
              <div>{[1,2,3,4].map(i => <SkeletonCard key={i} />)}</div>
            ) : (
              <div className="anim-fadeUp">
                {activeTab === "overview" && (
                  <OverviewTab
                    scans={scans}
                    healthScore={healthScore}
                    avgRisk={avgRisk}
                    blocked={blocked}
                    allowed={allowed}
                    withAI={withAI}
                    accuracyPct={accuracyPct}
                    feedbackCounts={feedbackCounts}
                    trendData={trendData}
                    weekData={weekData}
                    sevFilter={sevFilter}
                    onSevSelect={setSevFilter}
                    onFilterRepo={(repo) => { setRepoFilter(repo); setActiveTab("feed"); }}
                    feedback={feedback}
                    onFeedback={submitFeedback}
                    onOpenWhyBlocked={setWhyBlockedScan}
                  />
                )}
                {activeTab === "pipeline" && (
                  <PipelineTab
                    scans={scans}
                    onOpenWhyBlocked={setWhyBlockedScan}
                    onSelectScan={setSelectedScan}
                  />
                )}
                {activeTab === "feed" && (
                  <ScanFeedTab
                    scans={feedScans}
                    onSelect={setSelectedScan}
                    feedback={feedback}
                    onFeedback={submitFeedback}
                    onOpenWhyBlocked={setWhyBlockedScan}
                    initialSeverity={sevFilter}
                  />
                )}
                {activeTab === "metrics" && (
                  <MetricsTab
                    scans={scans}
                    trendData={trendData}
                    weekData={weekData}
                    sevData={sevData}
                    gateData={gateData}
                    avgRisk={avgRisk}
                    withAI={withAI}
                    blocked={blocked}
                    allowed={allowed}
                  />
                )}
              </div>
            )}
          </main>

          {/* AI Copilot sidebar */}
          {showCopilot && (
            <aside className="anim-fadeUp" style={{
              width: 320, borderLeft: `1px solid ${C.border}`,
              paddingLeft: 20, paddingTop: 22, paddingBottom: 40,
              display: "flex", flexDirection: "column",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <div style={{ background: C.tealSoft, borderRadius: 8, padding: "4px 6px", display: "flex" }}>
                    <Sparkles size={13} color={C.teal} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>AI Copilot</span>
                </div>
                <button onClick={() => setShowCopilot(false)} style={{ background: "none", border: "none", cursor: "pointer", color: C.inkMid }}><X size={14} /></button>
              </div>
              <AICopilot scans={scans} />
            </aside>
          )}
        </div>
      </div>

      {/* Scan detail slide-in */}
      {selectedScan && (
        <ScanDetail
          scan={selectedScan}
          onClose={() => setSelectedScan(null)}
          onWhyBlocked={() => setWhyBlockedScan(selectedScan)}
          feedback={feedback}
          onFeedback={submitFeedback}
        />
      )}
    </>
  );
}
