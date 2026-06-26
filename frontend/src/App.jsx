/**
 * SecureFlow — App.jsx (Professional Edition)
 * Real-time CI/CD Security Dashboard
 */

import React, {
  useState, useEffect, useCallback, useRef, useMemo,
} from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  LineChart, Line,
} from "recharts";
import {
  Shield, Activity, CheckCircle, XCircle, AlertTriangle, Zap,
  RefreshCw, ThumbsUp, ThumbsDown, ChevronDown, ChevronUp,
  TrendingUp, GitPullRequest, Sparkles, GitBranch, Flame,
  ListChecks, Loader2, X, Send, Bot, Minimize2,
  Lock, Terminal, ShieldCheck, Cpu, Globe,
} from "lucide-react";

/* ─────────────────────────────────────────────
   DESIGN TOKENS
───────────────────────────────────────────── */
const C = {
  bg:          "#060a0f",
  bgCard:      "#0b1017",
  bgSurface:   "#111820",
  bgElevated:  "#17202a",
  border:      "#1a2d40",
  borderBright:"#254055",
  ink:         "#e2eaf4",
  inkMid:      "#7d8fa3",
  inkLow:      "#334455",

  teal:        "#00e5b0",
  tealSoft:    "#00e5b018",
  tealBord:    "#00e5b030",

  blue:        "#4db8ff",
  blueSoft:    "#4db8ff12",
  blueBord:    "#4db8ff30",

  green:       "#3ddc84",
  greenSoft:   "#3ddc8412",

  red:         "#ff4d6a",
  redSoft:     "#ff4d6a12",
  redBord:     "#ff4d6a30",

  amber:       "#ffb347",
  amberSoft:   "#ffb34712",
  amberBord:   "#ffb34730",

  violet:      "#c084fc",
  violetSoft:  "#c084fc12",
  violetBord:  "#c084fc30",

  cyan:        "#22d3ee",
  cyanSoft:    "#22d3ee12",

  mono: "'JetBrains Mono','Fira Mono','Consolas',monospace",
  sans: "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
};

const BACKEND = "https://secureflow-backend-1083585992526.us-central1.run.app";

const PIPELINE_STAGES = [
  { key: "checkout",  label: "Checkout",     Icon: GitBranch   },
  { key: "code_scan", label: "Code Scan",    Icon: Terminal    },
  { key: "docker",    label: "Docker Build", Icon: Cpu         },
  { key: "trivy",     label: "Trivy Scan",   Icon: Shield      },
  { key: "policy",    label: "Policy Gate",  Icon: Lock        },
  { key: "deploy",    label: "Deploy",       Icon: Globe       },
];

/* ─────────────────────────────────────────────
   GLOBAL CSS  (injected once)
───────────────────────────────────────────── */
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body { background:${C.bg}; color:${C.ink}; font-family:${C.sans}; -webkit-font-smoothing:antialiased; }

button { cursor:pointer; font-family:${C.sans}; outline:none; }
button:focus-visible { outline: 2px solid ${C.teal}; outline-offset:2px; }

::-webkit-scrollbar { width:5px; height:5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background:${C.border}; border-radius:3px; }
::-webkit-scrollbar-thumb:hover { background:${C.borderBright}; }

/* Animations */
@keyframes spin        { to { transform: rotate(360deg); } }
@keyframes pulseRing   { 0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.15)} }
@keyframes fadeInUp    { from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)} }
@keyframes fadeIn      { from{opacity:0}to{opacity:1} }
@keyframes slideInRight{ from{opacity:0;transform:translateX(32px)}to{opacity:1;transform:translateX(0)} }
@keyframes slideInUp   { from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)} }
@keyframes shimmer     { 0%{background-position:-400px 0}100%{background-position:400px 0} }
@keyframes glow        { 0%,100%{box-shadow:0 0 12px ${C.teal}20}50%{box-shadow:0 0 28px ${C.teal}50} }
@keyframes dash        { to { stroke-dashoffset: 0; } }
@keyframes blink       { 0%,100%{opacity:1}50%{opacity:0} }
@keyframes float       { 0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)} }
@keyframes gradShift   { 0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%} }

.spin      { animation: spin 1.1s linear infinite; }
.pulse-dot { animation: pulseRing 1.6s ease-in-out infinite; }
.fade-up   { animation: fadeInUp .45s ease forwards; }
.fade-in   { animation: fadeIn .35s ease forwards; }
.slide-right { animation: slideInRight .4s ease forwards; }
.slide-up  { animation: slideInUp .5s cubic-bezier(.22,.68,0,1.2) forwards; }

/* Pipeline connector line draw animation */
.pipe-line-anim { stroke-dasharray:120; stroke-dashoffset:120; animation: dash .6s ease forwards; }

/* Card hover */
.sf-card-hover {
  transition: border-color .25s, box-shadow .25s, transform .2s;
}
.sf-card-hover:hover {
  border-color: ${C.borderBright} !important;
  transform: translateY(-1px);
  box-shadow: 0 8px 32px rgba(0,229,176,.06);
}

/* Tab button */
.sf-tab { border:none; background:transparent; color:${C.inkMid}; font-weight:600; font-size:13px; padding:8px 16px; border-radius:8px; display:flex; align-items:center; gap:6px; transition:background .2s, color .2s; }
.sf-tab:hover { background:${C.bgSurface}; color:${C.ink}; }
.sf-tab.active { background:${C.bgSurface}; color:${C.teal}; border:1px solid ${C.tealBord}; }

/* Copilot chat */
.sf-msg-user   { background:${C.tealSoft}; border:1px solid ${C.tealBord}; align-self:flex-end; }
.sf-msg-bot    { background:${C.bgSurface}; border:1px solid ${C.border}; align-self:flex-start; }
.sf-chat-input { background:${C.bgSurface}; border:1px solid ${C.border}; border-radius:12px; padding:10px 14px; color:${C.ink}; font-size:13px; width:100%; outline:none; transition:border-color .2s; }
.sf-chat-input:focus { border-color:${C.tealBord}; }
.sf-chat-input::placeholder { color:${C.inkLow}; }

/* Recharts override */
.recharts-cartesian-axis-tick-value { fill:${C.inkMid} !important; font-size:11px; }
.recharts-tooltip-wrapper { outline:none; }
`;

if (typeof document !== "undefined" && !document.getElementById("sf-css")) {
  const s = document.createElement("style");
  s.id = "sf-css";
  s.textContent = GLOBAL_CSS;
  document.head.appendChild(s);
}

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function resultToStatus(r) {
  if (!r) return "pending";
  const v = String(r).toUpperCase();
  if (["PASS","SCANNED","ALLOW"].includes(v)) return "passed";
  if (["FAIL","FAILED","BLOCK"].includes(v))  return "failed";
  if (v === "RUNNING")  return "running";
  if (v === "SKIPPED")  return "skipped";
  return "passed";
}

function normaliseScan(raw) {
  const steps = raw.pipeline_steps || {};
  const pipeline = PIPELINE_STAGES.map(({ key, label, Icon }) => {
    const info = steps[key] || {};
    return {
      id: key, name: label, Icon,
      status:  resultToStatus(info.result || info.status),
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

  return {
    ...raw,
    pipeline,
    vuln_breakdown,
    ai_confidence: aiConf,
    status: raw.status || "complete",
  };
}

const fmt     = iso => iso ? new Date(iso).toLocaleDateString("en-IN",{day:"numeric",month:"short"}) : "—";
const fmtFull = iso => iso ? new Date(iso).toLocaleString("en-IN",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "—";
const relTime = iso => {
  if (!iso) return "—";
  const m = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m/60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h/24)}d ago`;
};

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

const Card = ({ children, glow, style={}, className="" }) => (
  <div className={`sf-card-hover ${className}`} style={{
    background: C.bgCard,
    borderRadius:16,
    border:`1px solid ${glow ? C.tealBord : C.border}`,
    padding:"20px",
    marginBottom:16,
    boxShadow: glow ? `0 0 30px ${C.teal}12` : "0 2px 12px rgba(0,0,0,.3)",
    ...style,
  }}>{children}</div>
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

const Stat = ({ label, value, color, sub }) => (
  <div>
    <div style={{ fontSize:32, fontWeight:900, fontFamily:C.mono, color: color||C.ink, lineHeight:1 }}>{value}</div>
    {sub && <div style={{ fontSize:11, color:C.inkMid, marginTop:3 }}>{sub}</div>}
    <div style={{ fontSize:11, color:C.inkLow, marginTop:4, textTransform:"uppercase", letterSpacing:"0.08em" }}>{label}</div>
  </div>
);

/* ─────────────────────────────────────────────
   HEALTH RING  (SVG, CSS-animated offset)
───────────────────────────────────────────── */
const HealthRing = ({ score, size=110 }) => {
  const r = (size-14)/2;
  const circ = 2*Math.PI*r;
  const offset = circ - (score/100)*circ;
  const color = score>=75 ? C.teal : score>=50 ? C.amber : C.red;

  return (
    <div style={{ position:"relative", width:size, height:size }}>
      {/* Glow track */}
      <svg width={size} height={size} style={{ position:"absolute", inset:0 }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color+"20"} strokeWidth={10} />
      </svg>
      {/* Animated progress ring */}
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

/* ─────────────────────────────────────────────
   ANIMATED RISK BAR
───────────────────────────────────────────── */
const RiskBar = ({ score }) => {
  const color = riskColor(score);
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
      <div style={{ flex:1, height:6, background:C.bgSurface, borderRadius:4, overflow:"hidden", position:"relative" }}>
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
   PIPELINE NODES  (animated, per-stage)
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
            {/* Connector */}
            {i > 0 && (
              <div style={{
                flex:1, height:2, minWidth:8, maxWidth:28,
                background: i === 0 ? C.border :
                  pipeline[i-1].status === "passed" ? `linear-gradient(90deg,${C.teal}60,${color}60)` : C.border,
                transition:"background 0.6s",
              }} />
            )}

            {/* Stage node */}
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:5, minWidth:52 }}>
              <div style={{
                width:34, height:34, borderRadius:"50%",
                border:`2px solid ${color}`,
                background: color+"12",
                display:"flex", alignItems:"center", justifyContent:"center",
                color,
                boxShadow: stage.status === "running"
                  ? `0 0 0 4px ${color}20, 0 0 16px ${color}40`
                  : `0 0 8px ${color}20`,
                animation: stage.status === "running" ? "pulseRing 1.5s infinite" : "none",
                transition:"all .4s",
                position:"relative",
              }}>
                {stage.status === "running" ? (
                  <Loader2 size={15} className="spin" />
                ) : stage.status === "passed" ? (
                  <CheckCircle size={15} />
                ) : stage.status === "failed" ? (
                  <XCircle size={15} />
                ) : stage.status === "skipped" ? (
                  <span style={{ fontSize:11 }}>—</span>
                ) : (
                  Icon ? <Icon size={13} /> : null
                )}
              </div>
              <div style={{ fontSize:9, color:C.inkMid, textAlign:"center", whiteSpace:"nowrap", letterSpacing:"0.03em" }}>
                {stage.name}
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────
   FULL PIPELINE VISUALISER  (expanded view)
───────────────────────────────────────────── */
function PipelineFullView({ pipeline }) {
  if (!pipeline?.length) return null;

  return (
    <div style={{ marginTop:16 }}>
      {pipeline.map((stage, i) => {
        const color =
          stage.status === "passed"  ? C.teal  :
          stage.status === "failed"  ? C.red   :
          stage.status === "running" ? C.blue  :
          C.inkMid;

        const { Icon } = stage;

        return (
          <div key={stage.id} style={{ display:"flex", gap:12, marginBottom:i < pipeline.length-1 ? 0 : 0 }}>
            {/* Left rail */}
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
                  marginTop:4, marginBottom:4,
                  borderRadius:2,
                }} />
              )}
            </div>

            {/* Content */}
            <div style={{ flex:1, paddingBottom: i < pipeline.length-1 ? 14 : 0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom: stage.detail ? 4 : 0 }}>
                <span style={{ fontWeight:600, fontSize:13, color:C.ink }}>{stage.name}</span>
                <Badge color={color} small>{stage.result || stage.status}</Badge>
              </div>
              {stage.detail && (
                <div style={{
                  fontSize:12, color:C.inkMid, fontFamily:C.mono,
                  background:C.bgSurface, padding:"6px 10px",
                  borderRadius:6, border:`1px solid ${C.border}`,
                  marginTop:4,
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
                <span style={{ color:C.ink }}>{v.package}</span> → fix: <span style={{ color:C.teal }}>{v.fix}</span>
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
    <div className="fade-up" style={{
      background: C.bgCard,
      borderRadius:14,
      border:`1px solid ${C.border}`,
      borderLeft:`3px solid ${accent}`,
      padding:"16px",
      marginBottom:10,
      transition:"border-color .25s, box-shadow .25s, transform .2s",
      animationDelay:`${animDelay}s`,
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = C.borderBright; e.currentTarget.style.transform="translateY(-1px)"; e.currentTarget.style.boxShadow=`0 8px 24px rgba(0,0,0,.35)`; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow=""; }}
    >
      {/* Header row */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12, flexWrap:"wrap" }}>
        <div style={{ minWidth:0, flex:1 }}>
          <div style={{ display:"flex", gap:7, alignItems:"center", marginBottom:6, flexWrap:"wrap" }}>
            <span style={{ fontFamily:C.mono, color:C.blue, fontSize:12 }}>{scan.commit_sha?.slice(0,8)}</span>
            {isRunning  && <Badge color={C.blue}>SCANNING</Badge>}
            {isTimeout  && <Badge color={C.amber}>TIMED OUT</Badge>}
            {!isRunning && !isTimeout && <Badge color={blocked ? C.red : C.teal}>{scan.action_taken || "ALLOW"}</Badge>}
            {scan.severity && scan.severity !== "UNKNOWN" && (
              <Badge color={sevColor(scan.severity)}>{scan.severity}</Badge>
            )}
            {scan.risk_score != null && (
              <Badge color={riskColor(scan.risk_score)}>Risk {scan.risk_score}</Badge>
            )}
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

      {/* Pipeline nodes */}
      <PipelineMiniNodes pipeline={scan.pipeline} />

      {/* Running banner */}
      {isRunning && (
        <div style={{
          marginTop:6, padding:"7px 12px",
          background:C.blueSoft, borderRadius:8,
          border:`1px solid ${C.blueBord}`,
          fontSize:12, color:C.blue,
          display:"flex", alignItems:"center", gap:6,
        }}>
          <Loader2 size={12} className="spin" />
          Pipeline running — auto-refreshing live
        </div>
      )}

      {/* Expanded detail */}
      {expanded && (
        <div style={{ marginTop:16, paddingTop:16, borderTop:`1px solid ${C.border}`, animation:"fadeIn .25s ease" }}>
          <PipelineFullView pipeline={scan.pipeline} />

          {scan.vuln_breakdown && <VulnBreakdown breakdown={scan.vuln_breakdown} />}

          {scan.ai_explanation && (
            <div style={{
              marginTop:12, padding:14,
              background:C.violetSoft, borderRadius:10,
              border:`1px solid ${C.violetBord}`,
              fontSize:13, lineHeight:1.65,
            }}>
              <div style={{ display:"flex", gap:6, alignItems:"center", color:C.violet, fontWeight:700, marginBottom:7, fontSize:10, letterSpacing:"0.1em" }}>
                <Zap size={11} /> AI ANALYSIS
                {scan.ai_confidence != null && (
                  <span style={{ marginLeft:"auto", color:C.inkMid, fontSize:10, letterSpacing:0 }}>
                    {scan.ai_confidence}% confidence
                  </span>
                )}
              </div>
              <div style={{ color:C.ink }}>{scan.ai_explanation}</div>
            </div>
          )}

          {/* Feedback */}
          {!isRunning && (
            <div style={{ display:"flex", alignItems:"center", gap:10, marginTop:14 }}>
              <span style={{ fontSize:11, color:C.inkLow }}>Assessment accurate?</span>
              {["accept","reject"].map(type => (
                <button key={type} onClick={() => onFeedback?.(scan.id, type)} style={{
                  display:"flex", alignItems:"center", gap:4,
                  padding:"4px 10px", borderRadius:8,
                  background: myFb===type ? (type==="accept" ? C.greenSoft : C.redSoft) : C.bgSurface,
                  border:`1px solid ${myFb===type ? (type==="accept" ? C.green : C.red) : C.border}`,
                  color: myFb===type ? (type==="accept" ? C.green : C.red) : C.inkMid,
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
    </div>
  );
};

/* ─────────────────────────────────────────────
   WHY BLOCKED MODAL  (rich: AI + failed stages + vulns)
───────────────────────────────────────────── */
const WhyBlockedModal = ({ scan, onClose }) => {
  const [aiText, setAiText]   = useState(scan?.ai_explanation || null);
  const [loading, setLoading] = useState(false);

  // If no ai_explanation yet, try fetching re-analysis
  useEffect(() => {
    if (!scan) return;
    if (scan.ai_explanation) { setAiText(scan.ai_explanation); return; }
    setLoading(true);
    fetch(`${BACKEND}/api/scan-results/${scan.id}/reanalyze`, { method:"POST" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.ai_explanation) setAiText(d.ai_explanation); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [scan]);

  if (!scan) return null;

  const failedStages = (scan.pipeline || []).filter(s => s.status === "failed");
  const vb           = scan.vuln_breakdown;
  const hasCritical  = vb?.fixable_details?.some(v => v.severity === "CRITICAL");

  return (
    <div style={{
      position:"fixed", inset:0,
      background:"rgba(0,0,0,.8)",
      backdropFilter:"blur(8px)",
      zIndex:400,
      display:"flex", alignItems:"center", justifyContent:"center",
      padding:20, animation:"fadeIn .2s ease",
    }} onClick={onClose}>
      <div style={{
        background:C.bgCard, borderRadius:20,
        maxWidth:560, width:"100%",
        border:`1px solid ${C.redBord}`,
        boxShadow:`0 0 80px ${C.red}18, 0 32px 64px rgba(0,0,0,.6)`,
        animation:"slideInUp .3s ease",
        overflow:"hidden",
      }} onClick={e => e.stopPropagation()}>

        {/* Red header bar */}
        <div style={{
          padding:"18px 24px",
          background:`linear-gradient(135deg, ${C.red}18, ${C.redSoft})`,
          borderBottom:`1px solid ${C.redBord}`,
          display:"flex", alignItems:"center", gap:10,
        }}>
          <div style={{
            width:36, height:36, borderRadius:10,
            background:C.redSoft, border:`1px solid ${C.redBord}`,
            display:"flex", alignItems:"center", justifyContent:"center",
            flexShrink:0,
          }}>
            <AlertTriangle size={18} color={C.red} />
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:15, fontWeight:700, color:C.ink }}>Why was this blocked?</div>
            <div style={{ fontSize:11, color:C.inkMid, fontFamily:C.mono, marginTop:2 }}>
              {scan.repo_name} · {scan.commit_sha?.slice(0,8)} · {relTime(scan.created_at)}
            </div>
          </div>
          <button onClick={onClose} style={{
            background:"none", border:"none", color:C.inkMid,
            padding:4, borderRadius:6, display:"flex",
          }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding:"20px 24px", maxHeight:"70vh", overflowY:"auto" }}>

          {/* Failed pipeline stages */}
          {failedStages.length > 0 && (
            <div style={{ marginBottom:18 }}>
              <div style={{
                fontSize:10, fontWeight:800, color:C.red,
                letterSpacing:"0.1em", textTransform:"uppercase",
                display:"flex", alignItems:"center", gap:6, marginBottom:10,
              }}>
                <div style={{ width:3, height:12, background:C.red, borderRadius:2 }} />
                Failed stages
              </div>
              {failedStages.map(stage => (
                <div key={stage.id} style={{
                  display:"flex", alignItems:"flex-start", gap:10,
                  padding:"10px 12px", marginBottom:6,
                  background:C.redSoft, borderRadius:10,
                  border:`1px solid ${C.redBord}`,
                }}>
                  <XCircle size={15} color={C.red} style={{ flexShrink:0, marginTop:1 }} />
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:C.ink }}>{stage.name}</div>
                    {stage.detail && (
                      <div style={{
                        fontSize:11, color:C.inkMid, fontFamily:C.mono,
                        marginTop:4, lineHeight:1.5,
                      }}>
                        {stage.detail}
                      </div>
                    )}
                  </div>
                  <Badge color={C.red} small>FAILED</Badge>
                </div>
              ))}
            </div>
          )}

          {/* Vulnerability summary */}
          {vb && vb.total > 0 && (
            <div style={{ marginBottom:18 }}>
              <div style={{
                fontSize:10, fontWeight:800, color:C.amber,
                letterSpacing:"0.1em", textTransform:"uppercase",
                display:"flex", alignItems:"center", gap:6, marginBottom:10,
              }}>
                <div style={{ width:3, height:12, background:C.amber, borderRadius:2 }} />
                Vulnerabilities detected
              </div>
              <div style={{
                display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8, marginBottom:10,
              }}>
                {[
                  { label:"Total",   value: vb.total,         color: C.amber },
                  { label:"Fixable", value: vb.fixable_count, color: C.blue  },
                  { label:"Critical",value: vb.fixable_details?.filter(v=>v.severity==="CRITICAL").length||0, color: C.red },
                ].map(s => (
                  <div key={s.label} style={{
                    padding:"10px 12px", borderRadius:10,
                    background:s.color+"10", border:`1px solid ${s.color}30`,
                    textAlign:"center",
                  }}>
                    <div style={{ fontSize:22, fontWeight:900, fontFamily:C.mono, color:s.color }}>{s.value}</div>
                    <div style={{ fontSize:10, color:C.inkMid, marginTop:2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
              {vb.fixable_details?.length > 0 && (
                <div style={{ background:C.bgSurface, borderRadius:10, border:`1px solid ${C.border}`, overflow:"hidden" }}>
                  {vb.fixable_details.slice(0,4).map((v, i) => (
                    <div key={v.id||i} style={{
                      padding:"8px 12px",
                      borderBottom: i < Math.min(vb.fixable_details.length,4)-1 ? `1px solid ${C.border}` : "none",
                      display:"flex", alignItems:"center", gap:8,
                    }}>
                      <Badge color={sevColor(v.severity)} small>{v.severity}</Badge>
                      <span style={{ fontFamily:C.mono, fontSize:11, color:C.blue, flex:1 }}>{v.id}</span>
                      <span style={{ fontSize:11, color:C.inkMid }}>{v.package}</span>
                      <span style={{ fontSize:11, color:C.teal }}>→ {v.fix}</span>
                    </div>
                  ))}
                </div>
              )}
              {vb.base_image_note && (
                <div style={{ fontSize:11, color:C.inkMid, marginTop:8, fontStyle:"italic" }}>
                  {vb.base_image_note}
                </div>
              )}
            </div>
          )}

          {/* AI Analysis */}
          <div>
            <div style={{
              fontSize:10, fontWeight:800, color:C.violet,
              letterSpacing:"0.1em", textTransform:"uppercase",
              display:"flex", alignItems:"center", gap:6, marginBottom:10,
            }}>
              <div style={{ width:3, height:12, background:C.violet, borderRadius:2 }} />
              AI analysis
              {scan.ai_confidence != null && (
                <span style={{ color:C.inkMid, fontWeight:400, textTransform:"none", letterSpacing:0, marginLeft:4 }}>
                  {scan.ai_confidence}% confidence
                </span>
              )}
            </div>
            <div style={{
              padding:"14px 16px",
              background:C.violetSoft, borderRadius:12,
              border:`1px solid ${C.violetBord}`,
              fontSize:13, lineHeight:1.7, color:C.ink,
              minHeight:60,
            }}>
              {loading ? (
                <div style={{ display:"flex", alignItems:"center", gap:8, color:C.inkMid }}>
                  <Loader2 size={14} className="spin" />
                  Fetching AI analysis…
                </div>
              ) : aiText ? (
                aiText
              ) : (
                <span style={{ color:C.inkMid }}>
                  No AI explanation available for this scan. The block was triggered by policy gate rules —
                  check the failed stages above for specifics.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding:"14px 24px",
          borderTop:`1px solid ${C.border}`,
          display:"flex", justifyContent:"flex-end",
        }}>
          <button onClick={onClose} style={{
            padding:"9px 22px",
            background:C.red, color:"#fff",
            border:"none", borderRadius:9, fontWeight:700, fontSize:13,
          }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   SCAN DETAIL SLIDE-IN
───────────────────────────────────────────── */
function ScanDetail({ scan, onClose, feedback, onFeedback, onWhyBlocked }) {
  if (!scan) return null;
  return (
    <div style={{
      position:"fixed", top:0, right:0,
      width:460, maxWidth:"100vw", height:"100vh",
      background:`${C.bgCard}f5`,
      backdropFilter:"blur(16px)",
      borderLeft:`1px solid ${C.border}`,
      zIndex:250, overflowY:"auto", padding:24,
      animation:"slideInRight .35s ease",
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
        <h2 style={{ margin:0, fontSize:17, fontWeight:700 }}>{scan.repo_name}</h2>
        <button onClick={onClose} style={{
          background:C.bgSurface, border:`1px solid ${C.border}`,
          borderRadius:8, padding:"6px 10px", color:C.inkMid,
          display:"flex", alignItems:"center",
        }}>
          <X size={16} />
        </button>
      </div>

      <div style={{ fontFamily:C.mono, color:C.blue, fontSize:12, marginBottom:4 }}>{scan.commit_sha}</div>
      <div style={{ fontSize:13, color:C.inkMid, marginBottom:6 }}>{scan.commit_message}</div>
      <div style={{ fontSize:11, color:C.inkLow, marginBottom:18 }}>{fmtFull(scan.created_at)}</div>

      <div style={{ display:"flex", gap:8, marginBottom:18 }}>
        <Badge color={scan.action_taken==="BLOCK" ? C.red : C.teal}>{scan.action_taken||"ALLOW"}</Badge>
        {scan.severity && <Badge color={sevColor(scan.severity)}>{scan.severity}</Badge>}
        {scan.risk_score != null && <Badge color={riskColor(scan.risk_score)}>Risk {scan.risk_score}</Badge>}
      </div>

      <SectionTitle accent={C.teal}>Pipeline stages</SectionTitle>
      <PipelineFullView pipeline={scan.pipeline} />

      {scan.vuln_breakdown && (
        <>
          <SectionTitle accent={C.amber} style={{ marginTop:20 }}>Vulnerabilities</SectionTitle>
          <VulnBreakdown breakdown={scan.vuln_breakdown} />
        </>
      )}

      {scan.ai_explanation && (
        <div style={{
          marginTop:16, padding:14,
          background:C.violetSoft, borderRadius:10,
          border:`1px solid ${C.violetBord}`,
          fontSize:13, lineHeight:1.65,
        }}>
          <div style={{ display:"flex", gap:6, alignItems:"center", color:C.violet, fontWeight:700, marginBottom:7, fontSize:10, letterSpacing:"0.1em" }}>
            <Zap size={11} /> AI ANALYSIS
          </div>
          {scan.ai_explanation}
        </div>
      )}

      {scan.action_taken === "BLOCK" && (
        <button onClick={() => onWhyBlocked(scan)} style={{
          marginTop:20, padding:"12px", width:"100%",
          background:C.redSoft, border:`1px solid ${C.redBord}`,
          borderRadius:10, color:C.red,
          fontWeight:700, fontSize:13,
          display:"flex", alignItems:"center", justifyContent:"center", gap:7,
        }}>
          <AlertTriangle size={15} /> Why blocked?
        </button>
      )}

      {/* Feedback */}
      <div style={{ display:"flex", gap:8, marginTop:16 }}>
        {["accept","reject"].map(type => {
          const myFb = feedback?.[scan.id];
          return (
            <button key={type} onClick={() => onFeedback?.(scan.id, type)} style={{
              flex:1, padding:"9px", borderRadius:9,
              background: myFb===type ? (type==="accept"?C.greenSoft:C.redSoft) : C.bgSurface,
              border:`1px solid ${myFb===type ? (type==="accept"?C.green:C.red) : C.border}`,
              color: myFb===type ? (type==="accept"?C.green:C.red) : C.inkMid,
              fontSize:12, fontWeight:600,
              display:"flex", alignItems:"center", justifyContent:"center", gap:5,
            }}>
              {type==="accept" ? <ThumbsUp size={13}/> : <ThumbsDown size={13}/>}
              {type==="accept" ? "Accurate" : "Incorrect"}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   AI COPILOT  (floating chatbot popup)
───────────────────────────────────────────── */
function AICopilot({ scans, onClose }) {
  const [messages, setMessages] = useState([
    {
      role:"assistant",
      text:"Hi! I'm your SecureFlow AI assistant. Ask me about blocked commits, CVEs, risk scores, or pipeline failures.",
    },
  ]);
  const [input,     setInput]     = useState("");
  const [sending,   setSending]   = useState(false);
  const [minimised, setMinimised] = useState(false);
  const endRef  = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [messages]);

  const send = async (q) => {
    const question = q || input.trim();
    if (!question || sending) return;
    setInput("");
    setMessages(m => [...m, { role:"user", text:question }]);
    setSending(true);
    try {
      const res = await fetch(`${BACKEND}/api/copilot/ask`, {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ question }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMessages(m => [...m, { role:"assistant", text: data.answer }]);
    } catch {
      setMessages(m => [...m, {
        role:"assistant",
        text:"I couldn't reach the AI service right now. Try again in a moment.",
      }]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const blocked = scans.filter(s => s.action_taken === "BLOCK").length;
  const running = scans.filter(s => s.status === "running").length;

  const QUICK = [
    "Why was the last commit blocked?",
    "What's the highest risk scan?",
    "Show fixable CVEs",
  ];

  return (
    <div style={{
      position:"fixed",
      bottom:24, right:24,
      width: minimised ? "auto" : 360,
      zIndex:500,
      animation:"slideInUp .4s cubic-bezier(.22,.68,0,1.2)",
    }}>
      {/* Collapsed pill */}
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
          {(blocked > 0 || running > 0) && (
            <span style={{
              background:C.red, color:"#fff",
              borderRadius:999, fontSize:10, fontWeight:800,
              padding:"1px 6px",
            }}>
              {blocked + running}
            </span>
          )}
        </button>
      ) : (
        /* Expanded chat panel */
        <div style={{
          background:`${C.bgCard}ee`,
          backdropFilter:"blur(20px)",
          border:`1px solid ${C.border}`,
          borderRadius:20,
          overflow:"hidden",
          boxShadow:`0 24px 64px rgba(0,0,0,.6), 0 0 40px ${C.teal}10`,
          display:"flex", flexDirection:"column",
          maxHeight:"70vh",
        }}>
          {/* Header */}
          <div style={{
            padding:"14px 16px",
            borderBottom:`1px solid ${C.border}`,
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
              <div style={{ fontSize:10, color:C.teal, display:"flex", alignItems:"center", gap:4 }}>
                <span style={{
                  width:6, height:6, borderRadius:"50%",
                  background:C.teal,
                  display:"inline-block",
                  animation:"pulseRing 2s infinite",
                }} />
                online
              </div>
            </div>

            {/* Status pills */}
            {running > 0 && (
              <Badge color={C.blue} small>{running} running</Badge>
            )}
            {blocked > 0 && (
              <Badge color={C.red} small>{blocked} blocked</Badge>
            )}

            <div style={{ marginLeft:"auto", display:"flex", gap:4 }}>
              <button onClick={() => setMinimised(true)} style={{
                background:"none", border:"none", color:C.inkMid, padding:4, borderRadius:6,
              }} title="Minimise">
                <Minimize2 size={15} />
              </button>
              <button onClick={onClose} style={{
                background:"none", border:"none", color:C.inkMid, padding:4, borderRadius:6,
              }} title="Close">
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div style={{
            flex:1, overflowY:"auto",
            padding:"14px 14px 0",
            display:"flex", flexDirection:"column", gap:10,
            minHeight:200, maxHeight:"45vh",
          }}>
            {messages.map((m, i) => (
              <div key={i} className={m.role==="user" ? "sf-msg-user" : "sf-msg-bot"} style={{
                maxWidth:"88%", padding:"9px 13px",
                borderRadius: m.role==="user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                fontSize:13, lineHeight:1.6, color:C.ink,
                animation:"fadeInUp .25s ease",
              }}>
                {m.text}
              </div>
            ))}
            {sending && (
              <div className="sf-msg-bot" style={{
                maxWidth:"60%", padding:"9px 13px",
                borderRadius:"14px 14px 14px 4px",
                fontSize:13, color:C.inkMid,
                display:"flex", alignItems:"center", gap:6,
              }}>
                <Loader2 size={12} className="spin" />
                Thinking…
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Quick prompts */}
          <div style={{ padding:"10px 14px 0", display:"flex", gap:5, flexWrap:"wrap" }}>
            {QUICK.map(q => (
              <button key={q} onClick={() => send(q)} style={{
                fontSize:10, padding:"4px 9px", borderRadius:999,
                background:C.tealSoft, border:`1px solid ${C.tealBord}`,
                color:C.teal, fontWeight:600,
                whiteSpace:"nowrap",
              }}>
                {q}
              </button>
            ))}
          </div>

          {/* Input */}
          <div style={{ padding:"12px 14px 14px", display:"flex", gap:8 }}>
            <input
              ref={inputRef}
              className="sf-chat-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key==="Enter" && send()}
              placeholder="Ask about your pipeline…"
            />
            <button onClick={() => send()} disabled={!input.trim() || sending} style={{
              padding:"0 14px", borderRadius:12,
              background: input.trim() && !sending ? C.teal : C.bgSurface,
              border:`1px solid ${input.trim() && !sending ? C.teal : C.border}`,
              color: input.trim() && !sending ? C.bg : C.inkMid,
              fontWeight:700, fontSize:13,
              transition:"all .2s",
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
      {payload.map((p, i) => (
        <div key={i} style={{ fontSize:12, color:p.color||C.ink, fontFamily:C.mono }}>
          {p.name}: {typeof p.value === "number" ? p.value.toFixed(1) : p.value}
        </div>
      ))}
    </div>
  );
};

/* ─────────────────────────────────────────────
   OVERVIEW TAB
───────────────────────────────────────────── */
function OverviewTab({ scans, healthScore, avgRisk, blocked, allowed, running, completed, feedback, onFeedback, onOpenWhyBlocked, onOpenDetail }) {
  const chartData = useMemo(() => (
    [...scans].filter(s => s.status!=="running").slice(0,20).reverse().map(s => ({
      name:  s.commit_sha?.slice(0,6) || "—",
      risk:  s.risk_score || 0,
      score: s.ai_confidence || 0,
    }))
  ), [scans]);

  const pieData = [
    { name:"Allowed", value: allowed.length, color: C.teal },
    { name:"Blocked", value: blocked.length, color: C.red  },
  ];

  const sevDist = useMemo(() => {
    const counts = { CRITICAL:0, HIGH:0, MEDIUM:0, LOW:0, CLEAN:0 };
    completed.forEach(s => {
      const k = (s.severity||"CLEAN").toUpperCase();
      if (counts[k] !== undefined) counts[k]++;
    });
    return Object.entries(counts).map(([name, value]) => ({
      name, value, color: sevColor(name),
    }));
  }, [completed]);

  const radarData = useMemo(() => [
    { subject:"Availability",    A: Math.max(0, 100 - (running.length * 20))             },
    { subject:"Block Rate",      A: Math.max(0, 100 - (blocked.length/(completed.length||1))*100) },
    { subject:"Avg Risk",        A: Math.max(0, 100 - parseFloat(avgRisk)*10)             },
    { subject:"AI Coverage",     A: completed.filter(s=>s.ai_confidence).length / (completed.length||1)*100 },
    { subject:"Clean Scans",     A: allowed.length/(completed.length||1)*100              },
  ], [running, blocked, completed, avgRisk, allowed]);

  const [trendWindow, setTrendWindow] = useState(14);

  return (
    <div style={{ animation:"fadeInUp .4s ease" }}>
      {/* KPI row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:14, marginBottom:16 }}>
        {[
          { label:"Pipeline health", value: healthScore, color: healthScore>=75?C.teal:healthScore>=50?C.amber:C.red, sub:"based on block rate + risk" },
          { label:"Average risk",    value: avgRisk,      color: riskColor(parseFloat(avgRisk)), sub:"out of 10.0" },
          { label:"Scans completed", value: completed.length, color: C.blue,   sub:"all time" },
          { label:"Blocked",         value: blocked.length,   color: C.red,    sub:`${((blocked.length/(completed.length||1))*100).toFixed(0)}% block rate` },
          { label:"Currently live",  value: running.length,   color: C.cyan,   sub:"pipelines running" },
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
        {/* Risk trend */}
        <Card glow>
          <SectionTitle accent={C.violet} right={
            <div style={{ display:"flex", gap:5 }}>
              {[7,14,30].map(w => (
                <button key={w} onClick={() => setTrendWindow(w)} style={{
                  fontSize:10, padding:"2px 8px", borderRadius:999,
                  background: trendWindow===w ? C.violetSoft : "none",
                  border:`1px solid ${trendWindow===w ? C.violetBord : C.border}`,
                  color: trendWindow===w ? C.violet : C.inkMid,
                  fontWeight:600,
                }}>
                  {w}d
                </button>
              ))}
            </div>
          }>
            Risk score trend
          </SectionTitle>
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

        {/* Pie */}
        <Card>
          <SectionTitle accent={C.blue}>Allow vs block</SectionTitle>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} dataKey="value" innerRadius={52} outerRadius={78} paddingAngle={4} strokeWidth={0}>
                {pieData.map(e => (
                  <Cell key={e.name} fill={e.color} />
                ))}
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

      {/* Severity + Radar row */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:16 }}>
        {/* Severity bar */}
        <Card>
          <SectionTitle accent={C.amber}>Severity distribution</SectionTitle>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={sevDist} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
              <XAxis dataKey="name" stroke="transparent" tick={{ fill:C.inkMid, fontSize:10 }} />
              <YAxis stroke="transparent" tick={{ fill:C.inkMid, fontSize:10 }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Count" radius={[5,5,0,0]}>
                {sevDist.map(e => (
                  <Cell key={e.name} fill={e.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Radar */}
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

      {/* Latest activity */}
      <SectionTitle accent={C.teal}>Latest activity</SectionTitle>
      {scans.slice(0,5).map((scan, i) => (
        <CommitCard
          key={scan.id}
          scan={scan}
          feedback={feedback}
          animDelay={i * 0.05}
          onFeedback={onFeedback}
          onOpenWhyBlocked={onOpenWhyBlocked}
          onOpenDetail={onOpenDetail}
        />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   PIPELINE TAB
───────────────────────────────────────────── */
function PipelineTab({ scans, feedback, onFeedback, onOpenWhyBlocked, onOpenDetail }) {
  const running = scans.filter(s => s.status==="running");
  const recent  = scans.filter(s => s.status!=="running").slice(0,25);

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
          {running.map((scan, i) => (
            <CommitCard key={scan.id} scan={scan} feedback={feedback}
              onFeedback={onFeedback} onOpenWhyBlocked={onOpenWhyBlocked}
              onOpenDetail={onOpenDetail} animDelay={i*0.05} />
          ))}
          <div style={{ height:1, background:C.border, margin:"20px 0" }} />
        </div>
      )}

      <SectionTitle accent={C.teal}>Recent runs</SectionTitle>
      {recent.length === 0 && (
        <div style={{ color:C.inkLow, textAlign:"center", padding:"40px 0", fontSize:14 }}>
          No completed runs yet.
        </div>
      )}
      {recent.map((scan, i) => (
        <CommitCard key={scan.id} scan={scan} feedback={feedback}
          onFeedback={onFeedback} onOpenWhyBlocked={onOpenWhyBlocked}
          onOpenDetail={onOpenDetail} animDelay={i*0.04} />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   SCAN FEED TAB
───────────────────────────────────────────── */
function ScanFeedTab({ scans, feedback, onFeedback, onOpenWhyBlocked, onOpenDetail }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const FILTERS = [
    { id:"all",     label:"All"      },
    { id:"allowed", label:"Allowed"  },
    { id:"blocked", label:"Blocked"  },
    { id:"running", label:"Running"  },
  ];

  const filtered = scans.filter(s => {
    if (filter==="blocked" && s.action_taken!=="BLOCK")   return false;
    if (filter==="allowed" && s.action_taken!=="ALLOW")   return false;
    if (filter==="running" && s.status!=="running")        return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        s.commit_sha?.toLowerCase().includes(q) ||
        s.commit_message?.toLowerCase().includes(q) ||
        s.repo_name?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div style={{ animation:"fadeInUp .4s ease" }}>
      {/* Toolbar */}
      <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
        <div style={{ display:"flex", gap:6 }}>
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{
              padding:"6px 13px", borderRadius:999, fontSize:12, fontWeight:600,
              background: filter===f.id ? C.tealSoft : C.bgSurface,
              border:`1px solid ${filter===f.id ? C.tealBord : C.border}`,
              color: filter===f.id ? C.teal : C.inkMid,
            }}>
              {f.label}
              <span style={{ marginLeft:5, fontSize:10, opacity:.7 }}>
                {f.id==="all"     ? scans.length :
                 f.id==="blocked" ? scans.filter(s=>s.action_taken==="BLOCK").length :
                 f.id==="allowed" ? scans.filter(s=>s.action_taken==="ALLOW").length :
                 scans.filter(s=>s.status==="running").length}
              </span>
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search commit, repo…"
          style={{
            marginLeft:"auto",
            background:C.bgSurface, border:`1px solid ${C.border}`,
            borderRadius:8, padding:"6px 12px", color:C.ink, fontSize:12,
            outline:"none", minWidth:200,
          }}
        />
      </div>

      {filtered.length === 0 && (
        <div style={{ color:C.inkLow, textAlign:"center", padding:"40px 0", fontSize:14 }}>
          No scans match this filter.
        </div>
      )}
      {filtered.map((scan, i) => (
        <CommitCard key={scan.id} scan={scan} feedback={feedback}
          onFeedback={onFeedback} onOpenWhyBlocked={onOpenWhyBlocked}
          onOpenDetail={onOpenDetail} animDelay={i*0.03} />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   METRICS TAB
───────────────────────────────────────────── */
function MetricsTab({ scans }) {
  const completed = scans.filter(s => s.status!=="running");

  const blockRate = completed.length
    ? ((completed.filter(s=>s.action_taken==="BLOCK").length / completed.length)*100).toFixed(1)
    : "0";

  const avgConf = useMemo(() => {
    const w = completed.filter(s=>s.ai_confidence!=null);
    return w.length ? Math.round(w.reduce((a,s)=>a+s.ai_confidence,0)/w.length) : null;
  }, [completed]);

  const dailyVol = useMemo(() => {
    const by = {};
    completed.forEach(s => {
      const d = fmt(s.created_at);
      if (!by[d]) by[d] = { day:d, total:0, blocked:0, allowed:0 };
      by[d].total++;
      if (s.action_taken==="BLOCK") by[d].blocked++;
      else by[d].allowed++;
    });
    return Object.values(by).slice(-14);
  }, [completed]);

  const riskDist = useMemo(() => {
    const bins = { "0-2":0, "3-4":0, "5-6":0, "7-8":0, "9-10":0 };
    completed.forEach(s => {
      const r = s.risk_score || 0;
      if (r<=2) bins["0-2"]++;
      else if (r<=4) bins["3-4"]++;
      else if (r<=6) bins["5-6"]++;
      else if (r<=8) bins["7-8"]++;
      else bins["9-10"]++;
    });
    return Object.entries(bins).map(([name,value]) => ({ name, value }));
  }, [completed]);

  const confOverTime = useMemo(() => (
    completed.filter(s=>s.ai_confidence!=null).slice(-20).reverse().map(s => ({
      name: s.commit_sha?.slice(0,6)||"—",
      conf: s.ai_confidence,
      risk: s.risk_score||0,
    }))
  ), [completed]);

  /* Pipeline stage pass rates */
  const stageStats = useMemo(() => {
    const stats = {};
    PIPELINE_STAGES.forEach(st => { stats[st.key] = { passed:0, failed:0, total:0 }; });
    completed.forEach(s => {
      s.pipeline?.forEach(p => {
        if (!stats[p.id]) return;
        stats[p.id].total++;
        if (p.status==="passed") stats[p.id].passed++;
        if (p.status==="failed") stats[p.id].failed++;
      });
    });
    return PIPELINE_STAGES.map(st => ({
      name:  st.label,
      pass:  stats[st.key].total ? +((stats[st.key].passed/stats[st.key].total)*100).toFixed(0) : 100,
      fail:  stats[st.key].total ? +((stats[st.key].failed/stats[st.key].total)*100).toFixed(0) : 0,
    }));
  }, [completed]);

  return (
    <div style={{ animation:"fadeInUp .4s ease" }}>
      {/* KPI tiles */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:14, marginBottom:16 }}>
        {[
          { label:"Block rate",     value:`${blockRate}%`,             color:C.red    },
          { label:"AI confidence",  value: avgConf!=null?`${avgConf}%`:"—", color:C.violet },
          { label:"Total scans",    value: completed.length,            color:C.teal   },
          { label:"Blocked",        value: completed.filter(s=>s.action_taken==="BLOCK").length, color:C.amber },
          { label:"With AI",        value: completed.filter(s=>s.ai_explanation).length, color:C.cyan  },
        ].map(k => (
          <Card key={k.label} style={{ padding:"16px 18px" }}>
            <div style={{ fontSize:9, color:C.inkLow, fontWeight:800, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:10 }}>{k.label}</div>
            <div style={{ fontSize:30, fontWeight:900, fontFamily:C.mono, color:k.color, lineHeight:1 }}>{k.value}</div>
          </Card>
        ))}
      </div>

      {/* Volume stacked + Risk dist */}
      <div style={{ display:"grid", gridTemplateColumns:"3fr 2fr", gap:14, marginBottom:14 }}>
        <Card>
          <SectionTitle accent={C.blue}>Daily scan volume</SectionTitle>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dailyVol} barSize={18}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
              <XAxis dataKey="day" stroke="transparent" tick={{ fill:C.inkMid, fontSize:9 }} />
              <YAxis stroke="transparent" tick={{ fill:C.inkMid, fontSize:10 }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="allowed" name="Allowed" fill={C.teal} stackId="a" radius={[0,0,0,0]} />
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
                {riskDist.map((e,i) => (
                  <Cell key={i} fill={
                    e.name==="9-10"?"#ff4d6a":
                    e.name==="7-8" ?C.amber:
                    e.name==="5-6" ?C.blue:
                    C.teal
                  } />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* AI confidence over time */}
      <Card>
        <SectionTitle accent={C.violet}>AI confidence over time</SectionTitle>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={confOverTime}>
            <defs>
              <linearGradient id="confGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.violet} stopOpacity={0.3} />
                <stop offset="100%" stopColor={C.violet} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
            <XAxis dataKey="name" stroke="transparent" tick={{ fill:C.inkMid, fontSize:10 }} />
            <YAxis stroke="transparent" tick={{ fill:C.inkMid, fontSize:10 }} domain={[50,100]} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="conf" name="AI Confidence %" stroke={C.violet} strokeWidth={2} dot={{ r:3, fill:C.violet }} />
            <Line type="monotone" dataKey="risk" name="Risk score" stroke={C.amber} strokeWidth={1.5} dot={false} strokeDasharray="4 3" />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Pipeline stage pass rates */}
      <Card>
        <SectionTitle accent={C.green}>Pipeline stage pass rates</SectionTitle>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={stageStats} barSize={22}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
            <XAxis dataKey="name" stroke="transparent" tick={{ fill:C.inkMid, fontSize:10 }} />
            <YAxis stroke="transparent" tick={{ fill:C.inkMid, fontSize:10 }} domain={[0,100]} unit="%" />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="pass" name="Pass %" fill={C.green} radius={[0,0,0,0]} stackId="s" />
            <Bar dataKey="fail" name="Fail %" fill={C.red}   radius={[4,4,0,0]} stackId="s" />
          </BarChart>
        </ResponsiveContainer>
      </Card>
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

    const connectWS = () => {
      const url = BACKEND.replace(/^http/, "ws") + "/ws/scans";
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen    = () => console.log("WS connected");
      ws.onmessage = (e) => {
        try { const m = JSON.parse(e.data); if (m.type==="ping") return; } catch {}
        fetchScans();
      };
      ws.onclose   = () => { reconnectTimer = setTimeout(connectWS, 4000); };
      ws.onerror   = () => ws.close();
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
        body: JSON.stringify({ feedback: type==="accept" ? "accurate" : "incorrect" }),
      });
    } catch {}
  }, []);

  /* Derived */
  const running   = useMemo(() => scans.filter(s=>s.status==="running"), [scans]);
  const completed = useMemo(() => scans.filter(s=>s.status!=="running"), [scans]);
  const blocked   = useMemo(() => completed.filter(s=>s.action_taken==="BLOCK"), [completed]);
  const allowed   = useMemo(() => completed.filter(s=>s.action_taken==="ALLOW"), [completed]);

  const avgRisk = completed.length
    ? (completed.reduce((a,s)=>a+(s.risk_score||0),0)/completed.length).toFixed(1)
    : "0";

  const healthScore = Math.max(0, Math.min(100,
    Math.round(100 - (blocked.length/(completed.length||1))*40 - parseFloat(avgRisk)*6)
  ));

  const TABS = [
    { id:"overview", label:"Overview", Icon:Activity        },
    { id:"pipeline", label:"Pipeline", Icon:GitPullRequest  },
    { id:"feed",     label:"Scan Feed",Icon:ListChecks      },
    { id:"metrics",  label:"Metrics",  Icon:TrendingUp      },
  ];

  return (
    <>
      {whyBlockedScan && (
        <WhyBlockedModal scan={whyBlockedScan} onClose={() => setWhyBlockedScan(null)} />
      )}

      <div style={{ minHeight:"100vh", background:C.bg, color:C.ink, fontFamily:C.sans }}>
        {/* ── HEADER ── */}
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

          {/* Divider */}
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
          <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:10 }}>
            {running.length > 0 && (
              <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:C.blue, fontWeight:600 }}>
                <div style={{ width:7, height:7, borderRadius:"50%", background:C.blue, animation:"pulseRing 1.5s infinite" }} />
                {running.length} running
              </div>
            )}

            {lastUpdated && (
              <span style={{ fontSize:11, color:C.inkLow }}>
                Updated {relTime(lastUpdated.toISOString())}
              </span>
            )}

            <button onClick={() => setShowCopilot(v=>!v)} style={{
              display:"flex", alignItems:"center", gap:6,
              padding:"6px 13px", borderRadius:8,
              background: showCopilot ? C.tealSoft : C.bgSurface,
              border:`1px solid ${showCopilot ? C.tealBord : C.border}`,
              color: showCopilot ? C.teal : C.inkMid,
              fontSize:12, fontWeight:600,
              transition:"all .2s",
            }}>
              <Sparkles size={14} />
              AI Copilot
            </button>

            <button onClick={fetchScans} title="Refresh" style={{
              padding:"6px", background:"none",
              border:"none", color:C.inkMid, borderRadius:8,
              display:"flex", alignItems:"center",
            }}>
              <RefreshCw size={16} />
            </button>
          </div>
        </header>

        {/* ── MAIN ── */}
        <main style={{ padding:"24px", maxWidth:1280, margin:"0 auto" }}>
          {loading ? (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"60vh", gap:16 }}>
              <div style={{
                width:48, height:48, borderRadius:"50%",
                border:`3px solid ${C.border}`,
                borderTop:`3px solid ${C.teal}`,
                animation:"spin 1s linear infinite",
              }} />
              <div style={{ color:C.inkMid, fontSize:14 }}>Connecting to SecureFlow…</div>
            </div>
          ) : (
            <>
              {activeTab==="overview" && (
                <OverviewTab
                  scans={scans}
                  healthScore={healthScore}
                  avgRisk={avgRisk}
                  blocked={blocked}
                  allowed={allowed}
                  running={running}
                  completed={completed}
                  feedback={feedback}
                  onFeedback={submitFeedback}
                  onOpenWhyBlocked={setWhyBlockedScan}
                  onOpenDetail={setSelectedScan}
                />
              )}
              {activeTab==="pipeline" && (
                <PipelineTab
                  scans={scans}
                  feedback={feedback}
                  onFeedback={submitFeedback}
                  onOpenWhyBlocked={setWhyBlockedScan}
                  onOpenDetail={setSelectedScan}
                />
              )}
              {activeTab==="feed" && (
                <ScanFeedTab
                  scans={scans}
                  feedback={feedback}
                  onFeedback={submitFeedback}
                  onOpenWhyBlocked={setWhyBlockedScan}
                  onOpenDetail={setSelectedScan}
                />
              )}
              {activeTab==="metrics" && (
                <MetricsTab scans={scans} />
              )}
            </>
          )}
        </main>
      </div>

      {/* Scan detail panel */}
      {selectedScan && (
        <ScanDetail
          scan={selectedScan}
          onClose={() => setSelectedScan(null)}
          feedback={feedback}
          onFeedback={submitFeedback}
          onWhyBlocked={setWhyBlockedScan}
        />
      )}

      {/* AI Copilot floating */}
      {showCopilot && (
        <AICopilot
          scans={scans}
          onClose={() => setShowCopilot(false)}
        />
      )}
    </>
  );
}
