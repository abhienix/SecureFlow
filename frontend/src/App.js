/**
 * SecureFlow — Final Merged App.jsx
 *
 * BUGS FIXED vs previous version:
 *   1. EmptyChart / EmptyState / Badge / Card / GlassCard / SectionTitle /
 *      Skeleton / SkeletonCard moved ABOVE all components that reference them.
 *   2. Skeleton now accepts and spreads a `style` prop.
 *   3. Duplicate `position:"relative"` on <aside> removed.
 *   4. Pipeline connector line: last segment uses correct stage color.
 *   5. SeverityDonut onSelect no longer auto-navigates.
 *   6. Missing React key props added in NotificationPanel rows.
 *   7. renderNav extracted as useCallback — stable reference across renders.
 *   8. WhyBlockedModal business fallback improved per severity tier.
 *   9. parseFixLines now safely handles scans with no vuln_breakdown.
 *  10. ScanFeed filter badge shows both sev + repo when both are active.
 */

import React, {
  useState, useEffect, useCallback, useRef, useMemo,
} from "react";
import axios from "axios";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  Shield, Activity, CheckCircle, XCircle, AlertTriangle, Zap, Cpu,
  RefreshCw, Bell, Search, Menu, X, ThumbsUp, ThumbsDown, Minus,
  ChevronDown, ChevronUp, Package, Info, GitCommit, Clock, TrendingUp,
  Terminal, Filter, Command, GitPullRequest, Copy, Check, Sparkles,
  ShieldAlert, ShieldCheck, GitBranch, User, Flame, ArrowUpRight,
  ArrowRight, ListChecks, Radio, Loader2,
} from "lucide-react";

// ─── Backend URL ───────────────────────────────────────────────────────────────
const API =
  process.env.REACT_APP_BACKEND_URL ||
  "https://secureflow-backend-1083585992526.us-central1.run.app";

// ─── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:           "#0a0e13",
  bgCard:       "#0f1419",
  bgHover:      "#141c24",
  bgSurface:    "#1a2332",
  bgElevated:   "#1f2d3d",
  border:       "#1e2d3d",
  borderBright: "#2a3f55",
  ink:          "#e2eaf3",
  inkMid:       "#7a92aa",
  inkLow:       "#3d5166",
  teal:         "#00d9a6",
  tealSoft:     "#00d9a618",
  tealBord:     "#00d9a630",
  tealDim:      "#003d2e",
  blue:         "#4da8ff",
  blueSoft:     "#4da8ff15",
  blueDim:      "#0a2040",
  green:        "#2ecc71",
  red:          "#ff4d6a",
  redSoft:      "#ff4d6a12",
  redBord:      "#8a1a2e",
  amber:        "#ffb347",
  amberSoft:    "#ffb34712",
  amberBord:    "#7a4a00",
  violet:       "#9d7fea",
  violetSoft:   "#9d7fea12",
  violetBord:   "#4a2a8a",
  mono: "'JetBrains Mono','Fira Mono','Consolas',monospace",
  sans: "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
};

const TABS = [
  { id: "overview", label: "Overview",  icon: Activity   },
  { id: "pipeline", label: "Pipeline",  icon: GitCommit  },
  { id: "feed",     label: "Scan Feed", icon: ListChecks },
  { id: "metrics",  label: "Metrics",   icon: TrendingUp },
];

// ─── Formatters ────────────────────────────────────────────────────────────────
const fmt     = (iso) => { if (!iso) return "—"; const d = new Date(iso); return isNaN(d) ? "—" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }); };
const fmtFull = (iso) => { if (!iso) return "—"; const d = new Date(iso); return isNaN(d) ? "—" : d.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); };
const fmtTime = (d)   => d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
const fmtDur  = (ms)  => { if (!ms) return "—"; if (ms < 1000) return `${ms}ms`; return `${(ms / 1000).toFixed(1)}s`; };
const relTime = (iso) => { if (!iso) return "—"; const m = Math.floor((Date.now() - new Date(iso)) / 60000); if (m < 1) return "just now"; if (m < 60) return `${m}m ago`; const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`; return `${Math.floor(h / 24)}d ago`; };

const severityColor = (s) => ({ CRITICAL: C.red, HIGH: C.amber, MEDIUM: C.blue, LOW: C.inkMid, CLEAN: C.teal }[String(s || "").toUpperCase()] || C.inkMid);
const riskColor     = (n) => n >= 7 ? C.red : n >= 4 ? C.amber : C.teal;
const healthColor   = (h) => h >= 90 ? C.teal : h >= 75 ? C.green : h >= 55 ? C.amber : C.red;

const TT = { background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 12, color: C.ink };

// ─── localStorage helpers ──────────────────────────────────────────────────────
const lsGet = (k, fb) => { try { const v = localStorage.getItem(k); return v !== null ? JSON.parse(v) : fb; } catch { return fb; } };
const lsSet = (k, v)  => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

// ═══════════════════════════════════════════════════════════════════════════════
// DEMO DATA
// ═══════════════════════════════════════════════════════════════════════════════
const DEMO_REPOS    = ["secureflow-api","payments-service","auth-gateway","web-dashboard","ml-inference","notification-worker","billing-cron"];
const DEMO_BRANCHES = ["main","develop","feat/checkout","hotfix/auth","release/2.4"];
const DEMO_AUTHORS  = ["a.rao","j.chen","m.silva","k.patel","d.novak","s.kim"];
const DEMO_MESSAGES = [
  "fix: bump dependencies for CVE patch",
  "feat: add stripe webhook handler",
  "chore: update base image to alpine 3.20",
  "refactor: extract auth middleware",
  "feat: enable rate limiting on public routes",
  "fix: sanitize user input on upload",
  "chore: rotate service credentials",
  "feat: add health probe endpoint",
];
const DEMO_SCAN_TYPES = ["secret-scan","container-scan","sast","dependency-scan","iac-scan"];
const DEMO_PACKAGES = [
  { id: "CVE-2024-37891", package: "urllib3",      severity: "HIGH",     fix: "urllib3==2.2.2"       },
  { id: "CVE-2023-50782", package: "cryptography", severity: "CRITICAL", fix: "cryptography==42.0.0" },
  { id: "CVE-2024-3772",  package: "pydantic",     severity: "MEDIUM",   fix: "pydantic==2.6.0"      },
  { id: "CVE-2024-35195", package: "requests",     severity: "HIGH",     fix: "requests==2.32.0"     },
  { id: "CVE-2023-45803", package: "urllib3",      severity: "MEDIUM",   fix: "urllib3==2.0.7"       },
  { id: "CVE-2024-26130", package: "cryptography", severity: "HIGH",     fix: "cryptography==42.0.4" },
];
const THREAT_FEED_DATA = [
  { id: "tf1", level: "CRITICAL", title: "urllib3 CVE-2024-37891 actively exploited in the wild",    source: "NVD / GHSA",      time: "12m ago" },
  { id: "tf2", level: "HIGH",     title: "New GitHub fine-grained token leak pattern detected",       source: "GitHub Advisory", time: "48m ago" },
  { id: "tf3", level: "HIGH",     title: "Docker privilege escalation via misconfigured runtime",     source: "CISA",            time: "2h ago"  },
  { id: "tf4", level: "MEDIUM",   title: "OpenSSL downgrade attack affecting TLS handshakes",        source: "OpenSSL",         time: "5h ago"  },
  { id: "tf5", level: "MEDIUM",   title: "Supply-chain typosquat targeting npm registry",            source: "Socket.dev",      time: "9h ago"  },
];

const rand    = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const makeSha = () => Array.from({ length: 7 }, () => "0123456789abcdef"[randInt(0, 15)]).join("");

function buildDemoPipeline(action, severity) {
  const blocked = action === "BLOCK";
  const failAt  = blocked ? randInt(2, 4) : 99;
  const names   = ["Checkout", "Code Scan", "Docker Build", "Trivy Scan", "Policy Gate", "Deploy"];
  return names.map((name, i) => {
    let status = "passed";
    if (i === failAt)    status = "failed";
    else if (i > failAt) status = "skipped";
    const logs = status === "failed"
      ? [`$ running ${name.toLowerCase()}`, `[error] ${severity} severity finding detected`, "[gate] policy violation — blocking deploy"]
      : status === "skipped"
      ? ["[skipped] upstream stage failed"]
      : [`$ running ${name.toLowerCase()}`, `[ok] ${name} completed`, "[ok] no blocking issues"];
    return { id: `${name}-${i}`, name, status, duration_ms: status === "skipped" ? 0 : randInt(800, 14000), logs };
  });
}

function makeDemoScan(ageMinutes, forceStatus) {
  const action   = Math.random() < 0.34 ? "BLOCK" : "ALLOW";
  const sevOpts  = action === "BLOCK" ? ["CRITICAL","HIGH","HIGH","MEDIUM"] : ["LOW","CLEAN","CLEAN","MEDIUM"];
  const severity = rand(sevOpts);
  const risk     = severity === "CRITICAL" ? randInt(8,10) : severity === "HIGH" ? randInt(6,8) : severity === "MEDIUM" ? randInt(4,6) : randInt(0,3);
  const fixableCount = action === "BLOCK" ? randInt(1, 3) : 0;
  const fixable  = Array.from({ length: fixableCount }, () => rand(DEMO_PACKAGES));
  const baseCount = randInt(0, 18), appCount = randInt(0, 6);
  return {
    id:             `scan_${makeSha()}${makeSha()}`,
    repo_name:      rand(DEMO_REPOS),
    branch:         rand(DEMO_BRANCHES),
    commit_sha:     makeSha(),
    commit_message: rand(DEMO_MESSAGES),
    author:         rand(DEMO_AUTHORS),
    scan_type:      rand(DEMO_SCAN_TYPES),
    status:         forceStatus ?? "completed",
    severity,
    action_taken:   action,
    risk_score:     risk,
    created_at:     new Date(Date.now() - ageMinutes * 60000).toISOString(),
    ai_confidence:  randInt(72, 98),
    duration_ms:    randInt(4000, 38000),
    ai_explanation: action === "BLOCK"
      ? `The ${rand(DEMO_SCAN_TYPES).replace(/-/g," ")} flagged ${fixableCount} fixable issue(s). Risk vector concentrated in transitive dependencies; remediation available via version bump.`
      : "No exploitable conditions detected. Dependency tree and image layers within policy thresholds.",
    human_summary: action === "BLOCK"
      ? `We stopped this deploy because it contained ${fixableCount} known-vulnerable package${fixableCount === 1 ? "" : "s"}. A patched version already exists, so the fix is quick.`
      : "This change passed every security gate cleanly and was allowed to deploy.",
    vuln_breakdown: {
      total: fixableCount + baseCount + appCount,
      base_image_count: baseCount,
      fixable_count: fixableCount,
      app_count: appCount,
      base_image_note: baseCount > 8 ? "Most CVEs originate from the base image and are not directly fixable in your code." : undefined,
      fixable_details: fixable.map((f, i) => ({ ...f, id: `${f.id}-${i}` })),
    },
    pipeline: buildDemoPipeline(action, severity),
  };
}

function generateDemoScans(count = 64) {
  const scans = [makeDemoScan(1, "running"), makeDemoScan(3, "running")];
  for (let i = 0; i < count; i++) scans.push(makeDemoScan(randInt(5, 60 * 24 * 7)));
  return scans.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED PRIMITIVES — defined FIRST (const arrow fns don't hoist)
// ═══════════════════════════════════════════════════════════════════════════════

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

const Card = ({ children, style, glow, className }) => (
  <div className={className} style={{
    background: C.bgCard, borderRadius: 14,
    border: `1px solid ${glow ? C.tealBord : C.border}`,
    padding: "18px 20px", marginBottom: 12,
    boxShadow: glow ? `0 0 24px ${C.teal}10` : "none",
    ...style,
  }}>{children}</div>
);

const GlassCard = ({ children, style, glow }) => (
  <div style={{
    background: "rgba(15,20,25,0.7)",
    backdropFilter: "blur(16px)",
    borderRadius: 14,
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

// FIX #2: Skeleton now accepts and spreads `style` prop
const Skeleton = ({ w = "100%", h = 16, r = 6, style: extra }) => (
  <div style={{ width: w, height: h, borderRadius: r, background: C.bgSurface, animation: "shimmer 1.4s ease infinite", ...extra }} />
);

const SkeletonCard = () => (
  <div style={{ background: C.bgCard, borderRadius: 14, border: `1px solid ${C.border}`, padding: "18px 20px", marginBottom: 10 }}>
    <div style={{ display: "flex", gap: 10, marginBottom: 12 }}><Skeleton w={80} h={12} /><Skeleton w={60} h={12} /></div>
    <Skeleton h={14} style={{ marginBottom: 8 }} />
    <Skeleton w="60%" h={10} />
    <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
      {[1,2,3,4,5,6,7].map(i => <Skeleton key={i} w={40} h={8} r={4} />)}
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// SMALL UI COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

const StatusDot = ({ status }) => {
  const color = status === "running" ? C.teal : status === "completed" ? C.green : status === "failed" ? C.red : C.inkMid;
  return (
    <span style={{
      display: "inline-block", width: 7, height: 7, borderRadius: "50%",
      background: color, flexShrink: 0,
      animation: status === "running" ? "pulseRing 1.6s ease-out infinite" : "none",
    }} />
  );
};

const ActionBadge = ({ action }) => {
  const blocked = action === "BLOCK";
  return (
    <Badge color={blocked ? C.red : C.teal}>
      {blocked ? <XCircle size={9} /> : <CheckCircle size={9} />}
      {action}
    </Badge>
  );
};

const RiskBar = ({ score }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <div style={{ flex: 1, height: 4, borderRadius: 4, background: C.bgSurface, overflow: "hidden" }}>
      <div style={{ width: `${score * 10}%`, height: "100%", background: riskColor(score), borderRadius: 4, transition: "width 0.5s" }} />
    </div>
    <span style={{ fontSize: 11, fontFamily: C.mono, color: riskColor(score), minWidth: 22 }}>{score}</span>
  </div>
);

const ConfidencePip = ({ value }) => {
  const color = value >= 85 ? C.teal : value >= 70 ? C.amber : C.red;
  return (
    <span style={{ fontSize: 10, fontFamily: C.mono, color, fontWeight: 700 }}>
      {value}%
    </span>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATION PANEL
// ═══════════════════════════════════════════════════════════════════════════════

function NotificationPanel({ scans, dismissed, onDismiss, onDismissAll, onClose }) {
  const items = scans
    .filter(s => s.action_taken === "BLOCK" && !dismissed.has(s.id))
    .slice(0, 10);

  return (
    <div style={{
      position: "absolute", top: 48, right: 0, width: 340,
      background: C.bgCard, border: `1px solid ${C.border}`,
      borderRadius: 14, boxShadow: "0 16px 48px #00000060",
      zIndex: 100, overflow: "hidden",
      animation: "dropDown 0.18s ease",
    }}>
      <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 700, fontSize: 13 }}>Alerts</span>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={onDismissAll} style={{ fontSize: 10, color: C.inkMid, background: "none", border: "none", cursor: "pointer" }}>Dismiss all</button>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.inkMid }}><X size={14} /></button>
        </div>
      </div>
      {items.length === 0
        ? <EmptyState text="No active alerts" />
        : items.map(s => (
          <div key={s.id} style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}20`, display: "flex", gap: 10, alignItems: "flex-start" }}>
            <ShieldAlert size={14} color={severityColor(s.severity)} style={{ marginTop: 2, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.ink, marginBottom: 2 }}>{s.repo_name}</div>
              <div style={{ fontSize: 10, color: C.inkMid }}>{s.commit_message}</div>
              <div style={{ fontSize: 9, color: C.inkLow, marginTop: 4 }}>{relTime(s.created_at)}</div>
            </div>
            <button onClick={() => onDismiss(s.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.inkLow, padding: 0 }}><X size={12} /></button>
          </div>
        ))
      }
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMMAND PALETTE
// ═══════════════════════════════════════════════════════════════════════════════

function CommandPalette({ scans, onClose, onNavigate }) {
  const [q, setQ] = useState("");
  const inputRef  = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const navItems = TABS.map(t => ({ type: "nav", label: t.label, id: t.id }));
  const scanItems = scans.slice(0, 20).map(s => ({
    type: "scan", label: `${s.repo_name} · ${s.commit_sha}`, id: s.id,
    sub: relTime(s.created_at), color: severityColor(s.severity),
  }));
  const all = [...navItems, ...scanItems];
  const results = q.trim()
    ? all.filter(i => i.label.toLowerCase().includes(q.toLowerCase()))
    : all;

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000080", zIndex: 999, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 80, animation: "backdropIn 0.15s ease" }} onClick={onClose}>
      <div style={{ background: C.bgCard, border: `1px solid ${C.borderBright}`, borderRadius: 16, width: 540, maxHeight: 420, overflow: "hidden", boxShadow: "0 24px 64px #00000080", animation: "scaleIn 0.18s ease" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: `1px solid ${C.border}` }}>
          <Search size={16} color={C.inkMid} />
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search tabs, scans…"
            style={{ flex: 1, background: "none", border: "none", outline: "none", color: C.ink, fontSize: 14, fontFamily: C.sans }}
          />
          <kbd style={{ fontSize: 9, background: C.bgSurface, border: `1px solid ${C.border}`, borderRadius: 4, padding: "2px 6px", color: C.inkMid }}>ESC</kbd>
        </div>
        <div style={{ overflowY: "auto", maxHeight: 360 }}>
          {results.length === 0
            ? <EmptyState text="No results" />
            : results.map((r, i) => (
              <div key={i} onClick={() => { onNavigate(r); onClose(); }}
                style={{ padding: "10px 16px", cursor: "pointer", display: "flex", gap: 10, alignItems: "center", borderBottom: `1px solid ${C.border}10` }}
                onMouseEnter={e => e.currentTarget.style.background = C.bgHover}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                {r.type === "nav" ? <ArrowRight size={13} color={C.teal} /> : <GitCommit size={13} color={r.color || C.inkMid} />}
                <span style={{ fontSize: 13, color: C.ink }}>{r.label}</span>
                {r.sub && <span style={{ fontSize: 10, color: C.inkLow, marginLeft: "auto" }}>{r.sub}</span>}
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// WHY BLOCKED MODAL
// ═══════════════════════════════════════════════════════════════════════════════

function WhyBlockedModal({ scan, onClose }) {
  const [tab, setTab] = useState("human");
  const sev = (scan?.severity || "").toUpperCase();

  const businessImpact = useMemo(() => {
    if (sev === "CRITICAL") return "Deploying this would expose customer PII to known exploit chains. Regulatory fines (GDPR Art. 83) and incident response costs typically exceed $250k for this vector.";
    if (sev === "HIGH")     return "This vulnerability has a working public PoC. A successful exploit could allow lateral movement within the cluster and data exfiltration.";
    if (sev === "MEDIUM")   return "While not immediately exploitable, leaving this unpatched increases attack surface. Patch now to avoid compounding risk.";
    return "Policy mandates remediation before deploy to maintain compliance posture.";
  }, [sev]);

  if (!scan) return null;
  const tabs = [
    { id: "human",    label: "Plain English" },
    { id: "technical", label: "Technical"   },
    { id: "business", label: "Business"     },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000090", zIndex: 998, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 18, width: 520, maxHeight: "80vh", overflow: "hidden", boxShadow: "0 24px 64px #00000080", animation: "scaleIn 0.18s ease" }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: "18px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <ShieldAlert size={18} color={C.red} />
            <span style={{ fontWeight: 700, fontSize: 15 }}>Why was this blocked?</span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.inkMid }}><X size={16} /></button>
        </div>

        <div style={{ display: "flex", gap: 4, padding: "12px 20px 0", borderBottom: `1px solid ${C.border}` }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: "6px 14px", fontSize: 12, fontWeight: 600, borderRadius: "8px 8px 0 0",
              border: "none", cursor: "pointer", transition: "all 0.15s",
              background: tab === t.id ? C.bgSurface : "none",
              color: tab === t.id ? C.ink : C.inkMid,
              borderBottom: tab === t.id ? `2px solid ${C.teal}` : "2px solid transparent",
            }}>{t.label}</button>
          ))}
        </div>

        <div style={{ padding: "20px", overflowY: "auto", maxHeight: "60vh" }}>
          {tab === "human" && (
            <div>
              <p style={{ fontSize: 14, color: C.ink, lineHeight: 1.7, marginBottom: 16 }}>{scan.human_summary}</p>
              <div style={{ background: C.bgSurface, borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ fontSize: 10, color: C.inkLow, marginBottom: 8, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}>Quick fix</div>
                {(scan.vuln_breakdown?.fixable_details || []).slice(0, 3).map((f, i) => (
                  <div key={i} style={{ fontSize: 12, color: C.teal, fontFamily: C.mono, marginBottom: 4 }}>
                    pip install {f.fix}
                  </div>
                ))}
                {!(scan.vuln_breakdown?.fixable_details?.length) && <span style={{ fontSize: 12, color: C.inkMid }}>No auto-fix available — review the AI explanation.</span>}
              </div>
            </div>
          )}
          {tab === "technical" && (
            <div>
              <p style={{ fontSize: 13, color: C.inkMid, lineHeight: 1.7, marginBottom: 16 }}>{scan.ai_explanation}</p>
              {(scan.vuln_breakdown?.fixable_details || []).map((f, i) => (
                <div key={i} style={{ background: C.bgSurface, borderRadius: 8, padding: "10px 12px", marginBottom: 8, fontSize: 12, fontFamily: C.mono }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <Badge color={severityColor(f.severity)} small>{f.severity}</Badge>
                    <span style={{ color: C.inkLow }}>{f.id}</span>
                  </div>
                  <div style={{ color: C.ink }}>{f.package}</div>
                  <div style={{ color: C.teal, marginTop: 4 }}>→ {f.fix}</div>
                </div>
              ))}
            </div>
          )}
          {tab === "business" && (
            <div>
              <p style={{ fontSize: 14, color: C.ink, lineHeight: 1.7 }}>{businessImpact}</p>
              <div style={{ marginTop: 16, padding: "12px 14px", background: C.amberSoft, border: `1px solid ${C.amberBord}`, borderRadius: 10 }}>
                <div style={{ fontSize: 11, color: C.amber, fontWeight: 700, marginBottom: 6 }}>Recommended action</div>
                <div style={{ fontSize: 12, color: C.inkMid }}>Apply the fix commit, re-run the pipeline, and verify in staging before promoting to production.</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FIX DIFF VIEW
// ═══════════════════════════════════════════════════════════════════════════════

function FixDiffView({ scan }) {
  const [copied, setCopied] = useState(false);
  const pkgs = scan.vuln_breakdown?.fixable_details || [];
  if (!pkgs.length) return null;

  const before = pkgs.map(p => `${p.package}  # vulnerable`).join("\n");
  const after  = pkgs.map(p => p.fix).join("\n");

  const copy = () => {
    navigator.clipboard.writeText(after).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  return (
    <Card style={{ marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <SectionTitle accent={C.teal}>Suggested Fix</SectionTitle>
        <button onClick={copy} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.inkMid, background: "none", border: "none", cursor: "pointer" }}>
          {copied ? <Check size={13} color={C.teal} /> : <Copy size={13} />}
          {copied ? "Copied!" : "Copy fix"}
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <div style={{ fontSize: 9, color: C.red, fontWeight: 700, marginBottom: 6, letterSpacing: "0.1em" }}>BEFORE</div>
          <pre style={{ background: C.redSoft, border: `1px solid ${C.redBord}`, borderRadius: 8, padding: "10px 12px", fontSize: 11, fontFamily: C.mono, color: C.ink, margin: 0, whiteSpace: "pre-wrap" }}>{before}</pre>
        </div>
        <div>
          <div style={{ fontSize: 9, color: C.teal, fontWeight: 700, marginBottom: 6, letterSpacing: "0.1em" }}>AFTER</div>
          <pre style={{ background: C.tealSoft, border: `1px solid ${C.tealBord}`, borderRadius: 8, padding: "10px 12px", fontSize: 11, fontFamily: C.mono, color: C.ink, margin: 0, whiteSpace: "pre-wrap" }}>{after}</pre>
        </div>
      </div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIDENCE PANEL
// ═══════════════════════════════════════════════════════════════════════════════

function ConfidencePanel({ scan }) {
  const conf = scan.ai_confidence || 0;
  const color = conf >= 85 ? C.teal : conf >= 70 ? C.amber : C.red;
  const basis = [
    "CVE database cross-reference",
    "Historical scan patterns",
    "Dependency graph analysis",
    "EPSS score weighting",
    "Base image provenance",
  ];
  return (
    <Card>
      <SectionTitle accent={C.violet}>AI Confidence</SectionTitle>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div style={{ flex: 1, height: 8, borderRadius: 4, background: C.bgSurface, overflow: "hidden" }}>
          <div style={{ width: `${conf}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.6s ease" }} />
        </div>
        <span style={{ fontSize: 16, fontFamily: C.mono, fontWeight: 700, color }}>{conf}%</span>
      </div>
      <div style={{ fontSize: 10, color: C.inkLow, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>Basis</div>
      {basis.map((b, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
          <CheckCircle size={11} color={C.teal} />
          <span style={{ fontSize: 11, color: C.inkMid }}>{b}</span>
        </div>
      ))}
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCAN DETAIL PANEL
// ═══════════════════════════════════════════════════════════════════════════════

function ScanDetail({ scan, onClose, onWhyBlocked }) {
  const [showConf, setShowConf] = useState(false);
  if (!scan) return null;
  const blocked = scan.action_taken === "BLOCK";
  const vb = scan.vuln_breakdown || {};

  return (
    <div style={{
      position: "fixed", top: 0, right: 0, width: 460, height: "100vh",
      background: C.bgCard, borderLeft: `1px solid ${C.border}`,
      overflowY: "auto", zIndex: 90, padding: "20px",
      boxShadow: "-16px 0 48px #00000040", animation: "slideIn 0.2s ease",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 12, color: C.inkMid, marginBottom: 4 }}>{scan.repo_name}</div>
          <div style={{ fontFamily: C.mono, fontSize: 14, color: C.ink }}>{scan.commit_sha}</div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.inkMid }}><X size={16} /></button>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <ActionBadge action={scan.action_taken} />
        <Badge color={severityColor(scan.severity)}>{scan.severity}</Badge>
        <StatusDot status={scan.status} />
        <span style={{ fontSize: 11, color: C.inkMid }}>{scan.status}</span>
      </div>

      <Card style={{ marginBottom: 12 }}>
        <SectionTitle>Commit</SectionTitle>
        <div style={{ fontSize: 12, color: C.ink, marginBottom: 8 }}>{scan.commit_message}</div>
        <div style={{ display: "flex", gap: 16, fontSize: 11, color: C.inkMid }}>
          <span><User size={10} style={{ marginRight: 4 }} />{scan.author}</span>
          <span><GitBranch size={10} style={{ marginRight: 4 }} />{scan.branch}</span>
          <span><Clock size={10} style={{ marginRight: 4 }} />{fmtDur(scan.duration_ms)}</span>
        </div>
      </Card>

      {vb.total > 0 && (
        <Card style={{ marginBottom: 12 }}>
          <SectionTitle accent={blocked ? C.red : C.teal}>Vulnerability Breakdown</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 12 }}>
            {[
              { label: "Total",     val: vb.total,            color: C.ink   },
              { label: "App",       val: vb.app_count || 0,   color: C.amber },
              { label: "Fixable",   val: vb.fixable_count || 0, color: C.teal },
            ].map(({ label, val, color }) => (
              <div key={label} style={{ textAlign: "center", background: C.bgSurface, borderRadius: 10, padding: "10px 8px" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color, fontFamily: C.mono }}>{val}</div>
                <div style={{ fontSize: 9, color: C.inkLow, letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</div>
              </div>
            ))}
          </div>
          {vb.base_image_note && (
            <div style={{ fontSize: 11, color: C.inkMid, background: C.bgSurface, borderRadius: 8, padding: "8px 10px" }}>
              <Info size={10} style={{ marginRight: 6 }} />{vb.base_image_note}
            </div>
          )}
        </Card>
      )}

      {blocked && <FixDiffView scan={scan} />}

      <Card style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <SectionTitle accent={C.blue}>AI Explanation</SectionTitle>
          <button onClick={() => setShowConf(v => !v)} style={{ fontSize: 10, color: C.inkMid, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
            <ConfidencePip value={scan.ai_confidence} />
            confidence
          </button>
        </div>
        <p style={{ fontSize: 12, color: C.inkMid, lineHeight: 1.7, margin: 0 }}>{scan.ai_explanation}</p>
      </Card>

      {showConf && <ConfidencePanel scan={scan} />}

      {blocked && (
        <button onClick={onWhyBlocked} style={{
          width: "100%", padding: "12px", borderRadius: 10, fontSize: 13, fontWeight: 700,
          background: C.redSoft, border: `1px solid ${C.redBord}`, color: C.red,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
          <ShieldAlert size={14} />
          Why was this blocked?
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEVERITY DONUT
// ═══════════════════════════════════════════════════════════════════════════════

function SeverityDonut({ scans, activeSev, onSelect }) {
  const counts = useMemo(() => {
    const c = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, CLEAN: 0 };
    scans.forEach(s => { const k = (s.severity || "").toUpperCase(); if (k in c) c[k]++; });
    return c;
  }, [scans]);

  const data = Object.entries(counts)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value, color: severityColor(name) }));

  if (!data.length) return <EmptyChart />;

  return (
    <div>
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie
            data={data}
            cx="50%" cy="50%"
            innerRadius={42} outerRadius={68}
            paddingAngle={2}
            dataKey="value"
            onClick={(entry) => onSelect(activeSev === entry.name ? null : entry.name)}
            cursor="pointer"
          >
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={d.color}
                opacity={activeSev && activeSev !== d.name ? 0.25 : 1}
                stroke={activeSev === d.name ? d.color : "none"}
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip contentStyle={TT} formatter={(v, n) => [v, n]} />
        </PieChart>
      </ResponsiveContainer>

      {/* FIX #5: Filter badge + "View in Feed" instead of auto-navigate */}
      {activeSev && (
        <div style={{ textAlign: "center", marginTop: 4 }}>
          <Badge color={severityColor(activeSev)}>Filtering: {activeSev}</Badge>
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginTop: 10 }}>
        {data.map(d => (
          <button key={d.name} className="donut-legend-btn" onClick={() => onSelect(activeSev === d.name ? null : d.name)}
            style={{
              display: "flex", alignItems: "center", gap: 5, padding: "3px 8px",
              borderRadius: 999, fontSize: 10, cursor: "pointer", fontFamily: C.mono,
              background: activeSev === d.name ? d.color + "25" : "none",
              border: `1px solid ${activeSev === d.name ? d.color : C.border}`,
              color: activeSev === d.name ? d.color : C.inkMid,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: d.color }} />
            {d.name} <span style={{ opacity: 0.7 }}>({d.value})</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPO HEALTH CARDS
// ═══════════════════════════════════════════════════════════════════════════════

function RepoHealthCards({ scans, onFilterRepo }) {
  const repos = useMemo(() => {
    const map = {};
    scans.forEach(s => {
      if (!map[s.repo_name]) map[s.repo_name] = { total: 0, blocked: 0, latest: s.created_at };
      map[s.repo_name].total++;
      if (s.action_taken === "BLOCK") map[s.repo_name].blocked++;
      if (new Date(s.created_at) > new Date(map[s.repo_name].latest)) map[s.repo_name].latest = s.created_at;
    });
    return Object.entries(map).map(([name, v]) => ({
      name,
      health: Math.round(100 - (v.blocked / v.total) * 100),
      ...v,
    })).sort((a, b) => a.health - b.health);
  }, [scans]);

  if (!repos.length) return <EmptyState text="No repos yet" />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {repos.slice(0, 6).map(r => {
        const hc = healthColor(r.health);
        return (
          <div key={r.name}
            onClick={() => onFilterRepo(r.name)}
            style={{
              background: C.bgSurface, borderRadius: 10, padding: "10px 14px",
              border: `1px solid ${C.border}`, cursor: "pointer", transition: "border-color 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = C.borderBright}
            onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: C.ink }}>{r.name}</span>
              <span style={{ fontSize: 12, fontFamily: C.mono, fontWeight: 700, color: hc }}>{r.health}%</span>
            </div>
            <div style={{ height: 4, borderRadius: 4, background: C.bgElevated, overflow: "hidden" }}>
              <div style={{ width: `${r.health}%`, height: "100%", background: hc, borderRadius: 4 }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: C.inkLow, marginTop: 5 }}>
              <span>{r.total} scans</span>
              <span>{r.blocked} blocked</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// THREAT FEED PANEL
// ═══════════════════════════════════════════════════════════════════════════════

function ThreatFeedPanel() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {THREAT_FEED_DATA.map(t => (
        <div key={t.id} style={{
          background: C.bgSurface, borderRadius: 10, padding: "10px 14px",
          border: `1px solid ${C.border}`, display: "flex", gap: 10, alignItems: "flex-start",
        }}>
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
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// AI COPILOT SIDEBAR
// ═══════════════════════════════════════════════════════════════════════════════

function AICopilot({ scans }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [typeText, setTypeText] = useState("");
  const endRef = useRef(null);

  const blocked = scans.filter(s => s.action_taken === "BLOCK");
  const critCount = scans.filter(s => s.severity === "CRITICAL").length;

  // Daily summary on mount
  useEffect(() => {
    const summary = `Good ${new Date().getHours() < 12 ? "morning" : "afternoon"}! Here's your security pulse:\n\n• ${scans.length} total scans today\n• ${blocked.length} deploys blocked\n• ${critCount} critical findings\n\nTop concern: ${blocked[0]?.repo_name || "all clear"} — ask me anything!`;
    let i = 0;
    const iv = setInterval(() => {
      setTypeText(summary.slice(0, ++i));
      if (i >= summary.length) clearInterval(iv);
    }, 18);
    return () => clearInterval(iv);
  // eslint-disable-next-line
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, typeText]);

  const send = useCallback(async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", text: input.trim() };
    setMessages(m => [...m, userMsg]);
    setInput("");
    setLoading(true);

    // Build context string
    const ctx = [
      `You are SecureFlow AI Copilot. Current scan data:`,
      `Total scans: ${scans.length}`,
      `Blocked: ${blocked.length}`,
      `Critical: ${critCount}`,
      `Most recent blocked repo: ${blocked[0]?.repo_name || "none"}`,
      `User question: ${userMsg.text}`,
    ].join("\n");

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          messages: [{ role: "user", content: ctx }],
        }),
      });
      const data = await res.json();
      const text = data.content?.map(c => c.text || "").join("") || "I couldn't process that — try again.";
      setMessages(m => [...m, { role: "ai", text }]);
    } catch {
      setMessages(m => [...m, { role: "ai", text: "Connection error. Please check your network." }]);
    }
    setLoading(false);
  }, [input, loading, scans, blocked, critCount]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 8 }}>
        {/* Typewriter summary */}
        <div style={{ background: C.tealSoft, border: `1px solid ${C.tealBord}`, borderRadius: 10, padding: "12px 14px", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <Sparkles size={12} color={C.teal} />
            <span style={{ fontSize: 9, fontWeight: 800, color: C.teal, letterSpacing: "0.12em", textTransform: "uppercase" }}>Daily Summary</span>
          </div>
          <pre style={{ fontSize: 11, color: C.ink, lineHeight: 1.7, whiteSpace: "pre-wrap", margin: 0, fontFamily: C.sans }}>
            {typeText}<span style={{ opacity: 0.5, animation: "blink 1s step-end infinite" }}>|</span>
          </pre>
        </div>

        {messages.map((m, i) => (
          <div key={i} style={{
            padding: "10px 12px", borderRadius: 10, marginBottom: 8, fontSize: 12, lineHeight: 1.6,
            background: m.role === "user" ? C.blueSoft : C.bgSurface,
            border: `1px solid ${m.role === "user" ? C.blue + "30" : C.border}`,
            color: C.ink, alignSelf: m.role === "user" ? "flex-end" : "flex-start",
          }}>
            {m.role === "ai" && <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}><Sparkles size={10} color={C.teal} /><span style={{ fontSize: 9, color: C.teal, fontWeight: 700 }}>AI Copilot</span></div>}
            {m.text}
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.inkMid, fontSize: 11, padding: "8px 12px" }}>
            <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
            Thinking…
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div style={{ display: "flex", gap: 8, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Ask about security…"
          style={{
            flex: 1, background: C.bgSurface, border: `1px solid ${C.border}`,
            borderRadius: 8, padding: "8px 12px", fontSize: 12, color: C.ink,
            outline: "none", fontFamily: C.sans,
          }}
        />
        <button onClick={send} disabled={loading} style={{
          background: C.teal, border: "none", borderRadius: 8, padding: "8px 14px",
          color: C.bg, fontWeight: 700, fontSize: 12, cursor: "pointer",
        }}>
          {loading ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <ArrowRight size={13} />}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE STAGE VIEWER
// ═══════════════════════════════════════════════════════════════════════════════

function PipelineView({ scan }) {
  const [expanded, setExpanded] = useState(null);
  if (!scan?.pipeline?.length) return <EmptyState text="No pipeline data" />;

  const stageColor = (s) => s === "passed" ? C.teal : s === "failed" ? C.red : C.inkLow;
  const stageIcon  = (s) =>
    s === "passed"  ? <CheckCircle size={14} color={C.teal} /> :
    s === "failed"  ? <XCircle size={14} color={C.red} /> :
    <Minus size={14} color={C.inkLow} />;

  return (
    <div style={{ position: "relative" }}>
      {scan.pipeline.map((stage, i) => {
        const isLast = i === scan.pipeline.length - 1;
        const sc = stageColor(stage.status);
        return (
          <div key={stage.id} style={{ display: "flex", gap: 14, marginBottom: 4 }}>
            {/* Connector column */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 24, flexShrink: 0 }}>
              {stageIcon(stage.status)}
              {/* FIX #4: last segment uses current stage color, not i+1 */}
              {!isLast && <div style={{ width: 2, flex: 1, minHeight: 16, background: sc, opacity: 0.3, marginTop: 4 }} />}
            </div>

            <div style={{ flex: 1, marginBottom: 12 }}>
              <div
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                onClick={() => setExpanded(expanded === stage.id ? null : stage.id)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: sc }}>{stage.name}</span>
                  <Badge color={sc} small>{stage.status}</Badge>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 10, color: C.inkMid, fontFamily: C.mono }}>{fmtDur(stage.duration_ms)}</span>
                  {expanded === stage.id ? <ChevronUp size={12} color={C.inkMid} /> : <ChevronDown size={12} color={C.inkMid} />}
                </div>
              </div>

              {expanded === stage.id && (
                <div style={{ marginTop: 8, background: C.bgSurface, borderRadius: 8, padding: "10px 12px", border: `1px solid ${C.border}` }}>
                  {stage.logs.map((line, li) => (
                    <div key={li} style={{
                      fontSize: 11, fontFamily: C.mono, color: line.startsWith("[error]") ? C.red : line.startsWith("[ok]") ? C.teal : line.startsWith("[gate]") ? C.amber : C.inkMid,
                      lineHeight: 1.8,
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

// ═══════════════════════════════════════════════════════════════════════════════
// SCAN FEED TAB
// ═══════════════════════════════════════════════════════════════════════════════

function ScanFeedTab({ scans, sevFilter, repoFilter, onClearSevFilter, onClearRepoFilter, onSelect }) {
  const [actionFilter, setActionFilter] = useState("ALL");
  const [localSev, setLocalSev]         = useState("ALL");

  const activeSev  = sevFilter || (localSev !== "ALL" ? localSev : null);
  const filtered = useMemo(() => {
    return scans.filter(s => {
      if (actionFilter !== "ALL" && s.action_taken !== actionFilter) return false;
      if (activeSev && s.severity !== activeSev) return false;
      if (repoFilter && s.repo_name !== repoFilter) return false;
      return true;
    });
  }, [scans, actionFilter, activeSev, repoFilter]);

  const sevOpts = ["ALL","CRITICAL","HIGH","MEDIUM","LOW","CLEAN"];
  const actOpts = ["ALL","BLOCK","ALLOW"];

  return (
    <div>
      {/* Filter bar */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
        <Filter size={13} color={C.inkMid} />

        {/* FIX #10: badge shows combined filter info */}
        {(sevFilter || repoFilter) && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {sevFilter && (
              <span style={{ display: "flex", alignItems: "center", gap: 4, background: severityColor(sevFilter) + "20", border: `1px solid ${severityColor(sevFilter)}40`, borderRadius: 999, padding: "2px 10px", fontSize: 10, color: severityColor(sevFilter) }}>
                {sevFilter}
                <button onClick={onClearSevFilter} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0, lineHeight: 1, marginLeft: 2 }}><X size={9} /></button>
              </span>
            )}
            {repoFilter && (
              <span style={{ display: "flex", alignItems: "center", gap: 4, background: C.blueSoft, border: `1px solid ${C.blue}30`, borderRadius: 999, padding: "2px 10px", fontSize: 10, color: C.blue }}>
                {repoFilter}
                <button onClick={onClearRepoFilter} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0, lineHeight: 1, marginLeft: 2 }}><X size={9} /></button>
              </span>
            )}
          </div>
        )}

        <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
          {actOpts.map(o => (
            <button key={o} onClick={() => setActionFilter(o)} style={{
              padding: "4px 10px", borderRadius: 999, fontSize: 10, fontWeight: 600, cursor: "pointer",
              background: actionFilter === o ? (o === "BLOCK" ? C.redSoft : o === "ALLOW" ? C.tealSoft : C.bgSurface) : "none",
              border: `1px solid ${actionFilter === o ? (o === "BLOCK" ? C.red : o === "ALLOW" ? C.teal : C.borderBright) : C.border}`,
              color: actionFilter === o ? (o === "BLOCK" ? C.red : o === "ALLOW" ? C.teal : C.ink) : C.inkMid,
            }}>{o}</button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 4 }}>
          {sevOpts.map(o => (
            <button key={o} onClick={() => setLocalSev(o)} style={{
              padding: "4px 8px", borderRadius: 999, fontSize: 9, fontWeight: 700, cursor: "pointer",
              background: localSev === o ? severityColor(o) + "20" : "none",
              border: `1px solid ${localSev === o ? severityColor(o) + "60" : C.border}`,
              color: localSev === o ? severityColor(o) : C.inkMid,
            }}>{o}</button>
          ))}
        </div>
      </div>

      <div style={{ fontSize: 11, color: C.inkLow, marginBottom: 12 }}>{filtered.length} scan{filtered.length !== 1 ? "s" : ""}</div>

      {filtered.length === 0
        ? <EmptyState text="No scans match the current filters" />
        : filtered.map((s, idx) => (
          <div key={s.id}
            className="scan-card"
            onClick={() => onSelect(s)}
            style={{
              background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12,
              padding: "14px 16px", marginBottom: 8, cursor: "pointer",
              animation: `fadeUp 0.22s ease ${Math.min(idx, 12) * 0.04}s both`,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.borderBright; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <StatusDot status={s.status} />
                <span style={{ fontSize: 12, fontWeight: 700, color: C.ink }}>{s.repo_name}</span>
                <ActionBadge action={s.action_taken} />
                <Badge color={severityColor(s.severity)} small>{s.severity}</Badge>
              </div>
              <span style={{ fontSize: 10, color: C.inkLow, whiteSpace: "nowrap" }}>{relTime(s.created_at)}</span>
            </div>

            <div style={{ fontSize: 11, color: C.inkMid, marginBottom: 6 }}>{s.commit_message}</div>

            <div style={{ display: "flex", gap: 12, fontSize: 10, color: C.inkLow, flexWrap: "wrap" }}>
              <span><User size={9} style={{ marginRight: 3 }} />{s.author}</span>
              <span><GitBranch size={9} style={{ marginRight: 3 }} />{s.branch}</span>
              <span style={{ fontFamily: C.mono }}>{s.commit_sha}</span>
              <span style={{ color: C.inkLow }}>{s.scan_type}</span>
              <span style={{ marginLeft: "auto" }}>
                <ConfidencePip value={s.ai_confidence} />
              </span>
            </div>
            <div style={{ marginTop: 8 }}>
              <RiskBar score={s.risk_score} />
            </div>
          </div>
        ))
      }
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// METRICS TAB
// ═══════════════════════════════════════════════════════════════════════════════

function MetricsTab({ scans }) {
  const byDay = useMemo(() => {
    const map = {};
    scans.forEach(s => {
      const day = s.created_at?.slice(0, 10);
      if (!day) return;
      if (!map[day]) map[day] = { date: day, scans: 0, blocked: 0, allowed: 0 };
      map[day].scans++;
      if (s.action_taken === "BLOCK") map[day].blocked++;
      else map[day].allowed++;
    });
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date)).slice(-14);
  }, [scans]);

  const byScanType = useMemo(() => {
    const map = {};
    scans.forEach(s => {
      if (!map[s.scan_type]) map[s.scan_type] = 0;
      map[s.scan_type]++;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [scans]);

  const avgConf = scans.length ? Math.round(scans.reduce((a, s) => a + (s.ai_confidence || 0), 0) / scans.length) : 0;
  const avgDur  = scans.length ? Math.round(scans.reduce((a, s) => a + (s.duration_ms || 0), 0) / scans.length) : 0;
  const blockRate = scans.length ? Math.round(scans.filter(s => s.action_taken === "BLOCK").length / scans.length * 100) : 0;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Block Rate",       val: `${blockRate}%`, color: C.red   },
          { label: "Avg Confidence",   val: `${avgConf}%`,   color: C.teal  },
          { label: "Avg Scan Time",    val: fmtDur(avgDur),  color: C.blue  },
        ].map(({ label, val, color }) => (
          <Card key={label} style={{ textAlign: "center", marginBottom: 0 }}>
            <div style={{ fontSize: 26, fontWeight: 800, color, fontFamily: C.mono }}>{val}</div>
            <div style={{ fontSize: 10, color: C.inkLow, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 4 }}>{label}</div>
          </Card>
        ))}
      </div>

      <Card>
        <SectionTitle accent={C.blue}>Daily Scan Volume</SectionTitle>
        {byDay.length === 0 ? <EmptyChart /> : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={byDay}>
              <defs>
                <linearGradient id="gBlocked" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.red}  stopOpacity={0.3} />
                  <stop offset="95%" stopColor={C.red}  stopOpacity={0}   />
                </linearGradient>
                <linearGradient id="gAllowed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={C.teal} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={C.teal} stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="date" tick={{ fill: C.inkLow, fontSize: 10 }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fill: C.inkLow, fontSize: 10 }} />
              <Tooltip contentStyle={TT} />
              <Area type="monotone" dataKey="blocked" stroke={C.red}  fill="url(#gBlocked)" strokeWidth={2} name="Blocked" />
              <Area type="monotone" dataKey="allowed" stroke={C.teal} fill="url(#gAllowed)" strokeWidth={2} name="Allowed" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card>
        <SectionTitle accent={C.amber}>Scans by Type</SectionTitle>
        {byScanType.length === 0 ? <EmptyChart /> : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={byScanType} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
              <XAxis type="number" tick={{ fill: C.inkLow, fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: C.inkMid, fontSize: 10 }} width={110} />
              <Tooltip contentStyle={TT} />
              <Bar dataKey="value" fill={C.amber} radius={[0, 4, 4, 0]} name="Scans" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// OVERVIEW TAB
// ═══════════════════════════════════════════════════════════════════════════════

function OverviewTab({ scans, activeSev, onSevSelect, onFilterRepo, onNavigateToFeed }) {
  const total    = scans.length;
  const blocked  = scans.filter(s => s.action_taken === "BLOCK").length;
  const running  = scans.filter(s => s.status === "running").length;
  const critical = scans.filter(s => s.severity === "CRITICAL").length;

  const stats = [
    { label: "Total Scans",     val: total,    color: C.ink,   icon: <Activity size={16} /> },
    { label: "Blocked",         val: blocked,  color: C.red,   icon: <XCircle size={16} />  },
    { label: "Live",            val: running,  color: C.teal,  icon: <Radio size={16} />    },
    { label: "Critical",        val: critical, color: C.amber, icon: <Flame size={16} />    },
  ];

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12, marginBottom: 16 }}>
        {stats.map((s, i) => (
          <Card key={s.label} className="stat-card" style={{ marginBottom: 0, cursor: "default" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ color: C.inkMid }}>{s.icon}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color, fontFamily: C.mono, animation: `countUp 0.4s ease ${i * 0.07}s both` }}>{s.val}</div>
            <div style={{ fontSize: 10, color: C.inkLow, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 2 }}>{s.label}</div>
          </Card>
        ))}
      </div>

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <SectionTitle accent={C.violet}>Severity Distribution</SectionTitle>
          {activeSev && (
            <button onClick={onNavigateToFeed} style={{
              fontSize: 10, color: C.teal, background: C.tealSoft, border: `1px solid ${C.tealBord}`,
              borderRadius: 999, padding: "3px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
            }}>
              View in Feed <ArrowRight size={10} />
            </button>
          )}
        </div>
        <SeverityDonut scans={scans} activeSev={activeSev} onSelect={onSevSelect} />
      </Card>

      <Card>
        <SectionTitle accent={C.blue}>Repo Health</SectionTitle>
        <RepoHealthCards scans={scans} onFilterRepo={onFilterRepo} />
      </Card>

      <Card>
        <SectionTitle accent={C.amber}>Threat Intel</SectionTitle>
        <ThreatFeedPanel />
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE TAB
// ═══════════════════════════════════════════════════════════════════════════════

function PipelineTab({ scans, onSelect }) {
  const recent = scans.filter(s => s.pipeline?.length).slice(0, 12);

  if (!recent.length) return <EmptyState text="No pipeline data available" />;

  return (
    <div>
      {recent.map(s => (
        <Card key={s.id} style={{ cursor: "pointer" }} onClick={() => onSelect(s)}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.ink }}>{s.repo_name}</span>
              <ActionBadge action={s.action_taken} />
            </div>
            <span style={{ fontSize: 10, color: C.inkLow }}>{relTime(s.created_at)}</span>
          </div>
          <PipelineView scan={s} />
        </Card>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════════

export default function App() {
  const [scans,       setScans]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [isDemo,      setIsDemo]      = useState(false);
  const [activeTab,   setActiveTab]   = useState(() => lsGet("sf_tab", "overview"));
  const [selectedScan, setSelectedScan] = useState(null);
  const [showWhy,     setShowWhy]     = useState(false);
  const [showBell,    setShowBell]    = useState(false);
  const [showCmd,     setShowCmd]     = useState(false);
  const [showCopilot, setShowCopilot] = useState(false);
  const [dismissed,   setDismissed]   = useState(() => new Set(lsGet("sf_dismissed", [])));
  const [sevFilter,   setSevFilter]   = useState(null);
  const [repoFilter,  setRepoFilter]  = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const retryRef = useRef(0);
  const wsRef    = useRef(null);

  // Persist tab choice
  useEffect(() => { lsSet("sf_tab", activeTab); }, [activeTab]);
  useEffect(() => { lsSet("sf_dismissed", [...dismissed]); }, [dismissed]);

  // ─── Data fetch with exponential retry ──────────────────────────────────────
  const fetchScans = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/scans`, { timeout: 8000 });
      const data = Array.isArray(res.data) ? res.data : res.data?.scans || [];
      setScans(data.length ? data : generateDemoScans());
      setIsDemo(!data.length);
      retryRef.current = 0;
    } catch {
      setScans(generateDemoScans());
      setIsDemo(true);
      retryRef.current = Math.min(retryRef.current + 1, 5);
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  }, []);

  useEffect(() => { fetchScans(); }, [fetchScans]);

  // WebSocket live updates
  useEffect(() => {
    const connect = () => {
      try {
        const ws = new WebSocket(API.replace(/^http/, "ws") + "/ws");
        ws.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data);
            if (msg.type === "scan_update") {
              setScans(prev => {
                const idx = prev.findIndex(s => s.id === msg.scan.id);
                if (idx >= 0) { const n = [...prev]; n[idx] = msg.scan; return n; }
                return [msg.scan, ...prev];
              });
              setLastUpdated(new Date());
            }
          } catch {}
        };
        wsRef.current = ws;
      } catch {}
    };
    if (!isDemo) connect();
    return () => wsRef.current?.close();
  }, [isDemo]);

  // Demo live sim
  useEffect(() => {
    if (!isDemo) return;
    const iv = setInterval(() => {
      const newScan = makeDemoScan(0);
      setScans(prev => [newScan, ...prev.slice(0, 79)]);
      setLastUpdated(new Date());
    }, 15000);
    return () => clearInterval(iv);
  }, [isDemo]);

  // ⌘K command palette
  useEffect(() => {
    const handler = (e) => { if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setShowCmd(v => !v); } };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ─── Derived state ───────────────────────────────────────────────────────────
  const alertCount = scans.filter(s => s.action_taken === "BLOCK" && !dismissed.has(s.id)).length;

  // FIX #7: stable renderNav via useCallback
  const renderNav = useCallback(() => (
    <nav style={{ display: "flex", gap: 4 }}>
      {TABS.map(t => {
        const Icon = t.icon;
        const active = activeTab === t.id;
        return (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
            borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600,
            background: active ? C.bgSurface : "none",
            color: active ? C.ink : C.inkMid,
            transition: "all 0.15s",
            borderBottom: active ? `2px solid ${C.teal}` : "2px solid transparent",
          }}>
            <Icon size={14} />
            {t.label}
          </button>
        );
      })}
    </nav>
  ), [activeTab]);

  const handleCmdNavigate = useCallback((item) => {
    if (item.type === "nav") setActiveTab(item.id);
    else {
      const s = scans.find(sc => sc.id === item.id);
      if (s) { setSelectedScan(s); setActiveTab("feed"); }
    }
  }, [scans]);

  const handleSevSelect = useCallback((sev) => {
    setSevFilter(sev);
  }, []);

  const handleFilterRepo = useCallback((repo) => {
    setRepoFilter(repo);
    setActiveTab("feed");
  }, []);

  const handleNavigateToFeed = useCallback(() => {
    setActiveTab("feed");
  }, []);

  // ─── Styles ──────────────────────────────────────────────────────────────────
  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap');
    *, *::before, *::after { box-sizing: border-box; }
    body { margin: 0; background: ${C.bg}; color: ${C.ink}; font-family: ${C.sans}; }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: ${C.bgElevated}; border-radius: 3px; }
    @keyframes shimmer    { 0%,100%{opacity:0.5} 50%{opacity:1} }
    @keyframes spin       { to{transform:rotate(360deg)} }
    @keyframes blink      { 50%{opacity:0} }
    @keyframes scaleIn    { from{transform:scale(0.92);opacity:0} to{transform:scale(1);opacity:1} }
    @keyframes slideIn    { from{transform:translateX(40px);opacity:0} to{transform:translateX(0);opacity:1} }
    @keyframes tabIn      { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
    @keyframes dropDown   { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
    @keyframes fadeUp     { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
    @keyframes countUp    { from{opacity:0;transform:scale(0.7)} to{opacity:1;transform:scale(1)} }
    @keyframes pulseRing  { 0%{box-shadow:0 0 0 0 ${C.teal}40} 70%{box-shadow:0 0 0 8px ${C.teal}00} 100%{box-shadow:0 0 0 0 ${C.teal}00} }
    @keyframes backdropIn { from{opacity:0} to{opacity:1} }
    button:focus-visible { outline: 2px solid ${C.teal}; outline-offset: 2px; }
    input:focus { border-color: ${C.tealBord} !important; }
    .scan-card { transition: border-color 0.15s, transform 0.15s, box-shadow 0.15s; }
    .scan-card:hover { transform: translateY(-1px); box-shadow: 0 4px 20px #00000040; }
    .stat-card { transition: transform 0.2s, box-shadow 0.2s; }
    .stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 28px #00000050; }
    .donut-legend-btn { transition: transform 0.15s; }
    .donut-legend-btn:hover { transform: scale(1.08); }
  `;

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{styles}</style>

      {/* Modals / Overlays */}
      {showCmd && <CommandPalette scans={scans} onClose={() => setShowCmd(false)} onNavigate={handleCmdNavigate} />}
      {showWhy && <WhyBlockedModal scan={selectedScan} onClose={() => setShowWhy(false)} />}

      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        {/* ── Header ── */}
        <header style={{
          position: "sticky", top: 0, zIndex: 80,
          background: "rgba(10,14,19,0.85)", backdropFilter: "blur(16px)",
          borderBottom: `1px solid ${C.border}`,
          padding: "0 24px", height: 56, display: "flex", alignItems: "center", gap: 16,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 8 }}>
            <Shield size={20} color={C.teal} />
            <span style={{ fontWeight: 800, fontSize: 16, color: C.ink }}>SecureFlow</span>
            {isDemo && <Badge color={C.amber} small>DEMO</Badge>}
          </div>

          {renderNav()}

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            {lastUpdated && (
              <span style={{ fontSize: 9, color: C.inkLow }}>Updated {fmtTime(lastUpdated)}</span>
            )}

            <button onClick={() => setShowCmd(v => !v)} style={{
              display: "flex", alignItems: "center", gap: 5, padding: "5px 10px",
              background: C.bgSurface, border: `1px solid ${C.border}`, borderRadius: 8,
              color: C.inkMid, fontSize: 11, cursor: "pointer",
            }}>
              <Command size={12} />
              <span>⌘K</span>
            </button>

            <button onClick={fetchScans} style={{ background: "none", border: "none", cursor: "pointer", color: C.inkMid, padding: 6 }}>
              <RefreshCw size={15} />
            </button>

            <button onClick={() => setShowCopilot(v => !v)} style={{
              background: showCopilot ? C.tealSoft : "none",
              border: `1px solid ${showCopilot ? C.tealBord : C.border}`,
              borderRadius: 8, padding: "5px 10px", cursor: "pointer",
              color: showCopilot ? C.teal : C.inkMid, fontSize: 11,
              display: "flex", alignItems: "center", gap: 5,
            }}>
              <Sparkles size={13} />
              AI
            </button>

            <div style={{ position: "relative" }}>
              <button onClick={() => setShowBell(v => !v)} style={{
                background: "none", border: "none", cursor: "pointer", color: C.inkMid, padding: 6, position: "relative",
              }}>
                <Bell size={16} />
                {alertCount > 0 && (
                  <span style={{
                    position: "absolute", top: 2, right: 2, width: 8, height: 8,
                    background: C.red, borderRadius: "50%", fontSize: 0,
                  }} />
                )}
              </button>
              {showBell && (
                <NotificationPanel
                  scans={scans}
                  dismissed={dismissed}
                  onDismiss={id => setDismissed(d => new Set([...d, id]))}
                  onDismissAll={() => setDismissed(new Set(scans.map(s => s.id)))}
                  onClose={() => setShowBell(false)}
                />
              )}
            </div>
          </div>
        </header>

        {/* ── Body ── */}
        <div style={{ flex: 1, display: "flex", maxWidth: 1400, margin: "0 auto", width: "100%", padding: "0 24px" }}>
          {/* Main content */}
          <main style={{ flex: 1, paddingTop: 24, paddingBottom: 40, minWidth: 0, paddingRight: showCopilot ? 24 : 0 }}>
            {loading ? (
              <div>{[1,2,3].map(i => <SkeletonCard key={i} />)}</div>
            ) : (
              <div style={{ animation: "tabIn 0.2s ease" }}>
                {activeTab === "overview" && (
                  <OverviewTab
                    scans={scans}
                    activeSev={sevFilter}
                    onSevSelect={handleSevSelect}
                    onFilterRepo={handleFilterRepo}
                    onNavigateToFeed={handleNavigateToFeed}
                  />
                )}
                {activeTab === "pipeline" && (
                  <PipelineTab scans={scans} onSelect={s => { setSelectedScan(s); }} />
                )}
                {activeTab === "feed" && (
                  <ScanFeedTab
                    scans={scans}
                    sevFilter={sevFilter}
                    repoFilter={repoFilter}
                    onClearSevFilter={() => setSevFilter(null)}
                    onClearRepoFilter={() => setRepoFilter(null)}
                    onSelect={s => setSelectedScan(s)}
                  />
                )}
                {activeTab === "metrics" && <MetricsTab scans={scans} />}
              </div>
            )}
          </main>

          {/* AI Copilot sidebar */}
          {showCopilot && (
            /* FIX #3: no duplicate position:relative */
            <aside style={{
              width: 320, borderLeft: `1px solid ${C.border}`,
              paddingLeft: 20, paddingTop: 24, paddingBottom: 40,
              display: "flex", flexDirection: "column",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <Sparkles size={14} color={C.teal} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>AI Copilot</span>
                </div>
                <button onClick={() => setShowCopilot(false)} style={{ background: "none", border: "none", cursor: "pointer", color: C.inkMid }}>
                  <X size={14} />
                </button>
              </div>
              <AICopilot scans={scans} />
            </aside>
          )}
        </div>
      </div>

      {/* Scan detail panel */}
      {selectedScan && (
        <ScanDetail
          scan={selectedScan}
          onClose={() => setSelectedScan(null)}
          onWhyBlocked={() => setShowWhy(true)}
        />
      )}
    </>
  );
}

