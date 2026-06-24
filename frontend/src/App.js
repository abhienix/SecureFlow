import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import axios from "axios";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  Shield, Activity, CheckCircle, XCircle, AlertTriangle, Zap, Cpu,
  RefreshCw, Bell, Search, Menu, X, ThumbsUp, ThumbsDown, Minus,
  ChevronDown, ChevronUp, Package, Info, GitCommit, Clock, TrendingUp,
  Terminal, Command, GitPullRequest, Copy, Check, ShieldAlert, ShieldCheck,
  Flame, Radio, ListChecks,
} from "lucide-react";

const API =
  process.env.REACT_APP_BACKEND_URL ||
  "https://secureflow-backend-1083585992526.us-central1.run.app";

// ── Design tokens ─────────────────────────────────────────────────────────────
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
  greenSoft:    "#2ecc7115",
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

const NAV = [
  { id: "overview",  label: "Overview",    icon: Activity   },
  { id: "pipeline",  label: "Pipeline",    icon: GitCommit  },
  { id: "feed",      label: "Scan Feed",   icon: ListChecks },
  { id: "ai",        label: "AI Insights", icon: Zap        },
  { id: "metrics",   label: "Metrics",     icon: TrendingUp },
];

// ── Formatters ────────────────────────────────────────────────────────────────
const fmt      = (iso) => { if (!iso) return "—"; const d = new Date(iso); return isNaN(d) ? "—" : d.toLocaleDateString("en-US", { day: "numeric", month: "short" }); };
const fmtFull  = (iso) => { if (!iso) return "—"; const d = new Date(iso); return isNaN(d) ? "—" : d.toLocaleString("en-US", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); };
const fmtTime  = (d)   => d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

const relativeTime = (iso) => {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const severityColor = (s) => ({ CRITICAL: C.red, HIGH: C.amber, MEDIUM: C.blue, LOW: C.inkMid, CLEAN: C.teal }[String(s || "").toUpperCase()] || C.inkMid);
const riskColor     = (n) => n >= 7 ? C.red : n >= 4 ? C.amber : C.teal;

const TT = { background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 12, color: C.ink };

// ── localStorage helpers ──────────────────────────────────────────────────────
const lsGet = (key, fallback) => { try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback; } catch { return fallback; } };
const lsSet = (key, val)      => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} };

// ── Demo data ─────────────────────────────────────────────────────────────────
const REPOS    = ["secureflow-api","payments-service","auth-gateway","web-dashboard","ml-inference","notification-worker","billing-cron"];
const BRANCHES = ["main","develop","feat/checkout","hotfix/auth","release/2.4"];
const AUTHORS  = ["a.rao","j.chen","m.silva","k.patel","d.novak","s.kim"];
const MESSAGES = [
  "fix: bump dependencies for CVE patch","feat: add stripe webhook handler",
  "chore: update base image to alpine 3.20","refactor: extract auth middleware",
  "feat: enable rate limiting on public routes","fix: sanitize user input on upload",
  "chore: rotate service credentials","feat: add health probe endpoint",
];
const SCAN_TYPES = ["secret-scan","container-scan","sast","dependency-scan","iac-scan"];
const PACKAGES = [
  { id: "CVE-2024-37891", package: "urllib3",      severity: "HIGH",     fix: "urllib3==2.2.2"        },
  { id: "CVE-2023-50782", package: "cryptography", severity: "CRITICAL", fix: "cryptography==42.0.0"  },
  { id: "CVE-2024-3772",  package: "pydantic",     severity: "MEDIUM",   fix: "pydantic==2.6.0"       },
  { id: "CVE-2024-35195", package: "requests",     severity: "HIGH",     fix: "requests==2.32.0"      },
  { id: "CVE-2023-45803", package: "urllib3",      severity: "MEDIUM",   fix: "urllib3==2.0.7"        },
  { id: "CVE-2024-26130", package: "cryptography", severity: "HIGH",     fix: "cryptography==42.0.4"  },
];
const THREAT_FEED_DATA = [
  { id: "tf1", level: "CRITICAL", title: "urllib3 CVE-2024-37891 actively exploited in the wild",    source: "NVD / GHSA",       time: "12m ago" },
  { id: "tf2", level: "HIGH",     title: "New GitHub fine-grained token leak pattern detected",       source: "GitHub Advisory",  time: "48m ago" },
  { id: "tf3", level: "HIGH",     title: "Docker privilege escalation via misconfigured runtime",     source: "CISA",             time: "2h ago"  },
  { id: "tf4", level: "MEDIUM",   title: "OpenSSL downgrade attack affecting TLS handshakes",        source: "OpenSSL",          time: "5h ago"  },
  { id: "tf5", level: "MEDIUM",   title: "Supply-chain typosquat targeting npm registry",            source: "Socket.dev",       time: "9h ago"  },
];

const rand    = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const sha     = () => Array.from({ length: 7 }, () => "0123456789abcdef"[randInt(0, 15)]).join("");

function buildPipeline(action, severity) {
  const blocked = action === "BLOCK";
  const failAt  = blocked ? randInt(2, 4) : 99;
  const names   = ["Checkout","Code Scan","Docker Build","Trivy Scan","Policy Gate","Deploy"];
  return names.map((name, i) => {
    let status = "passed";
    if (i === failAt)     status = "failed";
    else if (i > failAt)  status = "skipped";
    const logs = status === "failed"
      ? [`$ running ${name.toLowerCase()}`, `[error] ${severity} severity finding detected`, `[gate] policy violation — blocking deploy`]
      : status === "skipped"
        ? ["[skipped] upstream stage failed"]
        : [`$ running ${name.toLowerCase()}`, `[ok] ${name} completed`, "[ok] no blocking issues"];
    return { id: `${name}-${i}`, name, status, duration_ms: status === "skipped" ? 0 : randInt(800, 14000), logs };
  });
}

function makeScan(ageMinutes, forceStatus) {
  const action   = Math.random() < 0.34 ? "BLOCK" : "ALLOW";
  const severity = action === "BLOCK"
    ? rand(["CRITICAL","HIGH","HIGH","MEDIUM"])
    : rand(["LOW","CLEAN","CLEAN","MEDIUM"]);
  const risk = severity === "CRITICAL" ? randInt(8,10) : severity === "HIGH" ? randInt(6,8) : severity === "MEDIUM" ? randInt(4,6) : randInt(0,3);
  const fixableCount = action === "BLOCK" ? randInt(1, 3) : 0;
  const fixable  = Array.from({ length: fixableCount }, () => rand(PACKAGES));
  const baseCount = randInt(0, 18);
  const appCount  = randInt(0, 6);
  const total     = fixableCount + baseCount + appCount;
  return {
    id:             `scan_${sha()}${sha()}`,
    repo_name:      rand(REPOS),
    branch:         rand(BRANCHES),
    commit_sha:     sha(),
    commit_message: rand(MESSAGES),
    author:         rand(AUTHORS),
    scan_type:      rand(SCAN_TYPES),
    status:         forceStatus ?? "completed",
    severity,
    action_taken:   action,
    risk_score:     risk,
    created_at:     new Date(Date.now() - ageMinutes * 60_000).toISOString(),
    ai_confidence:  randInt(72, 98),
    duration_ms:    randInt(4000, 38000),
    ai_explanation: action === "BLOCK"
      ? `The ${rand(SCAN_TYPES).replace(/-/g," ")} flagged ${fixableCount} fixable issue(s). Risk vector concentrated in transitive dependencies; remediation available via version bump.`
      : "No exploitable conditions detected. Dependency tree and image layers within policy thresholds.",
    human_summary: action === "BLOCK"
      ? `We stopped this deploy because it contained ${fixableCount} known-vulnerable package${fixableCount === 1 ? "" : "s"}. A patched version already exists, so the fix is quick.`
      : "This change passed every security gate cleanly and was allowed to deploy.",
    ai_fix: action === "BLOCK" && fixable.length > 0 ? fixable.map(f => f.fix).join(", ") : undefined,
    ai_urgency: action === "BLOCK"
      ? (severity === "CRITICAL" ? "Fix right now" : severity === "HIGH" ? "Fix before next deploy" : "Monitor")
      : undefined,
    allow_reason: action === "ALLOW"
      ? "Dependency tree and image layers are within policy thresholds. No exploitable conditions detected."
      : undefined,
    vuln_breakdown: {
      total, base_image_count: baseCount, fixable_count: fixableCount, app_count: appCount,
      base_image_note: baseCount > 8 ? "Most CVEs originate from the base image and are not directly fixable in your code." : undefined,
      fixable_details: fixable.map((f, i) => ({ ...f, id: `${f.id}-${i}` })),
    },
    pipeline: buildPipeline(action, severity),
  };
}

function generateDemoScans(count = 64) {
  const scans = [makeScan(1, "running"), makeScan(3, "running")];
  for (let i = 0; i < count; i++) scans.push(makeScan(randInt(5, 60 * 24 * 7)));
  return scans.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

// ── useScans hook ─────────────────────────────────────────────────────────────
function useScans() {
  const [scans,       setScans]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [source,      setSource]      = useState("demo");
  const [lastUpdated, setLastUpdated] = useState(null);
  const demoRef    = useRef([]);
  const retryCount = useRef(0);
  const retryTimer = useRef(null);

  const seedDemo = useCallback(() => {
    if (demoRef.current.length === 0) demoRef.current = generateDemoScans();
    setScans(demoRef.current);
    setSource("demo");
    setLastUpdated(fmtTime(new Date()));
    setLoading(false);
  }, []);

  const fetchAll = useCallback(async () => {
    if (!API) { seedDemo(); return; }
    try {
      const res = await axios.get(`${API}/api/scan-results`, { timeout: 10000 });
      const data = Array.isArray(res.data) ? res.data : [];
      if (data.length === 0) throw new Error("empty");
      setScans(data); setSource("live"); setLastUpdated(fmtTime(new Date())); setLoading(false);
      retryCount.current = 0; clearTimeout(retryTimer.current);
    } catch {
      retryCount.current += 1;
      if (retryCount.current <= 3) {
        const delay = retryCount.current * 3000;
        clearTimeout(retryTimer.current);
        retryTimer.current = setTimeout(fetchAll, delay);
      }
      seedDemo();
    }
  }, [seedDemo]);

  useEffect(() => {
    fetchAll();
    const WS_URL = API.replace("https://","wss://").replace("http://","ws://");
    let ws, reconnectTimer, pingTimer;
    const debouncedFetch = { current: null };
    const connect = () => {
      ws = new WebSocket(`${WS_URL}/ws`);
      ws.onopen  = () => { pingTimer = setInterval(() => { if (ws.readyState === WebSocket.OPEN) ws.send("ping"); }, 30000); };
      ws.onmessage = () => { clearTimeout(debouncedFetch.current); debouncedFetch.current = setTimeout(fetchAll, 500); };
      ws.onclose = () => { clearInterval(pingTimer); reconnectTimer = setTimeout(connect, 3000); };
      ws.onerror = () => { ws.close(); };
    };
    connect();
    return () => { clearInterval(pingTimer); clearTimeout(reconnectTimer); clearTimeout(retryTimer.current); if (ws) ws.close(); };
  }, [fetchAll]);

  // Keep at least one running scan in demo mode
  useEffect(() => {
    if (source !== "demo") return;
    const interval = setInterval(() => {
      setScans(prev => {
        if (!prev.length) return prev;
        const next = [...prev];
        const idx = next.findIndex(s => s.status === "running");
        if (idx !== -1) next[idx] = { ...next[idx], status: "completed" };
        if (!next.some(s => s.status === "running")) {
          const fresh = demoRef.current.find(s => s.status === "running");
          if (fresh) next.unshift({ ...fresh, id: `scan_live_${Date.now()}`, created_at: new Date().toISOString() });
        }
        return next;
      });
      setLastUpdated(fmtTime(new Date()));
    }, 15000);
    return () => clearInterval(interval);
  }, [source]);

  const refresh = useCallback(() => {
    setLoading(true);
    if (source === "demo") demoRef.current = generateDemoScans();
    fetchAll();
  }, [fetchAll, source]);

  return useMemo(() => ({ scans, loading, source, lastUpdated, refresh }), [scans, loading, source, lastUpdated, refresh]);
}

// ── useStats hook ─────────────────────────────────────────────────────────────
function useStats(scans) {
  return useMemo(() => {
    const running   = scans.filter(s => s.status === "running");
    const completed = scans.filter(s => s.status !== "running");
    const blocked   = completed.filter(s => s.action_taken === "BLOCK");
    const allowed   = completed.filter(s => s.action_taken === "ALLOW");
    const withAI    = completed.filter(s => s.ai_explanation);

    const avgRisk = completed.length
      ? +(completed.reduce((a, s) => a + (s.risk_score || 0), 0) / completed.length).toFixed(1)
      : 0;

    const healthScore = (() => {
      if (!completed.length) return 100;
      return Math.max(0, Math.min(100, Math.round(100 - (blocked.length / completed.length) * 40 - avgRisk * 6)));
    })();

    const avgConfidence = withAI.length
      ? Math.round(withAI.reduce((a, s) => a + (s.ai_confidence || 0), 0) / withAI.length)
      : 0;

    const SEVERITY_ORDER = ["CRITICAL","HIGH","MEDIUM","LOW","CLEAN"];
    const sevData = SEVERITY_ORDER
      .map(name => ({ name, value: scans.filter(s => (s.severity||"").toUpperCase() === name).length, color: severityColor(name) }))
      .filter(d => d.value > 0);

    const trendData = [...scans]
      .filter(s => s.created_at && s.risk_score != null)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .slice(-24)
      .map(s => ({ date: fmt(s.created_at), risk: s.risk_score || 0, sha: s.commit_sha?.slice(0,7) }));

    // Repo health — capped CVE penalty so active repos aren't always D
    const repoMap = {};
    for (const s of completed) {
      const r = repoMap[s.repo_name] || { total:0, blocked:0, cves:0, secrets:0, lastScan: s.created_at };
      r.total++;
      if (s.action_taken === "BLOCK") r.blocked++;
      r.cves += s.vuln_breakdown?.fixable_count || 0;
      if (s.scan_type === "secret-scan" && s.action_taken === "BLOCK") r.secrets++;
      if (new Date(s.created_at) > new Date(r.lastScan)) r.lastScan = s.created_at;
      repoMap[s.repo_name] = r;
    }
    const repos = Object.entries(repoMap).map(([name, r]) => {
      const health = Math.max(0, Math.round(100 - (r.blocked / Math.max(1,r.total)) * 40 - Math.min(r.cves,15) * 2));
      const grade  = health >= 90 ? "A+" : health >= 80 ? "A" : health >= 65 ? "B" : health >= 50 ? "C" : "D";
      return { name, ...r, health, grade };
    }).sort((a,b) => a.health - b.health);

    // Feedback counts
    const feedbackCounts = { accurate:0, incorrect:0, partial:0, total:0 };
    withAI.forEach(s => {
      if (s.ai_feedback === "accept") { feedbackCounts.accurate++;  feedbackCounts.total++; }
      if (s.ai_feedback === "reject") { feedbackCounts.incorrect++; feedbackCounts.total++; }
      if (s.ai_feedback === "edit")   { feedbackCounts.partial++;   feedbackCounts.total++; }
    });
    const accuracyPct = feedbackCounts.total
      ? Math.round((feedbackCounts.accurate / feedbackCounts.total) * 100)
      : null;

    // Top risky packages by occurrence
    const tally = {};
    completed.forEach(s => (s.vuln_breakdown?.fixable_details || []).forEach(v => {
      const key = v.package || v.id || "unknown";
      if (!tally[key]) tally[key] = { name: key, count: 0, severity: v.severity };
      tally[key].count++;
    }));
    const topRisks = Object.values(tally).sort((a,b) => b.count - a.count).slice(0,5);

    // Daily volume
    const dayMap = {};
    [...scans].sort((a,b) => new Date(a.created_at) - new Date(b.created_at)).forEach(s => {
      if (!s.created_at) return;
      const d = new Date(s.created_at);
      if (isNaN(d.getTime())) return;
      const key = d.toISOString().slice(0,10);
      if (!dayMap[key]) dayMap[key] = { date: fmt(s.created_at), allowed:0, blocked:0 };
      if (s.action_taken === "BLOCK") dayMap[key].blocked++; else dayMap[key].allowed++;
    });
    const weekData = Object.values(dayMap).slice(-10);

    const gateData = [
      { name:"Allowed", value: allowed.length, color: C.teal },
      { name:"Blocked", value: blocked.length, color: C.red  },
    ].filter(d => d.value > 0);

    return { running, completed, blocked, allowed, withAI, avgRisk, healthScore, avgConfidence, sevData, trendData, repos, feedbackCounts, accuracyPct, topRisks, weekData, gateData };
  }, [scans]);
}

// ── Empty states ──────────────────────────────────────────────────────────────
const EmptyChart = () => (
  <div style={{ height:150, display:"flex", alignItems:"center", justifyContent:"center", color:C.inkLow, fontSize:13 }}>No data yet</div>
);
const EmptyState = ({ text }) => (
  <div style={{ color:C.inkLow, fontSize:13, padding:"24px 0", textAlign:"center" }}>{text}</div>
);

// ── Shared primitives ─────────────────────────────────────────────────────────
const Badge = ({ color, children, small }) => (
  <span style={{
    display:"inline-flex", alignItems:"center", gap:3,
    padding: small ? "2px 7px" : "3px 10px",
    borderRadius:999, fontSize: small ? 9 : 10, fontWeight:700,
    background: color+"18", color, border:`1px solid ${color}30`,
    whiteSpace:"nowrap", letterSpacing:"0.05em", fontFamily:C.mono,
  }}>{children}</span>
);

const Card = ({ children, style, glow }) => (
  <div style={{
    background:C.bgCard, borderRadius:14,
    border:`1px solid ${glow ? C.tealBord : C.border}`,
    padding:"18px 20px", marginBottom:12,
    boxShadow: glow ? `0 0 24px ${C.teal}10` : "none",
    ...style,
  }}>{children}</div>
);

const SectionTitle = ({ children, accent }) => (
  <div style={{ fontSize:9, fontWeight:800, color: accent || C.inkLow, letterSpacing:"0.15em", textTransform:"uppercase", marginBottom:14, display:"flex", alignItems:"center", gap:6 }}>
    {accent && <span style={{ width:3, height:10, background:accent, borderRadius:2, display:"inline-block" }} />}
    {children}
  </div>
);

const Skeleton = ({ w="100%", h=16, r=6 }) => (
  <div style={{ width:w, height:h, borderRadius:r, background:C.bgSurface, animation:"shimmer 1.4s ease infinite" }} />
);
const SkeletonCard = () => (
  <div style={{ background:C.bgCard, borderRadius:14, border:`1px solid ${C.border}`, padding:"18px 20px", marginBottom:10 }}>
    <div style={{ display:"flex", gap:10, marginBottom:12 }}><Skeleton w={80} h={12} /><Skeleton w={60} h={12} /></div>
    <Skeleton h={14} /><div style={{ marginTop:8 }}><Skeleton w="60%" h={10} /></div>
  </div>
);

// ── Health Ring ───────────────────────────────────────────────────────────────
const HealthRing = ({ score, size=120 }) => {
  const r     = (size - 16) / 2;
  const circ  = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 75 ? C.teal : score >= 50 ? C.amber : C.red;
  const label = score >= 75 ? "Healthy" : score >= 50 ? "At Risk" : "Critical";
  return (
    <div style={{ position:"relative", width:size, height:size, flexShrink:0 }}>
      <svg width={size} height={size} style={{ transform:"rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.bgSurface} strokeWidth={8} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition:"stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)", filter:`drop-shadow(0 0 6px ${color}88)` }}
        />
      </svg>
      <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
        <div style={{ fontSize:24, fontWeight:900, color:C.ink, fontFamily:C.mono, lineHeight:1 }}>{score}</div>
        <div style={{ fontSize:8, color, fontWeight:700, letterSpacing:"0.1em", marginTop:2 }}>{label}</div>
      </div>
    </div>
  );
};

// ── StatCard ──────────────────────────────────────────────────────────────────
const StatCard = ({ icon:Icon, label, value, color, sub, trend }) => (
  <div style={{ background:C.bgCard, borderRadius:14, border:`1px solid ${C.border}`, padding:"16px 18px", display:"flex", flexDirection:"column", gap:8, position:"relative", overflow:"hidden" }}>
    <div style={{ position:"absolute", top:0, right:0, width:60, height:60, background:color+"08", borderRadius:"0 14px 0 60px" }} />
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
      <div style={{ background:color+"15", borderRadius:9, padding:7 }}><Icon size={14} color={color} strokeWidth={2.5} /></div>
      {trend !== undefined && <span style={{ fontSize:9, color: trend>=0?C.teal:C.red, fontWeight:700, fontFamily:C.mono }}>{trend>=0?"▲":"▼"} {Math.abs(trend)}%</span>}
    </div>
    <div style={{ fontSize:28, fontWeight:900, color:C.ink, lineHeight:1, fontFamily:C.mono }}>{value}</div>
    <div style={{ fontSize:11, color:C.inkMid, fontWeight:600 }}>{label}</div>
    {sub && <div style={{ fontSize:10, color:C.inkLow }}>{sub}</div>}
  </div>
);

// ── VulnBreakdown ─────────────────────────────────────────────────────────────
const VulnBreakdown = ({ breakdown }) => {
  const [open, setOpen] = useState(false);
  if (!breakdown) return null;
  const { base_image_count=0, fixable_count=0, app_count=0, total=0, fixable_details=[], base_image_note } = breakdown;
  return (
    <div style={{ marginTop:10, border:`1px solid ${C.border}`, borderRadius:10, overflow:"hidden" }}>
      <button onClick={() => setOpen(o=>!o)} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 12px", background:C.bgSurface, border:"none", cursor:"pointer", fontSize:11, fontWeight:700, color:C.inkMid }}>
        <span style={{ display:"flex", alignItems:"center", gap:6 }}><Package size={12} />{total} CVEs — {base_image_count} base · {fixable_count} fixable · {app_count} other</span>
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {open && (
        <div style={{ padding:"10px 12px", background:C.bgCard, fontSize:12 }}>
          {base_image_note && (
            <div style={{ display:"flex", gap:8, padding:"8px 10px", borderRadius:8, background:C.amberSoft, border:`1px solid ${C.amberBord}`, marginBottom:10, color:C.amber, lineHeight:1.5 }}>
              <Info size={13} style={{ flexShrink:0, marginTop:1 }} /><span>{base_image_note}</span>
            </div>
          )}
          {fixable_details.length > 0 && (
            <>
              <div style={{ fontSize:10, fontWeight:700, color:C.red, marginBottom:6, letterSpacing:"0.06em" }}>⚠ FIXABLE — ACTION REQUIRED</div>
              {fixable_details.map(v => (
                <div key={v.id} style={{ display:"flex", gap:8, alignItems:"flex-start", padding:"6px 0", borderBottom:`1px solid ${C.border}` }}>
                  <Badge color={severityColor(v.severity)} small>{v.severity}</Badge>
                  <div style={{ flex:1 }}>
                    <span style={{ fontFamily:C.mono, fontSize:10, color:C.blue }}>{v.id}</span>
                    <span style={{ color:C.inkMid, marginLeft:6 }}>{v.package}</span>
                    <div style={{ fontSize:10, color:C.teal, marginTop:2 }}>Fix: {v.fix}</div>
                  </div>
                </div>
              ))}
            </>
          )}
          {fixable_count === 0 && <div style={{ color:C.teal, fontSize:11, padding:"4px 0" }}>✓ No fixable CVEs</div>}
        </div>
      )}
    </div>
  );
};

// ── FixDiffView ───────────────────────────────────────────────────────────────
const FixDiffView = ({ scan }) => {
  const [copied, setCopied] = useState(false);
  const lines = useMemo(() => {
    const fixable = scan.vuln_breakdown?.fixable_details || [];
    if (fixable.length > 0) return fixable.slice(0,5).map(v => ({ before: v.package, after: v.fix || `${v.package} (upgrade)`, id: v.id }));
    if (scan.ai_fix) return [{ before: "current version", after: scan.ai_fix, id: null }];
    return [];
  }, [scan]);
  if (!lines.length) return null;

  const handleCopy = async () => {
    const text = lines.map(l => `- ${l.before}\n+ ${l.after}`).join("\n");
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
      else {
        const ta = document.createElement("textarea");
        ta.value = text; ta.style.cssText = "position:fixed;opacity:0";
        document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
      }
      setCopied(true); setTimeout(() => setCopied(false), 1600);
    } catch { setCopied(false); }
  };

  return (
    <div style={{ marginTop:10, border:`1px solid ${C.border}`, borderRadius:10, overflow:"hidden" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 12px", background:C.bgSurface }}>
        <span style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, fontWeight:700, color:C.inkMid }}><GitPullRequest size={12} color={C.teal} /> Suggested fix</span>
        <button onClick={handleCopy} style={{ display:"flex", alignItems:"center", gap:4, padding:"3px 9px", borderRadius:7, border:`1px solid ${C.border}`, background:C.bgCard, color: copied?C.teal:C.inkMid, cursor:"pointer", fontSize:10, fontWeight:600 }}>
          {copied ? <Check size={10} /> : <Copy size={10} />}{copied ? "Copied" : "Copy diff"}
        </button>
      </div>
      <div style={{ background:"#0a0e13", fontFamily:C.mono, fontSize:12 }}>
        {lines.map((l, i) => (
          <React.Fragment key={i}>
            <div style={{ padding:"3px 14px", background:C.redSoft, color:"#ff8a9c", display:"flex", gap:8 }}>
              <span style={{ color:C.red, userSelect:"none" }}>−</span>{l.before}
              {l.id && <span style={{ marginLeft:"auto", color:C.inkLow, fontSize:10 }}>{l.id}</span>}
            </div>
            <div style={{ padding:"3px 14px", background:C.tealSoft, color:"#8af0d4", display:"flex", gap:8 }}>
              <span style={{ color:C.teal, userSelect:"none" }}>+</span>{l.after}
            </div>
            {i < lines.length-1 && <div style={{ height:6 }} />}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

// ── WhyBlocked Modal ──────────────────────────────────────────────────────────
const buildWhyBlocked = (scan) => {
  const sev = (scan.severity||"").toUpperCase();
  const fixable = scan.vuln_breakdown?.fixable_details || [];
  const fixableCount = scan.vuln_breakdown?.fixable_count ?? fixable.length;
  const totalCves = scan.vuln_breakdown?.total ?? 0;
  const worst = fixable[0];
  const human = scan.human_summary ||
    `This deploy was stopped because the pipeline found ${fixableCount>0?`${fixableCount} fixable security issue${fixableCount===1?"":"s"}`:"a policy violation"}${sev?` rated ${sev}`:""}.${worst?` The most serious one is in ${worst.package} (${worst.id}), which already has a known fix available.`:""} Nothing reached production — the gate caught it before deploy.`;
  const technical = scan.ai_explanation ||
    `Scan type: ${(scan.scan_type||"unknown").replace(/-/g," ")}. Risk score ${scan.risk_score??"—"}/10. ${totalCves?`${totalCves} CVEs detected, ${fixableCount} with available fixes.`:""} Policy engine action: ${scan.action_taken}.`;
  const business = scan.business_impact ||
    `${sev==="CRITICAL"?"A critical-severity issue reaching production could mean direct exploitation risk — data exposure, lateral movement, or service compromise.":sev==="HIGH"?"A high-severity gap left unpatched raises the chance of exploitation, especially if this image is internet-facing.":"Low business risk on its own, but unpatched CVEs compound over time and widen the attack surface."} Blocking here costs a few minutes of remediation now, versus an incident response later.`;
  return { human, technical, business };
};

const WhyBlockedModal = ({ scan, onClose }) => {
  const [activeTab, setActiveTab] = useState("human");
  const content = useMemo(() => buildWhyBlocked(scan), [scan]);

  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const tabs = [
    { id:"human",     label:"Human",     emoji:"🗣" },
    { id:"technical", label:"Technical", emoji:"⚙" },
    { id:"business",  label:"Business",  emoji:"💼" },
  ];

  return (
    <div style={{ position:"fixed", inset:0, zIndex:250, background:"rgba(0,0,0,0.72)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={onClose}>
      <div style={{ width:"100%", maxWidth:560, background:C.bgCard, borderRadius:16, border:`1px solid ${C.redBord}`, boxShadow:`0 24px 64px rgba(0,0,0,0.8), 0 0 40px ${C.red}10`, overflow:"hidden" }} onClick={e=>e.stopPropagation()}>
        <div style={{ padding:"16px 20px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12, background:C.redSoft }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
              <XCircle size={15} color={C.red} />
              <span style={{ fontSize:14, fontWeight:800, color:C.ink }}>Why was this blocked?</span>
            </div>
            <div style={{ fontSize:11, color:C.inkMid, fontFamily:C.mono }}>
              {scan.commit_sha?.slice(0,8)} · {scan.repo_name} · {fmt(scan.created_at)}
              <Badge color={severityColor(scan.severity)} small style={{ marginLeft:8 }}>{scan.severity}</Badge>
            </div>
          </div>
          <button onClick={onClose} style={{ border:"none", background:"none", cursor:"pointer", color:C.inkMid }}><X size={16} /></button>
        </div>
        <div style={{ display:"flex", gap:4, padding:"12px 20px 0" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ padding:"7px 14px", borderRadius:"9px 9px 0 0", border:"none", cursor:"pointer", fontSize:12, fontWeight:700, fontFamily:C.sans, background: activeTab===t.id?C.bgSurface:"transparent", color: activeTab===t.id?C.ink:C.inkMid, borderBottom: activeTab===t.id?`2px solid ${C.red}`:"2px solid transparent", display:"flex", alignItems:"center", gap:6 }}>
              <span>{t.emoji}</span>{t.label}
            </button>
          ))}
        </div>
        <div style={{ padding:"18px 20px 20px", background:C.bgSurface, maxHeight:"50vh", overflowY:"auto" }}>
          <div style={{ fontSize:13, color:C.ink, lineHeight:1.7 }}>{content[activeTab]}</div>
          {activeTab === "technical" && scan.vuln_breakdown && <VulnBreakdown breakdown={scan.vuln_breakdown} />}
          {activeTab === "technical" && <FixDiffView scan={scan} />}
          {activeTab === "technical" && scan.ai_fix && (
            <div style={{ marginTop:14, padding:"10px 14px", borderRadius:10, background:C.tealSoft, border:`1px solid ${C.tealBord}`, fontSize:12, color:C.inkMid, lineHeight:1.6 }}>
              <strong style={{ color:C.teal, display:"block", marginBottom:4, fontSize:10, letterSpacing:"0.08em" }}>RECOMMENDED FIX</strong>
              {scan.ai_fix}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Pipeline Timeline ─────────────────────────────────────────────────────────
const STAGES = [
  { key:"checkout",  label:"Checkout",  icon:"⬇" },
  { key:"code_scan", label:"Code Scan", icon:"🔍" },
  { key:"docker",    label:"Docker",    icon:"🐳" },
  { key:"trivy",     label:"Trivy",     icon:"🛡" },
  { key:"policy",    label:"Policy",    icon:"⚖" },
  { key:"ai",        label:"AI",        icon:"⚡" },
  { key:"deploy",    label:"Deploy",    icon:"🚀" },
];

const stageStatus = (scan, key) => {
  const s = (scan.pipeline_steps||{})[key];
  if (s) {
    const r = String(s.result||s.status||"").toUpperCase();
    if (["PASS","SUCCESS","SCANNED"].includes(r)) return "success";
    if (["BLOCK","FAILED"].includes(r))            return "failed";
    if (r === "SKIPPED")                            return "skipped";
    if (r === "RUNNING")                            return "running";
    return "pending";
  }
  const bl = scan.action_taken === "BLOCK";
  const done = scan.status === "complete" || scan.status === "completed";
  const isCode = scan.scan_type === "code-scan";
  if (!done)           return key === "checkout" ? "running" : "pending";
  if (key==="checkout")  return "success";
  if (key==="code_scan") return bl && isCode ? "failed" : "success";
  if (key==="docker")    return isCode ? "skipped" : "success";
  if (key==="trivy")     return isCode ? "skipped" : "success";
  if (key==="policy")    return isCode ? "skipped" : bl ? "failed" : "success";
  if (key==="ai")        return scan.ai_explanation ? "success" : "skipped";
  if (key==="deploy")    return isCode ? "skipped" : bl ? "failed" : "success";
  return "pending";
};

const stageColor = (st) => ({ success:C.teal, failed:C.red, running:C.blue, skipped:C.inkLow, pending:C.bgSurface }[st]||C.bgSurface);

const PipelineTimeline = ({ scan }) => (
  <div style={{ display:"flex", alignItems:"center", margin:"14px 0 4px", overflowX:"auto", gap:0 }}>
    {STAGES.map((stage, i) => {
      const status = stageStatus(scan, stage.key);
      const color  = stageColor(status);
      const detail = scan.pipeline_steps?.[stage.key]?.detail || status;
      return (
        <React.Fragment key={stage.key}>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center", minWidth:56 }}>
            <div style={{ width:28, height:28, borderRadius:"50%", background: status==="pending"?C.bgSurface:color+"18", border:`2px solid ${color}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, flexShrink:0, boxShadow: status!=="pending"&&status!=="skipped"?`0 0 10px ${color}44`:"none", animation: status==="running"?"pulse 1.5s ease-in-out infinite":"none" }}>
              {status==="success" && <span style={{ color:C.teal,   fontSize:11 }}>✓</span>}
              {status==="failed"  && <span style={{ color:C.red,    fontSize:11 }}>✗</span>}
              {status==="running" && <span style={{ color:C.blue,   fontSize:8  }}>●</span>}
              {status==="skipped" && <span style={{ color:C.inkLow, fontSize:9  }}>–</span>}
              {status==="pending" && <span style={{ color:C.inkLow, fontSize:9  }}>·</span>}
            </div>
            <div style={{ fontSize:9, color:C.inkMid, marginTop:5, textAlign:"center", whiteSpace:"nowrap" }}>{stage.label}</div>
            <div style={{ fontSize:8, color, fontWeight:700, textAlign:"center", whiteSpace:"nowrap", maxWidth:56, overflow:"hidden", textOverflow:"ellipsis" }}>{detail}</div>
          </div>
          {i < STAGES.length-1 && (
            <div style={{ flex:1, height:2, minWidth:8, background: stageStatus(scan, STAGES[i+1].key)!=="pending"?color+"60":C.border, marginBottom:24, flexShrink:0, transition:"background 0.3s" }} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

// ── CommitCard ────────────────────────────────────────────────────────────────
const CommitCard = ({ scan, feedback, onFeedback, onOpenWhyBlocked }) => {
  const [expanded, setExpanded] = useState(false);
  const bl        = scan.action_taken === "BLOCK";
  const isRunning = scan.status === "running";
  const accentColor = isRunning ? C.blue : bl ? C.red : C.teal;
  return (
    <div style={{ background:C.bgCard, borderRadius:14, border:`1px solid ${C.border}`, borderLeft:`3px solid ${accentColor}`, padding:"14px 16px", marginBottom:10 }}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:10, flexWrap:"wrap" }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:7, flexWrap:"wrap", marginBottom:5 }}>
            <span style={{ fontFamily:C.mono, fontSize:12, color:C.blue, fontWeight:700 }}>{scan.commit_sha?.slice(0,8)||"—"}</span>
            {isRunning ? <Badge color={C.blue}><span style={{ display:"inline-flex", alignItems:"center", gap:4 }}><span style={{ width:5, height:5, borderRadius:"50%", background:C.blue, animation:"blink 1s infinite", display:"inline-block" }} />RUNNING</span></Badge>
              : <Badge color={bl?C.red:C.teal}>{scan.action_taken||"—"}</Badge>}
            {!isRunning && scan.severity  && <Badge color={severityColor(scan.severity)}>{scan.severity}</Badge>}
            {scan.risk_score!=null && !isRunning && <Badge color={riskColor(scan.risk_score)} small>Risk {scan.risk_score}/10</Badge>}
            {scan.ai_urgency && !isRunning && <Badge color={scan.ai_urgency==="Fix right now"?C.red:scan.ai_urgency==="Fix before next deploy"?C.amber:C.inkMid} small>{scan.ai_urgency}</Badge>}
          </div>
          <div style={{ fontSize:13, color:C.ink, fontWeight:600, marginBottom:3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{scan.commit_message||scan.repo_name||"—"}</div>
          <div style={{ fontSize:11, color:C.inkMid }}>{scan.repo_name} · {scan.branch} · {fmt(scan.created_at)}</div>
        </div>
        <button onClick={() => setExpanded(e=>!e)} style={{ border:`1px solid ${C.border}`, borderRadius:8, background:C.bgSurface, padding:"5px 10px", cursor:"pointer", fontSize:11, color:C.inkMid, display:"flex", alignItems:"center", gap:4, flexShrink:0 }}>
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}{expanded?"Less":"Details"}
        </button>
      </div>

      <PipelineTimeline scan={scan} />

      {expanded && (
        <div style={{ marginTop:12, paddingTop:14, borderTop:`1px solid ${C.border}` }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
            {[
              { label:"REPO / BRANCH", value:`${scan.repo_name||"—"} / ${scan.branch||"—"}` },
              { label:"SCANNED AT",    value:fmtFull(scan.created_at) },
              { label:"SCAN TYPE",     value:(scan.scan_type||"").toUpperCase().replace(/-/g," ")+" PIPELINE" },
              { label:"COMMIT SHA",    value:scan.commit_sha?.slice(0,12)||"—", mono:true },
            ].map(({ label, value, mono }) => (
              <div key={label}>
                <div style={{ fontSize:9, color:C.inkLow, fontWeight:800, letterSpacing:"0.1em", marginBottom:3 }}>{label}</div>
                <div style={{ fontSize:12, color:C.inkMid, fontFamily: mono?C.mono:"inherit" }}>{value}</div>
              </div>
            ))}
          </div>

          {scan.vuln_breakdown && <VulnBreakdown breakdown={scan.vuln_breakdown} />}

          {scan.allow_reason && (
            <div style={{ marginTop:12, padding:"10px 14px", borderRadius:10, background:C.tealSoft, border:`1px solid ${C.tealBord}`, fontSize:12, color:C.inkMid, lineHeight:1.6 }}>
              <strong style={{ color:C.teal, display:"block", marginBottom:4, fontSize:10, letterSpacing:"0.08em" }}>✓ WHY THIS WAS ALLOWED</strong>
              {scan.allow_reason}
            </div>
          )}

          {bl && !isRunning && (
            <div style={{ marginTop:12 }}>
              <button onClick={() => onOpenWhyBlocked(scan)} style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 11px", borderRadius:8, border:`1px solid ${C.redBord}`, background:C.redSoft, color:C.red, cursor:"pointer", fontSize:11, fontWeight:700 }}>
                <AlertTriangle size={11} /> Why blocked?
              </button>
            </div>
          )}

          {scan.ai_explanation && (
            <div style={{ marginTop:12 }}>
              <div style={{ fontSize:9, color:C.violet, fontWeight:800, letterSpacing:"0.1em", marginBottom:8, display:"flex", alignItems:"center", gap:6 }}>
                <Zap size={10} color={C.violet} /> AI ANALYSIS
              </div>
              <div style={{ fontSize:12, color:C.inkMid, lineHeight:1.7, background:C.violetSoft, borderRadius:10, padding:"12px 14px", border:`1px solid ${C.violetBord}` }}>
                {scan.ai_explanation}
              </div>
              {scan.ai_fix && (
                <div style={{ marginTop:8, fontSize:12, color:C.inkMid, background:C.tealSoft, borderRadius:10, padding:"10px 14px", border:`1px solid ${C.tealBord}` }}>
                  <strong style={{ color:C.teal, display:"block", marginBottom:4, fontSize:10, letterSpacing:"0.08em" }}>REMEDIATION</strong>
                  {scan.ai_fix}
                </div>
              )}
              <FixDiffView scan={scan} />
              {scan.ai_urgency && (
                <div style={{ marginTop:8, display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontSize:10, color:C.inkLow, fontWeight:700, letterSpacing:"0.08em" }}>URGENCY</span>
                  <Badge color={scan.ai_urgency==="Fix right now"?C.red:scan.ai_urgency==="Fix before next deploy"?C.amber:C.inkMid} small>{scan.ai_urgency}</Badge>
                </div>
              )}
              <div style={{ marginTop:10, display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:10, color:C.inkLow }}>WAS THIS HELPFUL?</span>
                {feedback[scan.id] ? (
                  <Badge color={feedback[scan.id]==="error"?C.red:feedback[scan.id]==="accept"?C.teal:C.amber} small>
                    {feedback[scan.id]==="error"?"Error":feedback[scan.id]==="accept"?"Marked accurate":"Marked incorrect"}
                  </Badge>
                ) : (
                  <>
                    <button onClick={() => onFeedback(scan.id,"accept")} style={{ border:`1px solid ${C.border}`, borderRadius:7, background:C.bgSurface, padding:"3px 10px", cursor:"pointer", fontSize:11, color:C.inkMid }}>Accurate</button>
                    <button onClick={() => onFeedback(scan.id,"reject")} style={{ border:`1px solid ${C.border}`, borderRadius:7, background:C.bgSurface, padding:"3px 10px", cursor:"pointer", fontSize:11, color:C.inkMid }}>Incorrect</button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Repo Health ───────────────────────────────────────────────────────────────
const RepoHealthSection = ({ scans }) => {
  const repos = useMemo(() => {
    const byRepo = {};
    scans.forEach(s => {
      const key = s.repo_name || "unknown";
      if (!byRepo[key]) byRepo[key] = [];
      byRepo[key].push(s);
    });
    return Object.entries(byRepo).map(([repo, list]) => {
      const completed = list.filter(s => s.status !== "running");
      const blocked   = completed.filter(s => s.action_taken === "BLOCK");
      const cves      = completed.reduce((a,s) => a + (s.vuln_breakdown?.fixable_count||0), 0);
      const secrets   = completed.filter(s => s.scan_type==="secret-scan" && s.action_taken==="BLOCK").length;
      const last      = [...list].sort((a,b) => new Date(b.created_at)-new Date(a.created_at))[0];
      const health    = Math.max(0, Math.min(100, Math.round(100 - (blocked.length/Math.max(1,completed.length))*40 - Math.min(cves,15)*2)));
      const grade     = health>=90?"A+":health>=80?"A":health>=65?"B":health>=50?"C":"D";
      return { repo, health, grade, lastScan:last?.created_at, cves, secrets, totalScans:list.length };
    }).sort((a,b) => b.health - a.health);
  }, [scans]);

  if (!repos.length) return null;
  return (
    <Card>
      <SectionTitle accent={C.blue}>Repository Health</SectionTitle>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:10 }}>
        {repos.map(r => {
          const color = r.health>=80?C.teal:r.health>=50?C.amber:C.red;
          return (
            <div key={r.repo} style={{ background:C.bgCard, borderRadius:14, border:`1px solid ${C.border}`, padding:"16px 18px", position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute", top:0, left:0, width:3, height:"100%", background:color }} />
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                <div>
                  <div style={{ fontSize:13, fontWeight:800, color:C.ink, marginBottom:2 }}>{r.repo}</div>
                  <div style={{ fontSize:10, color:C.inkLow, display:"flex", alignItems:"center", gap:4 }}><Clock size={9} /> Last scan {relativeTime(r.lastScan)}</div>
                </div>
                <Badge color={color}>{r.grade}</Badge>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                <div style={{ flex:1, height:8, background:C.bgSurface, borderRadius:4, overflow:"hidden" }}>
                  <div style={{ width:`${r.health}%`, height:"100%", background:color, borderRadius:4, transition:"width 0.4s ease" }} />
                </div>
                <span style={{ fontSize:14, fontWeight:800, color, fontFamily:C.mono }}>{r.health}%</span>
              </div>
              <div style={{ display:"flex", gap:14, fontSize:11, color:C.inkMid }}>
                <span>Open CVEs <strong style={{ color:r.cves>0?C.amber:C.teal }}>{r.cves}</strong></span>
                <span>Secrets <strong style={{ color:r.secrets>0?C.red:C.teal }}>{r.secrets}</strong></span>
                <span>Scans <strong style={{ color:C.ink }}>{r.totalScans}</strong></span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

// ── Threat Feed ───────────────────────────────────────────────────────────────
const ThreatFeed = () => (
  <Card>
    <SectionTitle accent={C.amber}><Flame size={11} color={C.amber} /> Today's Threat Feed</SectionTitle>
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      {THREAT_FEED_DATA.map(t => (
        <div key={t.id} style={{ display:"flex", alignItems:"flex-start", gap:10, padding:"10px 12px", borderRadius:10, border:`1px solid ${C.border}`, background:C.bgSurface }}>
          <span style={{ marginTop:4, width:8, height:8, borderRadius:"50%", flexShrink:0, background:severityColor(t.level) }} />
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:12, color:C.ink, lineHeight:1.4 }}>{t.title}</div>
            <div style={{ marginTop:4, fontSize:10, color:C.inkLow }}>{t.source} · {t.time}</div>
          </div>
          <Badge color={severityColor(t.level)} small>{t.level}</Badge>
        </div>
      ))}
    </div>
  </Card>
);

// ── AI Copilot ────────────────────────────────────────────────────────────────
const AiCopilot = ({ stats, onAsk }) => {
  const secretsBlocked = stats.blocked.filter(s => s.scan_type === "secret-scan").length;
  const vulnPkgs = stats.blocked.reduce((a,s) => a + (s.vuln_breakdown?.fixable_count||0), 0);
  const topRepo = stats.repos[0];
  const summary = useMemo(() =>
    `Today I blocked ${stats.blocked.length} risky deploy${stats.blocked.length===1?"":"s"} across ${stats.repos.length} repositories. That includes ${secretsBlocked} exposed secret${secretsBlocked===1?"":"s"} and ${vulnPkgs} vulnerable package${vulnPkgs===1?"":"s"}. Average AI confidence is ${stats.avgConfidence}%.`,
  [stats.blocked.length, stats.repos.length, secretsBlocked, vulnPkgs, stats.avgConfidence]);

  const [typed, setTyped] = useState("");
  useEffect(() => {
    setTyped("");
    let i = 0;
    const id = setInterval(() => { i++; setTyped(summary.slice(0,i)); if (i>=summary.length) clearInterval(id); }, 18);
    return () => clearInterval(id);
  }, [summary]);

  return (
    <Card glow>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
        <div style={{ width:40, height:40, borderRadius:12, background:C.violetSoft, border:`1px solid ${C.violetBord}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <Zap size={18} color={C.violet} />
        </div>
        <div>
          <div style={{ fontSize:13, fontWeight:800, color:C.ink }}>SecureFlow AI</div>
          <div style={{ fontSize:10, color:C.inkMid, display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ width:6, height:6, borderRadius:"50%", background:C.teal, display:"inline-block" }} /> Active · monitoring
          </div>
        </div>
      </div>
      <p style={{ minHeight:80, fontSize:13, lineHeight:1.7, color:C.ink, marginBottom:14 }}>
        {typed}<span style={{ display:"inline-block", width:2, height:14, background:C.violet, marginLeft:2, verticalAlign:"middle", animation:"blink 0.6s infinite" }} />
      </p>
      {topRepo && (
        <div style={{ padding:"10px 12px", borderRadius:10, border:`1px solid ${C.amberBord}`, background:C.amberSoft, marginBottom:14 }}>
          <div style={{ fontSize:10, fontWeight:800, color:C.amber, letterSpacing:"0.06em", marginBottom:4 }}>⚠ RECOMMENDED ACTION</div>
          <div style={{ fontSize:12, color:C.ink }}><span style={{ fontFamily:C.mono, fontWeight:700 }}>{topRepo.name}</span> has the lowest health ({topRepo.health}%). Review its {topRepo.cves} open CVEs before the next release.</div>
        </div>
      )}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:14 }}>
        {[
          { label:"Blocked",    value:stats.blocked.length, color:C.red    },
          { label:"CVEs fixed", value:vulnPkgs,             color:C.amber  },
          { label:"Confidence", value:`${stats.avgConfidence}%`, color:C.violet },
        ].map(s => (
          <div key={s.label} style={{ background:C.bgSurface, borderRadius:10, padding:"8px 0", textAlign:"center" }}>
            <div style={{ fontFamily:C.mono, fontSize:16, fontWeight:900, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:9, color:C.inkLow, letterSpacing:"0.06em", textTransform:"uppercase" }}>{s.label}</div>
          </div>
        ))}
      </div>
      <button onClick={onAsk} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"10px 0", borderRadius:10, background:C.violetSoft, border:`1px solid ${C.violetBord}`, color:C.violet, cursor:"pointer", fontSize:13, fontWeight:700 }}>
        Ask SecureFlow AI <span style={{ fontSize:12 }}>↗</span>
      </button>
    </Card>
  );
};

// ── Command Palette ───────────────────────────────────────────────────────────
const CommandPalette = ({ scans, onClose, onNavigate }) => {
  const [q, setQ] = useState("");
  const inputRef  = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const results = useMemo(() => {
    if (!q.trim()) return [];
    const lq = q.toLowerCase();
    return scans.filter(s => [s.repo_name,s.branch,s.commit_sha,s.severity,s.action_taken,s.commit_message].some(v => String(v||"").toLowerCase().includes(lq))).slice(0,8);
  }, [q, scans]);

  return (
    <div style={{ position:"fixed", inset:0, zIndex:200, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"flex-start", justifyContent:"center", paddingTop:"15vh" }} onClick={onClose}>
      <div style={{ width:560, background:C.bgCard, borderRadius:16, border:`1px solid ${C.borderBright}`, boxShadow:"0 24px 64px rgba(0,0,0,0.8)", overflow:"hidden" }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex", alignItems:"center", gap:10, padding:"14px 16px", borderBottom:`1px solid ${C.border}` }}>
          <Search size={15} color={C.inkMid} />
          <input ref={inputRef} value={q} onChange={e=>setQ(e.target.value)} placeholder="Search commits, repos, CVEs, severity…" style={{ flex:1, background:"none", border:"none", outline:"none", fontSize:14, color:C.ink, fontFamily:C.sans }} />
          <kbd style={{ fontSize:10, color:C.inkLow, background:C.bgSurface, border:`1px solid ${C.border}`, borderRadius:5, padding:"2px 6px" }}>ESC</kbd>
        </div>
        {!results.length && q.trim() && <div style={{ padding:"24px 16px", textAlign:"center", color:C.inkMid, fontSize:13 }}>No results for "{q}"</div>}
        {!results.length && !q.trim() && (
          <div style={{ padding:"16px", color:C.inkLow, fontSize:12 }}>
            <div style={{ marginBottom:8, fontWeight:700, letterSpacing:"0.08em", fontSize:9 }}>QUICK TIPS</div>
            {["Search by commit SHA","Filter by severity: CRITICAL, HIGH","Find blocked pipelines"].map(tip => (
              <div key={tip} style={{ padding:"6px 0", display:"flex", alignItems:"center", gap:8 }}><Terminal size={11} color={C.inkLow} />{tip}</div>
            ))}
          </div>
        )}
        {results.map(s => (
          <div key={s.id} onClick={() => { onNavigate("pipeline"); onClose(); }} style={{ padding:"10px 16px", borderBottom:`1px solid ${C.border}`, cursor:"pointer", display:"flex", alignItems:"center", gap:10 }} onMouseEnter={e=>e.currentTarget.style.background=C.bgSurface} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            <span style={{ fontFamily:C.mono, fontSize:11, color:C.blue }}>{s.commit_sha?.slice(0,8)}</span>
            <span style={{ flex:1, fontSize:12, color:C.ink, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.commit_message||s.repo_name}</span>
            <Badge color={s.action_taken==="BLOCK"?C.red:C.teal} small>{s.action_taken}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Filter Bar ────────────────────────────────────────────────────────────────
const FilterBar = ({ filters, setFilters }) => (
  <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap", marginBottom:14 }}>
    {["ALL","ALLOW","BLOCK"].map(s => (
      <button key={s} onClick={() => setFilters(f=>({...f,action:s}))} style={{ padding:"4px 10px", borderRadius:7, border:`1px solid ${filters.action===s?C.tealBord:C.border}`, background:filters.action===s?C.tealSoft:C.bgSurface, color:filters.action===s?C.teal:C.inkMid, cursor:"pointer", fontSize:10, fontWeight:700, fontFamily:C.mono }}>{s}</button>
    ))}
    <div style={{ width:1, height:16, background:C.border }} />
    {["ALL","CRITICAL","HIGH","MEDIUM","LOW","CLEAN"].map(s => (
      <button key={s} onClick={() => setFilters(f=>({...f,severity:s}))} style={{ padding:"4px 10px", borderRadius:7, border:`1px solid ${filters.severity===s?(severityColor(s)+"40"):C.border}`, background:filters.severity===s?(severityColor(s)+"15"):C.bgSurface, color:filters.severity===s?severityColor(s):C.inkMid, cursor:"pointer", fontSize:10, fontWeight:700, fontFamily:C.mono }}>{s}</button>
    ))}
  </div>
);

// ── Confidence Panel (AI tab) ─────────────────────────────────────────────────
const ConfidencePanel = ({ accuracyPct, feedbackCounts, withAICount }) => {
  const hasSignal = feedbackCounts.total >= 5;
  const level = accuracyPct===null?null:accuracyPct>=80?"High":accuracyPct>=60?"Moderate":"Low";
  const levelColor = level==="High"?C.teal:level==="Moderate"?C.amber:C.red;
  const basis = [
    { label:"CVE / CVSS data from Trivy", met:true },
    { label:"Static scanner output (Semgrep, Gitleaks)", met:true },
    { label:"Package metadata & fix availability", met:true },
    { label:`Human feedback (${feedbackCounts.total} reviewed)`, met:hasSignal },
  ];
  return (
    <Card>
      <SectionTitle accent={C.violet}>AI Confidence</SectionTitle>
      {accuracyPct===null ? (
        <div style={{ height:80, display:"flex", alignItems:"center", justifyContent:"center", color:C.inkLow, fontSize:13 }}>Not enough feedback yet</div>
      ) : (
        <>
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
            <div style={{ flex:1, height:10, background:C.bgSurface, borderRadius:5, overflow:"hidden" }}>
              <div style={{ width:`${accuracyPct}%`, height:"100%", background:levelColor, borderRadius:5, transition:"width 0.4s ease" }} />
            </div>
            <span style={{ fontSize:16, fontWeight:800, color:levelColor, fontFamily:C.mono, minWidth:44, textAlign:"right" }}>{accuracyPct}%</span>
          </div>
          <Badge color={levelColor} small>{level} confidence</Badge>
          <div style={{ marginTop:14, paddingTop:12, borderTop:`1px solid ${C.border}` }}>
            <div style={{ fontSize:9, color:C.inkLow, fontWeight:800, letterSpacing:"0.08em", marginBottom:8 }}>BASED ON</div>
            {basis.map(b => (
              <div key={b.label} style={{ display:"flex", alignItems:"center", gap:8, padding:"4px 0", fontSize:12, color:b.met?C.inkMid:C.inkLow }}>
                <span style={{ color:b.met?C.teal:C.inkLow }}>{b.met?"✓":"○"}</span>{b.label}
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
};

// ── Notification Panel ────────────────────────────────────────────────────────
const NotificationPanel = ({ scans, onClose, onClearAll }) => (
  <div style={{ position:"absolute", top:"calc(100% + 8px)", right:0, zIndex:50, width:340, background:C.bgCard, borderRadius:14, border:`1px solid ${C.border}`, boxShadow:"0 16px 48px rgba(0,0,0,0.6)" }}>
    <div style={{ padding:"12px 14px", borderBottom:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
      <span style={{ fontSize:13, fontWeight:700, color:C.ink }}>Blocked Pipelines</span>
      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
        {scans.length > 0 && <button onClick={onClearAll} style={{ border:`1px solid ${C.border}`, borderRadius:7, background:C.bgSurface, padding:"3px 9px", cursor:"pointer", fontSize:10, color:C.inkMid, fontWeight:600 }}>Dismiss all</button>}
        <button onClick={onClose} style={{ border:"none", background:"none", cursor:"pointer", color:C.inkMid }}><X size={15} /></button>
      </div>
    </div>
    {scans.length === 0
      ? <div style={{ padding:"28px 14px", textAlign:"center", color:C.inkMid, fontSize:13 }}><CheckCircle size={24} color={C.teal} style={{ display:"block", margin:"0 auto 8px" }} />All clear</div>
      : scans.map(s => (
        <div key={s.id} style={{ padding:"10px 14px", borderBottom:`1px solid ${C.border}` }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:4 }}>
            <Badge color={C.red}>BLOCKED</Badge><span style={{ fontSize:10, color:C.inkLow }}>{fmt(s.created_at)}</span>
          </div>
          <div style={{ fontSize:12, color:C.ink, fontWeight:600, margin:"4px 0 2px" }}>{s.commit_message?.slice(0,60)||s.repo_name}</div>
          <div style={{ fontSize:11, color:C.inkMid, fontFamily:C.mono }}>{s.commit_sha?.slice(0,10)}</div>
        </div>
      ))
    }
  </div>
);

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [tab,            setTab]           = useState(() => lsGet("sf_tab","overview"));
  const [feedback,       setFeedback]      = useState({});
  const [search,         setSearch]        = useState("");
  const [filters,        setFilters]       = useState(() => lsGet("sf_filters",{ action:"ALL", severity:"ALL" }));
  const [navOpen,        setNavOpen]       = useState(false);
  const [bellOpen,       setBellOpen]      = useState(false);
  const [cmdOpen,        setCmdOpen]       = useState(false);
  const [dismissedIds,   setDismissedIds]  = useState(() => lsGet("sf_dismissed",[]));
  const [whyBlockedScan, setWhyBlockedScan] = useState(null);

  const { scans, loading, source, lastUpdated, refresh } = useScans();
  const stats = useStats(scans);
  const bellRef = useRef(null);

  useEffect(() => { lsSet("sf_tab",       tab);         }, [tab]);
  useEffect(() => { lsSet("sf_filters",   filters);     }, [filters]);
  useEffect(() => { lsSet("sf_dismissed", dismissedIds);}, [dismissedIds]);

  // ⌘K + Escape
  useEffect(() => {
    const h = (e) => {
      if ((e.metaKey||e.ctrlKey) && e.key==="k") { e.preventDefault(); setCmdOpen(o=>!o); }
      if (e.key==="Escape") { setCmdOpen(false); setBellOpen(false); setWhyBlockedScan(null); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // Close bell on outside click
  useEffect(() => {
    const h = (e) => { if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const submitFeedback = async (scanId, type) => {
    try {
      await axios.post(`${API}/api/scan-results/${scanId}/feedback`, { feedback: type });
      setFeedback(p => ({ ...p, [scanId]: type }));
    } catch {
      setFeedback(p => ({ ...p, [scanId]: "error" }));
    }
  };

  const handleClearAll = () => {
    setDismissedIds(prev => [...new Set([...prev, ...stats.blocked.map(s=>s.id)])]);
    setTimeout(() => setBellOpen(false), 600);
  };

  const undismissedBlocked = useMemo(() => stats.blocked.filter(s => !dismissedIds.includes(s.id)), [stats.blocked, dismissedIds]);

  const filtered = useMemo(() => scans.filter(s => {
    const q = search.toLowerCase().trim();
    const matchSearch = !q || [s.repo_name,s.branch,s.commit_sha,s.severity,s.action_taken,s.commit_message].some(v=>String(v||"").toLowerCase().includes(q));
    const matchAction = filters.action==="ALL"   || s.action_taken===filters.action;
    const matchSev    = filters.severity==="ALL" || (s.severity||"").toUpperCase()===filters.severity;
    return matchSearch && matchAction && matchSev;
  }), [scans, search, filters]);

  const { accuracyPct, feedbackCounts, topRisks, withAI, weekData, gateData } = stats;

  const renderNav = () => NAV.map(({ id, label, icon:Icon }) => {
    const active = tab === id;
    return (
      <button key={id} onClick={() => { setTab(id); setNavOpen(false); }} style={{ display:"flex", alignItems:"center", gap:10, width:"100%", padding:"9px 12px", borderRadius:9, border:"none", cursor:"pointer", marginBottom:2, textAlign:"left", fontSize:13, fontWeight:active?700:500, background:active?C.tealSoft:"transparent", color:active?C.teal:C.inkMid, outline:"none", transition:"background 0.15s, color 0.15s", borderLeft:active?`2px solid ${C.teal}`:"2px solid transparent" }}>
        <Icon size={15} strokeWidth={active?2.5:2} />
        <span style={{ flex:1 }}>{label}</span>
        {id==="ai" && <Badge color={C.violet} small>AI</Badge>}
      </button>
    );
  });

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:C.bg, fontFamily:C.sans, color:C.ink }}>

      {cmdOpen && <CommandPalette scans={scans} onClose={() => setCmdOpen(false)} onNavigate={(t) => { setTab(t); setCmdOpen(false); }} />}
      {whyBlockedScan && <WhyBlockedModal scan={whyBlockedScan} onClose={() => setWhyBlockedScan(null)} />}

      {/* Sidebar */}
      <aside className="sidebar-desktop" style={{ width:216, flexShrink:0, background:C.bgCard, borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column", position:"sticky", top:0, height:"100vh", overflowY:"auto" }}>
        <div style={{ padding:"22px 16px 18px", borderBottom:`1px solid ${C.border}` }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
            <div style={{ background:`linear-gradient(135deg, ${C.teal}, ${C.blue})`, borderRadius:10, padding:9, boxShadow:`0 0 20px ${C.teal}30` }}>
              <Shield size={16} color="#fff" strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontSize:16, fontWeight:900, letterSpacing:"-0.04em", background:`linear-gradient(90deg, ${C.teal}, ${C.blue})`, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>SecureFlow</div>
              <div style={{ fontSize:8, color:C.inkLow, fontWeight:700, letterSpacing:"0.12em" }}>DEVSECOPS · AI</div>
            </div>
          </div>
          <button onClick={() => setCmdOpen(true)} style={{ width:"100%", display:"flex", alignItems:"center", gap:8, padding:"7px 10px", borderRadius:8, border:`1px solid ${C.border}`, background:C.bgSurface, cursor:"pointer", color:C.inkMid, fontSize:11 }}>
            <Search size={11} /><span style={{ flex:1, textAlign:"left" }}>Search…</span>
            <kbd style={{ fontSize:9, background:C.bgElevated, border:`1px solid ${C.borderBright}`, borderRadius:4, padding:"1px 5px", color:C.inkLow }}>⌘K</kbd>
          </button>
        </div>
        <nav style={{ flex:1, padding:"12px 10px" }}>
          <div style={{ fontSize:9, color:C.inkLow, fontWeight:800, padding:"4px 10px 8px", letterSpacing:"0.12em" }}>NAVIGATION</div>
          {renderNav()}
        </nav>
        <div style={{ padding:"14px 16px", borderTop:`1px solid ${C.border}` }}>
          <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:4 }}>
            <div style={{ width:7, height:7, borderRadius:"50%", background:C.teal, boxShadow:`0 0 8px ${C.teal}` }} />
            <span style={{ fontSize:11, color:C.teal, fontWeight:700 }}>Pipeline Active</span>
          </div>
          {lastUpdated && <div style={{ fontSize:10, color:C.inkLow, display:"flex", alignItems:"center", gap:4 }}><Clock size={9} /> Updated {lastUpdated}</div>}
        </div>
      </aside>

      {/* Mobile nav overlay */}
      {navOpen && (
        <div style={{ position:"fixed", inset:0, zIndex:100, background:"rgba(0,0,0,0.7)" }} onClick={() => setNavOpen(false)}>
          <div style={{ width:230, height:"100%", background:C.bgCard, borderRight:`1px solid ${C.border}`, padding:"20px 12px" }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <span style={{ fontWeight:900, fontSize:15, color:C.ink }}>SecureFlow</span>
              <button onClick={() => setNavOpen(false)} style={{ border:"none", background:"none", cursor:"pointer", color:C.inkMid }}><X size={18} /></button>
            </div>
            {renderNav()}
          </div>
        </div>
      )}

      {/* Main */}
      <main style={{ flex:1, minWidth:0, display:"flex", flexDirection:"column" }}>
        {/* Topbar */}
        <header style={{ position:"sticky", top:0, zIndex:20, background:"rgba(10,14,19,0.92)", backdropFilter:"blur(16px)", borderBottom:`1px solid ${C.border}`, padding:"12px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <button onClick={() => setNavOpen(true)} className="hamburger" style={{ border:"none", background:"none", cursor:"pointer", padding:4, color:C.inkMid, display:"none" }}><Menu size={20} /></button>
            <div>
              <div style={{ fontSize:15, fontWeight:800, color:C.ink }}>{NAV.find(n=>n.id===tab)?.label}</div>
              <div style={{ fontSize:10, color:C.inkLow, marginTop:1 }}>secureflow · {source === "live" ? "live" : "demo"}</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            {stats.running.length > 0 && (
              <Badge color={C.blue}><span style={{ display:"inline-flex", alignItems:"center", gap:4 }}><span style={{ width:6, height:6, borderRadius:"50%", background:C.blue, animation:"blink 1s infinite", display:"inline-block" }} />{stats.running.length} running</span></Badge>
            )}
            <div style={{ display:"flex", alignItems:"center", gap:6, padding:"4px 10px", borderRadius:999, border:`1px solid ${source==="live"?C.tealBord:C.amberBord}`, background:source==="live"?C.tealSoft:C.amberSoft, fontSize:11, fontWeight:700, color:source==="live"?C.teal:C.amber }}>
              <Radio size={11} />{source === "live" ? "Live" : "Demo"}
            </div>
            <Badge color={C.blue}>{stats.completed.length} scans</Badge>
            <Badge color={stats.blocked.length>0?C.red:C.teal}>{stats.blocked.length} blocked</Badge>
            <button onClick={() => setCmdOpen(true)} style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 10px", borderRadius:9, border:`1px solid ${C.border}`, background:C.bgCard, color:C.inkMid, cursor:"pointer", fontSize:12 }}>
              <Command size={12} /><span style={{ fontSize:10, color:C.inkLow }}>⌘K</span>
            </button>
            <button onClick={refresh} style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 12px", borderRadius:9, border:`1px solid ${C.border}`, background:C.bgCard, color:C.inkMid, cursor:"pointer", fontSize:12, fontWeight:600 }}>
              <RefreshCw size={12} /> Refresh
            </button>
            <div ref={bellRef} style={{ position:"relative" }}>
              <button onClick={() => setBellOpen(o=>!o)} style={{ position:"relative", padding:"7px 9px", borderRadius:9, border:`1px solid ${undismissedBlocked.length>0?C.redBord:C.border}`, background:undismissedBlocked.length>0?C.redSoft:C.bgCard, cursor:"pointer", display:"flex", alignItems:"center" }}>
                <Bell size={16} color={undismissedBlocked.length>0?C.red:C.inkMid} />
                {undismissedBlocked.length > 0 && <span style={{ position:"absolute", top:-4, right:-4, width:16, height:16, borderRadius:"50%", background:C.red, color:"#fff", fontSize:9, fontWeight:800, display:"flex", alignItems:"center", justifyContent:"center", border:`2px solid ${C.bg}` }}>{undismissedBlocked.length>99?"99+":undismissedBlocked.length}</span>}
              </button>
              {bellOpen && <NotificationPanel scans={undismissedBlocked} onClose={() => setBellOpen(false)} onClearAll={handleClearAll} />}
            </div>
          </div>
        </header>

        <div style={{ padding:"20px", flex:1 }}>

          {/* ══ OVERVIEW ══════════════════════════════════════════════════════ */}
          {tab === "overview" && (
            <>
              <div style={{ background:`linear-gradient(135deg, ${C.tealDim}60, ${C.blueDim}80)`, border:`1px solid ${C.tealBord}`, borderRadius:16, padding:"24px 28px", marginBottom:20, display:"flex", alignItems:"center", gap:28, flexWrap:"wrap", boxShadow:`0 0 40px ${C.teal}08` }}>
                <HealthRing score={stats.healthScore} size={130} />
                <div style={{ flex:1, minWidth:200 }}>
                  <div style={{ fontSize:10, fontWeight:800, color:C.teal, letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:8 }}>⚡ Security Health — Today</div>
                  <div style={{ fontSize:26, fontWeight:900, color:C.ink, letterSpacing:"-0.04em", lineHeight:1.1, marginBottom:6 }}>{scans.length} pipelines scanned</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:4, fontSize:12, color:C.inkMid }}>
                    <span><span style={{ color:C.teal }}>✓</span> {stats.allowed.length} deployed successfully</span>
                    <span><span style={{ color:C.red }}>✗</span> {stats.blocked.length} blocked by policy</span>
                    <span><span style={{ color:C.violet }}>⚡</span> {stats.withAI.length} AI-analyzed</span>
                  </div>
                </div>
                <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
                  {[
                    { label:"AVG RISK",    value:stats.avgRisk,                                                           unit:"/10", color:riskColor(stats.avgRisk) },
                    { label:"BLOCK RATE",  value:stats.completed.length?`${Math.round(stats.blocked.length/stats.completed.length*100)}%`:"0%", unit:"", color:stats.blocked.length>0?C.red:C.teal },
                    { label:"AI ACCURACY", value:accuracyPct!==null?`${accuracyPct}%`:"—",                               unit:"", color:C.violet },
                  ].map(m => (
                    <div key={m.label} style={{ background:"rgba(255,255,255,0.04)", borderRadius:12, padding:"12px 18px", border:`1px solid ${C.border}`, textAlign:"center", minWidth:80 }}>
                      <div style={{ fontSize:9, color:C.inkLow, fontWeight:800, letterSpacing:"0.1em", marginBottom:6 }}>{m.label}</div>
                      <div style={{ fontSize:24, fontWeight:900, color:m.color, fontFamily:C.mono }}>{m.value}<span style={{ fontSize:12 }}>{m.unit}</span></div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:10, marginBottom:18 }}>
                <StatCard icon={Activity}      label="Total Scans"   value={scans.length}              color={C.blue}   />
                <StatCard icon={CheckCircle}   label="Allowed"       value={stats.allowed.length}      color={C.teal}   />
                <StatCard icon={XCircle}       label="Blocked"       value={stats.blocked.length}      color={C.red}    sub={stats.blocked.length>0?"review required":"all clear"} />
                <StatCard icon={AlertTriangle} label="Critical CVEs" value={scans.filter(s=>(s.severity||"").toUpperCase()==="CRITICAL").length} color={C.amber} />
                <StatCard icon={Cpu}           label="Avg Risk"      value={`${stats.avgRisk}/10`}     color={C.violet} />
                <StatCard icon={Zap}           label="AI Analyzed"   value={stats.withAI.length}       color={C.violet} />
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))", gap:12, marginBottom:18 }}>
                <Card>
                  <SectionTitle accent={C.blue}>Risk Score Trend</SectionTitle>
                  {stats.trendData.length===0?<EmptyChart/>:(
                    <ResponsiveContainer width="100%" height={150}>
                      <AreaChart data={stats.trendData} margin={{ top:4, right:4, left:-24, bottom:0 }}>
                        <defs><linearGradient id="rg" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.teal} stopOpacity={0.3}/><stop offset="95%" stopColor={C.teal} stopOpacity={0}/></linearGradient></defs>
                        <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize:9, fill:C.inkMid }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                        <YAxis tick={{ fontSize:9, fill:C.inkMid }} tickLine={false} axisLine={false} domain={[0,10]} />
                        <Tooltip contentStyle={TT} formatter={v=>[`${v}/10`,"Risk"]} labelFormatter={(l,items)=>items[0]?.payload?.sha||l} />
                        <Area type="monotone" dataKey="risk" stroke={C.teal} strokeWidth={2.5} fill="url(#rg)" dot={{ r:2.5, fill:C.teal, stroke:C.bgCard, strokeWidth:1.5 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </Card>
                <Card>
                  <SectionTitle accent={C.amber}>Deployments Over Time</SectionTitle>
                  {weekData.length===0?<EmptyChart/>:(
                    <ResponsiveContainer width="100%" height={150}>
                      <BarChart data={weekData} barSize={14} margin={{ top:4, right:4, left:-24, bottom:0 }}>
                        <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize:9, fill:C.inkMid }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fontSize:9, fill:C.inkMid }} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={TT} />
                        <Bar dataKey="allowed" fill={C.teal} radius={[4,4,0,0]} name="Allowed" stackId="a" />
                        <Bar dataKey="blocked" fill={C.red}  radius={[4,4,0,0]} name="Blocked" stackId="a" />
                        <Legend iconSize={8} wrapperStyle={{ fontSize:10, color:C.inkMid }} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </Card>
                <Card>
                  <SectionTitle accent={C.violet}>Severity Breakdown</SectionTitle>
                  {stats.sevData.length===0?<EmptyChart/>:(
                    <>
                      <ResponsiveContainer width="100%" height={110}>
                        <PieChart>
                          <Pie data={stats.sevData} cx="50%" cy="50%" innerRadius={30} outerRadius={48} dataKey="value" strokeWidth={2} stroke={C.bgCard}>
                            {stats.sevData.map((d,i) => <Cell key={i} fill={d.color} />)}
                          </Pie>
                          <Tooltip contentStyle={TT} formatter={(v,n)=>[v,n]} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{ display:"flex", justifyContent:"center", flexWrap:"wrap", gap:10, fontSize:11, color:C.inkMid, marginTop:4 }}>
                        {stats.sevData.map(d => <span key={d.name} style={{ display:"flex", alignItems:"center", gap:4 }}><span style={{ width:8, height:8, borderRadius:"50%", background:d.color, display:"inline-block" }} />{d.name} <strong style={{ color:C.ink }}>{d.value}</strong></span>)}
                      </div>
                    </>
                  )}
                </Card>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:12, marginBottom:12 }}>
                <div><RepoHealthSection scans={scans} /></div>
                <div><ThreatFeed /></div>
              </div>

              <Card>
                <SectionTitle accent={C.teal}>Recent Pipelines</SectionTitle>
                {loading && [1,2,3].map(i => <SkeletonCard key={i} />)}
                {!loading && scans.length===0 && <EmptyState text="No scans yet — push a commit to get started." />}
                {scans.slice(0,5).map(scan => {
                  const bl = scan.action_taken==="BLOCK";
                  return (
                    <div key={scan.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0", borderBottom:`1px solid ${C.border}` }}>
                      <div style={{ width:6, height:6, borderRadius:"50%", background:bl?C.red:C.teal, flexShrink:0, boxShadow:`0 0 6px ${bl?C.red:C.teal}` }} />
                      <span style={{ fontFamily:C.mono, fontSize:11, color:C.blue, flexShrink:0 }}>{scan.commit_sha?.slice(0,8)||"—"}</span>
                      <span style={{ fontSize:12, color:C.inkMid, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{scan.commit_message||scan.repo_name}</span>
                      <Badge color={bl?C.red:C.teal}>{scan.action_taken}</Badge>
                      {scan.severity && <Badge color={severityColor(scan.severity)}>{scan.severity}</Badge>}
                      <span style={{ fontSize:11, color:C.inkLow, flexShrink:0 }}>{fmt(scan.created_at)}</span>
                    </div>
                  );
                })}
              </Card>
            </>
          )}

          {/* ══ PIPELINE ══════════════════════════════════════════════════════ */}
          {tab === "pipeline" && (
            <>
              <div style={{ marginBottom:14, display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
                <div style={{ position:"relative", flex:1, minWidth:200 }}>
                  <Search size={13} color={C.inkLow} style={{ position:"absolute", left:10, top:9, pointerEvents:"none" }} />
                  <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search commits, repos, severity…" style={{ width:"100%", padding:"8px 10px 8px 30px", borderRadius:9, border:`1px solid ${C.border}`, fontSize:12, outline:"none", background:C.bgCard, color:C.ink, boxSizing:"border-box" }} />
                </div>
                {stats.running.length>0 && <Badge color={C.blue}><span style={{ display:"inline-flex", alignItems:"center", gap:4 }}><span style={{ width:6,height:6,borderRadius:"50%",background:C.blue,animation:"blink 1s infinite",display:"inline-block" }}/>{stats.running.length} running</span></Badge>}
                <Badge color={C.teal}>{stats.allowed.length} allowed</Badge>
                <Badge color={C.red}>{stats.blocked.length} blocked</Badge>
              </div>
              <FilterBar filters={filters} setFilters={setFilters} />
              {loading && [1,2,3].map(i=><SkeletonCard key={i} />)}
              {!loading && filtered.length===0 && <Card style={{ textAlign:"center", padding:40, color:C.inkLow }}>{search?`No scans match "${search}"`:"No scans found."}</Card>}
              {filtered.map(scan => <CommitCard key={scan.id} scan={scan} feedback={feedback} onFeedback={submitFeedback} onOpenWhyBlocked={setWhyBlockedScan} />)}
            </>
          )}

          {/* ══ SCAN FEED ═════════════════════════════════════════════════════ */}
          {tab === "feed" && (
            <>
              <div style={{ marginBottom:14, display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
                <div style={{ position:"relative", flex:1, minWidth:200 }}>
                  <Search size={13} color={C.inkLow} style={{ position:"absolute", left:10, top:9, pointerEvents:"none" }} />
                  <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Filter scans…" style={{ width:"100%", padding:"8px 10px 8px 30px", borderRadius:9, border:`1px solid ${C.border}`, fontSize:12, outline:"none", background:C.bgCard, color:C.ink, boxSizing:"border-box" }} />
                </div>
                <FilterBar filters={filters} setFilters={setFilters} />
              </div>
              {loading && [1,2,3].map(i=><SkeletonCard key={i} />)}
              {!loading && filtered.length===0 && <Card style={{ textAlign:"center", padding:40, color:C.inkLow }}>No scans match your filters.</Card>}
              {filtered.slice(0,24).map(scan => {
                const bl = scan.action_taken==="BLOCK";
                return (
                  <div key={scan.id} style={{ background:C.bgCard, borderRadius:12, border:`1px solid ${C.border}`, borderLeft:`3px solid ${bl?C.red:C.teal}`, padding:"12px 14px", marginBottom:8 }}>
                    <div style={{ display:"flex", alignItems:"flex-start", gap:10, flexWrap:"wrap" }}>
                      {bl ? <ShieldAlert size={16} color={C.red} style={{ marginTop:2 }} /> : <ShieldCheck size={16} color={C.teal} style={{ marginTop:2 }} />}
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", flexWrap:"wrap", alignItems:"center", gap:8, marginBottom:4 }}>
                          <span style={{ fontFamily:C.mono, fontSize:12, fontWeight:700, color:C.blue }}>{scan.repo_name}</span>
                          <span style={{ fontFamily:C.mono, fontSize:10, color:C.inkMid }}>· {scan.branch} · {scan.commit_sha?.slice(0,7)}</span>
                        </div>
                        <div style={{ fontSize:13, color:C.ink, marginBottom:4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{scan.commit_message}</div>
                        <div style={{ display:"flex", flexWrap:"wrap", gap:10, fontSize:11, color:C.inkMid }}>
                          <span>{scan.author}</span>
                          <span>{relativeTime(scan.created_at)}</span>
                          <span style={{ fontFamily:C.mono }}>{scan.scan_type?.replace(/-/g," ")}</span>
                          {!!scan.vuln_breakdown?.total && <span><Package size={11} style={{ display:"inline",verticalAlign:"middle" }} /> {scan.vuln_breakdown.total} CVEs · {scan.vuln_breakdown.fixable_count} fixable</span>}
                        </div>
                      </div>
                      <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6 }}>
                        <Badge color={severityColor(scan.severity)} small>{scan.severity}</Badge>
                        <span style={{ fontFamily:C.mono, fontSize:11, fontWeight:700, color:riskColor(scan.risk_score) }}>risk {scan.risk_score}/10</span>
                      </div>
                    </div>
                    {bl && (
                      <div style={{ marginTop:10, paddingTop:10, borderTop:`1px solid ${C.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <span style={{ fontSize:11, color:C.inkMid }}>Blocked by policy gate · {scan.ai_confidence}% AI confidence</span>
                        <button onClick={() => setWhyBlockedScan(scan)} style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 11px", borderRadius:8, border:`1px solid ${C.redBord}`, background:C.redSoft, color:C.red, cursor:"pointer", fontSize:11, fontWeight:700 }}>
                          <AlertTriangle size={11} /> Why blocked?
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}

          {/* ══ AI INSIGHTS ═══════════════════════════════════════════════════ */}
          {tab === "ai" && (
            <>
              <div style={{ background:`linear-gradient(135deg, ${C.violetSoft}, ${C.blueDim}80)`, border:`1px solid ${C.violetBord}`, borderRadius:16, padding:"22px 24px", marginBottom:16, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:14 }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ background:`linear-gradient(135deg, ${C.violet}, ${C.blue})`, borderRadius:12, padding:10, boxShadow:`0 0 20px ${C.violet}44` }}>
                    <Zap size={20} color="#fff" strokeWidth={2.5} />
                  </div>
                  <div>
                    <div style={{ fontSize:20, fontWeight:900, color:C.ink }}>AI Security Intelligence</div>
                    <div style={{ fontSize:11, color:C.inkMid }}>Every scan explained in plain language · confidence scored by feedback</div>
                  </div>
                  <Badge color={C.violet}>AI</Badge>
                </div>
                <div style={{ display:"flex", gap:10 }}>
                  {[{ label:"AI Analyzed",value:withAI.length },{ label:"Avg Risk",value:`${stats.avgRisk}/10` },{ label:"Accuracy",value:accuracyPct!==null?`${accuracyPct}%`:"—" }].map(m => (
                    <div key={m.label} style={{ background:"rgba(255,255,255,0.04)", borderRadius:10, padding:"10px 16px", border:`1px solid ${C.violetBord}`, textAlign:"center" }}>
                      <div style={{ fontSize:9, color:C.inkLow, marginBottom:4, fontWeight:800, letterSpacing:"0.06em" }}>{m.label}</div>
                      <div style={{ fontSize:20, fontWeight:800, color:C.violet, fontFamily:C.mono }}>{m.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:12, marginBottom:20 }}>
                <Card>
                  <SectionTitle accent={C.teal}>Feedback Breakdown</SectionTitle>
                  {feedbackCounts.total===0 ? <div style={{ height:100, display:"flex", alignItems:"center", justifyContent:"center", color:C.inkLow, fontSize:13 }}>No feedback yet</div> : (
                    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                      {[
                        { label:"Accurate",  value:feedbackCounts.accurate,  color:C.teal,  icon:ThumbsUp   },
                        { label:"Incorrect", value:feedbackCounts.incorrect, color:C.red,   icon:ThumbsDown },
                        { label:"Partial",   value:feedbackCounts.partial,   color:C.amber, icon:Minus      },
                      ].map(row => {
                        const Icon = row.icon;
                        const pct = feedbackCounts.total ? Math.round(row.value/feedbackCounts.total*100) : 0;
                        return (
                          <div key={row.label} style={{ display:"flex", alignItems:"center", gap:10 }}>
                            <Icon size={13} color={row.color} strokeWidth={2.5} style={{ flexShrink:0 }} />
                            <span style={{ fontSize:12, color:C.inkMid, width:64, flexShrink:0 }}>{row.label}</span>
                            <div style={{ flex:1, height:8, background:C.bgSurface, borderRadius:4, overflow:"hidden" }}>
                              <div style={{ width:`${pct}%`, height:"100%", background:row.color, borderRadius:4, transition:"width 0.4s ease" }} />
                            </div>
                            <span style={{ fontSize:12, fontWeight:700, color:C.ink, width:28, textAlign:"right", flexShrink:0 }}>{row.value}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>

                <Card>
                  <SectionTitle accent={C.red}>Riskiest Packages</SectionTitle>
                  {topRisks.length===0 ? <div style={{ height:100, display:"flex", alignItems:"center", justifyContent:"center", color:C.inkLow, fontSize:13 }}>No fixable vulnerabilities</div> : (
                    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                      {topRisks.map((r,i) => (
                        <div key={r.name} style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <span style={{ fontFamily:C.mono, fontSize:10, color:C.inkLow, width:20 }}>{String(i+1).padStart(2,"0")}</span>
                          <span style={{ fontSize:11, fontFamily:C.mono, color:C.inkMid, width:110, flexShrink:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.name}</span>
                          <div style={{ flex:1, height:8, background:C.bgSurface, borderRadius:4, overflow:"hidden" }}>
                            <div style={{ width:`${Math.round((r.count/(topRisks[0]?.count||1))*100)}%`, height:"100%", background:severityColor(r.severity), borderRadius:4, transition:"width 0.4s ease" }} />
                          </div>
                          <span style={{ fontSize:12, fontWeight:700, color:C.ink, width:28, textAlign:"right" }}>{r.count}×</span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>

                <ConfidencePanel accuracyPct={accuracyPct} feedbackCounts={feedbackCounts} withAICount={withAI.length} />
              </div>

              {loading && [1,2].map(i=><SkeletonCard key={i} />)}
              {!loading && withAI.length===0 && (
                <Card style={{ textAlign:"center", padding:40, color:C.inkLow }}>
                  <Zap size={32} color={C.violet} style={{ opacity:0.3, display:"block", margin:"0 auto 10px" }} />No AI-analyzed scans yet.
                </Card>
              )}
              {!loading && withAI.length>0 && (
                <Card>
                  <SectionTitle accent={C.violet}>Recent AI Analyses</SectionTitle>
                  {withAI.slice(0,8).map(scan => (
                    <div key={scan.id} style={{ padding:"14px 0", borderBottom:`1px solid ${C.border}` }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8, flexWrap:"wrap" }}>
                        <span style={{ fontFamily:C.mono, fontSize:11, color:C.blue, fontWeight:700 }}>{scan.commit_sha?.slice(0,8)}</span>
                        <Badge color={riskColor(scan.risk_score||0)} small>Risk {scan.risk_score||0}/10</Badge>
                        <Badge color={scan.action_taken==="BLOCK"?C.red:C.teal} small>{scan.action_taken}</Badge>
                        {scan.ai_urgency && <Badge color={scan.ai_urgency==="Fix right now"?C.red:scan.ai_urgency==="Fix before next deploy"?C.amber:C.inkMid} small>{scan.ai_urgency}</Badge>}
                        {feedback[scan.id]==="accept" && <Badge color={C.teal} small>accurate</Badge>}
                        {feedback[scan.id]==="reject" && <Badge color={C.red}  small>incorrect</Badge>}
                        <span style={{ fontSize:10, color:C.inkLow, marginLeft:"auto" }}>{fmt(scan.created_at)}</span>
                      </div>
                      <div style={{ fontSize:12, color:C.inkMid, lineHeight:1.7, background:C.violetSoft, borderRadius:10, padding:"10px 12px", border:`1px solid ${C.violetBord}` }}>
                        {scan.ai_explanation}
                      </div>
                      {scan.ai_fix && (
                        <div style={{ marginTop:6, fontSize:12, color:C.inkMid, background:C.tealSoft, borderRadius:10, padding:"8px 12px", border:`1px solid ${C.tealBord}` }}>
                          <strong style={{ color:C.teal }}>Fix: </strong>{scan.ai_fix}
                        </div>
                      )}
                      {scan.action_taken==="BLOCK" && <FixDiffView scan={scan} />}
                      <div style={{ marginTop:10, display:"flex", alignItems:"center", gap:8 }}>
                        <span style={{ fontSize:10, color:C.inkLow }}>WAS THIS HELPFUL?</span>
                        {feedback[scan.id] ? (
                          <Badge color={feedback[scan.id]==="accept"?C.teal:C.red} small>{feedback[scan.id]==="accept"?"Marked accurate":"Marked incorrect"}</Badge>
                        ) : (
                          <>
                            <button onClick={() => submitFeedback(scan.id,"accept")} style={{ border:`1px solid ${C.border}`, borderRadius:7, background:C.bgSurface, padding:"3px 10px", cursor:"pointer", fontSize:11, color:C.inkMid }}>Accurate</button>
                            <button onClick={() => submitFeedback(scan.id,"reject")} style={{ border:`1px solid ${C.border}`, borderRadius:7, background:C.bgSurface, padding:"3px 10px", cursor:"pointer", fontSize:11, color:C.inkMid }}>Incorrect</button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </Card>
              )}
            </>
          )}

          {/* ══ METRICS ═══════════════════════════════════════════════════════ */}
          {tab === "metrics" && (
            <>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:10, marginBottom:18 }}>
                <StatCard icon={Activity}      label="Total Scans" value={scans.length}              color={C.blue}   sub="all time" />
                <StatCard icon={CheckCircle}   label="Allowed"     value={stats.allowed.length}      color={C.teal}   sub="clean deploys" />
                <StatCard icon={XCircle}       label="Blocked"     value={stats.blocked.length}      color={C.red}    sub="policy violations" />
                <StatCard icon={Zap}           label="AI Analyzed" value={stats.withAI.length}       color={C.violet} sub="with explanations" />
                <StatCard icon={AlertTriangle} label="High Risk"   value={scans.filter(s=>(s.risk_score||0)>=7).length} color={C.amber} sub="risk ≥ 7/10" />
                <StatCard icon={Cpu}           label="Avg Risk"    value={`${stats.avgRisk}/10`}     color={C.violet} sub="mean score" />
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
                <Card>
                  <SectionTitle accent={C.blue}>Risk Score Over Time</SectionTitle>
                  {stats.trendData.length===0?<EmptyChart/>:(
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={stats.trendData} margin={{ top:4, right:4, left:-24, bottom:0 }}>
                        <defs><linearGradient id="rg2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.teal} stopOpacity={0.3}/><stop offset="95%" stopColor={C.teal} stopOpacity={0}/></linearGradient></defs>
                        <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize:9, fill:C.inkMid }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                        <YAxis tick={{ fontSize:9, fill:C.inkMid }} tickLine={false} axisLine={false} domain={[0,10]} />
                        <Tooltip contentStyle={TT} formatter={v=>[`${v}/10`,"Risk Score"]} labelFormatter={(l,items)=>items[0]?.payload?.sha||l} />
                        <Area type="monotone" dataKey="risk" stroke={C.teal} strokeWidth={2.5} fill="url(#rg2)" dot={{ r:3, fill:C.teal, stroke:C.bgCard, strokeWidth:2 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </Card>
                <Card>
                  <SectionTitle accent={C.red}>Policy Gate — Allow vs Block</SectionTitle>
                  {gateData.length===0?<EmptyChart/>:(
                    <>
                      <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                          <Pie data={gateData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} dataKey="value" strokeWidth={3} stroke={C.bgCard} paddingAngle={3}>
                            {gateData.map((d,i) => <Cell key={i} fill={d.color} />)}
                          </Pie>
                          <Tooltip contentStyle={TT} formatter={(v,n)=>[v,n]} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{ display:"flex", justifyContent:"center", gap:20, fontSize:12, color:C.inkMid }}>
                        {gateData.map(d => <span key={d.name} style={{ display:"flex", alignItems:"center", gap:5 }}><span style={{ width:10, height:10, borderRadius:"50%", background:d.color, display:"inline-block" }} />{d.name} <strong style={{ color:C.ink }}>{d.value}</strong><span style={{ color:C.inkLow }}>({scans.length?Math.round(d.value/scans.length*100):0}%)</span></span>)}
                      </div>
                    </>
                  )}
                </Card>
              </div>
              <Card>
                <SectionTitle accent={C.amber}>Severity Distribution</SectionTitle>
                {stats.sevData.length===0?<EmptyChart/>:(
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={stats.sevData} barSize={32} margin={{ top:4, right:4, left:-20, bottom:0 }}>
                      <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize:11, fill:C.inkMid }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize:10, fill:C.inkMid }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={TT} formatter={v=>[v,"scans"]} />
                      <Bar dataKey="value" radius={[6,6,0,0]} name="Count">
                        {stats.sevData.map((d,i) => <Cell key={i} fill={d.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>
              <Card>
                <SectionTitle accent={C.teal}>Daily Volume</SectionTitle>
                {weekData.length===0?<EmptyChart/>:(
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={weekData} barSize={14} margin={{ top:4, right:4, left:-24, bottom:0 }}>
                      <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize:9, fill:C.inkMid }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize:9, fill:C.inkMid }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={TT} />
                      <Bar dataKey="allowed" fill={C.teal} radius={[4,4,0,0]} name="Allowed" stackId="a" />
                      <Bar dataKey="blocked" fill={C.red}  radius={[4,4,0,0]} name="Blocked" stackId="a" />
                      <Legend iconSize={8} wrapperStyle={{ fontSize:10, color:C.inkMid }} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </>
          )}

        </div>
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: ${C.bg}; color: ${C.ink}; font-family: ${C.sans}; }
        button { font-family: inherit; }
        input  { font-family: inherit; }
        button:active { opacity: 0.8; }
        input:focus { border-color: ${C.teal} !important; outline: none; box-shadow: 0 0 0 3px ${C.teal}18; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 999px; }
        @keyframes blink   { 0%,100%{opacity:1} 50%{opacity:0.2} }
        @keyframes pulse   { 0%,100%{box-shadow:0 0 0 1.5px ${C.blue},0 0 0 4px ${C.blue}30} 50%{box-shadow:0 0 0 1.5px ${C.blue},0 0 0 8px ${C.blue}10} }
        @keyframes shimmer { 0%{opacity:0.4} 50%{opacity:0.8} 100%{opacity:0.4} }
        @media (max-width: 768px) { .sidebar-desktop { display: none !important; } .hamburger { display: flex !important; } }
        @media (min-width: 769px) { .hamburger { display: none !important; } }
      `}</style>
    </div>
  );
}