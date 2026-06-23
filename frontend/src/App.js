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
  Terminal, Filter, Command,
} from "lucide-react";

const API =
  process.env.REACT_APP_BACKEND_URL ||
  "https://secureflow-backend-1083585992526.us-central1.run.app";

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:          "#0a0e13",
  bgCard:      "#0f1419",
  bgHover:     "#141c24",
  bgSurface:   "#1a2332",
  bgElevated:  "#1f2d3d",
  border:      "#1e2d3d",
  borderBright:"#2a3f55",
  ink:         "#e2eaf3",
  inkMid:      "#7a92aa",
  inkLow:      "#3d5166",
  teal:        "#00d9a6",
  tealSoft:    "#00d9a618",
  tealBord:    "#00d9a630",
  tealDim:     "#003d2e",
  blue:        "#4da8ff",
  blueSoft:    "#4da8ff15",
  blueDim:     "#0a2040",
  green:       "#2ecc71",
  greenSoft:   "#2ecc7115",
  greenBord:   "#1a7a44",
  red:         "#ff4d6a",
  redSoft:     "#ff4d6a12",
  redBord:     "#8a1a2e",
  amber:       "#ffb347",
  amberSoft:   "#ffb34712",
  amberBord:   "#7a4a00",
  violet:      "#9d7fea",
  violetSoft:  "#9d7fea12",
  violetBord:  "#4a2a8a",
  mono: "'JetBrains Mono','Fira Mono','Consolas',monospace",
  sans: "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
};

const NAV = [
  { id: "overview", label: "Overview",    icon: Activity  },
  { id: "pipeline", label: "Pipeline",    icon: GitCommit },
  { id: "ai",       label: "AI Insights", icon: Zap       },
  { id: "metrics",  label: "Metrics",     icon: TrendingUp},
];

// ── Formatters ────────────────────────────────────────────────────────────────
const fmt     = (iso) => { if (!iso) return "—"; const d = new Date(iso); return isNaN(d) ? "—" : d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }); };
const fmtFull = (iso) => { if (!iso) return "—"; const d = new Date(iso); return isNaN(d) ? "—" : d.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); };
const fmtTime = (d)   => d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

const severityColor = (s) => ({ CRITICAL: C.red, HIGH: C.amber, MEDIUM: C.blue, LOW: C.inkMid, CLEAN: C.teal }[String(s || "").toUpperCase()] || C.inkMid);
const riskColor     = (n) => n >= 7 ? C.red : n >= 4 ? C.amber : C.teal;

const TT = { background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 12, color: C.ink };

// ── localStorage helpers ──────────────────────────────────────────────────────
const lsGet = (key, fallback) => { try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback; } catch { return fallback; } };
const lsSet = (key, val)      => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} };

// ── Shared primitives ─────────────────────────────────────────────────────────
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

// ── Skeleton loader ───────────────────────────────────────────────────────────
const Skeleton = ({ w = "100%", h = 16, r = 6 }) => (
  <div style={{ width: w, height: h, borderRadius: r, background: C.bgSurface, animation: "shimmer 1.4s ease infinite" }} />
);

const SkeletonCard = () => (
  <div style={{ background: C.bgCard, borderRadius: 14, border: `1px solid ${C.border}`, padding: "18px 20px", marginBottom: 10 }}>
    <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
      <Skeleton w={80} h={12} />
      <Skeleton w={60} h={12} />
    </div>
    <Skeleton h={14} style={{ marginBottom: 8 }} />
    <Skeleton w="60%" h={10} />
    <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
      {[1,2,3,4,5,6,7].map(i => <Skeleton key={i} w={40} h={8} r={4} />)}
    </div>
  </div>
);

// ── Security Health Ring (signature element) ──────────────────────────────────
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
        <circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={8}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)", filter: `drop-shadow(0 0 6px ${color}88)` }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ fontSize: 24, fontWeight: 900, color: C.ink, fontFamily: C.mono, lineHeight: 1 }}>{score}</div>
        <div style={{ fontSize: 8, color, fontWeight: 700, letterSpacing: "0.1em", marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
};

// ── StatCard ──────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, color, sub, trend }) => (
  <div style={{
    background: C.bgCard, borderRadius: 14,
    border: `1px solid ${C.border}`,
    padding: "16px 18px", display: "flex", flexDirection: "column", gap: 8,
    position: "relative", overflow: "hidden",
  }}>
    <div style={{ position: "absolute", top: 0, right: 0, width: 60, height: 60, background: color + "08", borderRadius: "0 14px 0 60px" }} />
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ background: color + "15", borderRadius: 9, padding: 7 }}>
        <Icon size={14} color={color} strokeWidth={2.5} />
      </div>
      {trend !== undefined && (
        <span style={{ fontSize: 9, color: trend >= 0 ? C.teal : C.red, fontWeight: 700, fontFamily: C.mono }}>
          {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}%
        </span>
      )}
    </div>
    <div style={{ fontSize: 28, fontWeight: 900, color: C.ink, lineHeight: 1, fontFamily: C.mono }}>{value}</div>
    <div style={{ fontSize: 11, color: C.inkMid, fontWeight: 600 }}>{label}</div>
    {sub && <div style={{ fontSize: 10, color: C.inkLow }}>{sub}</div>}
  </div>
);

// ── VulnBreakdown ─────────────────────────────────────────────────────────────
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
        <div style={{ padding: "10px 12px", background: C.bgCard, fontSize: 12 }}>
          {base_image_note && (
            <div style={{ display: "flex", gap: 8, padding: "8px 10px", borderRadius: 8, background: C.amberSoft, border: `1px solid ${C.amberBord}`, marginBottom: 10, color: C.amber, lineHeight: 1.5 }}>
              <Info size={13} style={{ flexShrink: 0, marginTop: 1 }} /><span>{base_image_note}</span>
            </div>
          )}
          {fixable_details.length > 0 && <>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.red, marginBottom: 6, letterSpacing: "0.06em" }}>⚠ FIXABLE — ACTION REQUIRED</div>
            {fixable_details.map(v => (
              <div key={v.id} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
                <Badge color={severityColor(v.severity)} small>{v.severity}</Badge>
                <div style={{ flex: 1 }}>
                  <span style={{ fontFamily: C.mono, fontSize: 10, color: C.blue }}>{v.id}</span>
                  <span style={{ color: C.inkMid, marginLeft: 6 }}>{v.package}</span>
                  <div style={{ fontSize: 10, color: C.teal, marginTop: 2 }}>Fix: {v.fix}</div>
                </div>
              </div>
            ))}
          </>}
          {fixable_count === 0 && <div style={{ color: C.teal, fontSize: 11, padding: "4px 0" }}>✓ No fixable CVEs</div>}
        </div>
      )}
    </div>
  );
};

// ── Pipeline stages ───────────────────────────────────────────────────────────
const STAGES = [
  { key: "checkout",  label: "Checkout",  icon: "⬇" },
  { key: "code_scan", label: "Code Scan", icon: "🔍" },
  { key: "docker",    label: "Docker",    icon: "🐳" },
  { key: "trivy",     label: "Trivy",     icon: "🛡" },
  { key: "policy",    label: "Policy",    icon: "⚖" },
  { key: "ai",        label: "AI",        icon: "⚡" },
  { key: "deploy",    label: "Deploy",    icon: "🚀" },
];

const stageStatus = (scan, key) => {
  const s = (scan.pipeline_steps || {})[key];
  if (s) {
    const r = String(s.result || s.status || "").toUpperCase();
    if (["PASS","SUCCESS","SCANNED"].includes(r)) return "success";
    if (["BLOCK","FAILED"].includes(r)) return "failed";
    if (r === "SKIPPED") return "skipped";
    if (r === "RUNNING") return "running";
    return "pending";
  }
  const bl = scan.action_taken === "BLOCK";
  const done = scan.status === "complete";
  const isCode = scan.scan_type === "code-scan";
  if (!done) return key === "checkout" ? "running" : "pending";
  if (key === "checkout")  return "success";
  if (key === "code_scan") return bl && isCode ? "failed" : "success";
  if (key === "docker")    return isCode ? "skipped" : "success";
  if (key === "trivy")     return isCode ? "skipped" : "success";
  if (key === "policy")    return isCode ? "skipped" : bl ? "failed" : "success";
  if (key === "ai")        return scan.ai_explanation ? "success" : "skipped";
  if (key === "deploy")    return isCode ? "skipped" : bl ? "failed" : "success";
  return "pending";
};

const stageColor = (st) => ({ success: C.teal, failed: C.red, running: C.blue, skipped: C.inkLow, pending: C.bgSurface }[st] || C.bgSurface);

// ── Pipeline Timeline (upgraded) ──────────────────────────────────────────────
const PipelineTimeline = ({ scan }) => (
  <div style={{ display: "flex", alignItems: "center", margin: "14px 0 4px", overflowX: "auto", gap: 0 }}>
    {STAGES.map((stage, i) => {
      const isDeployStage = stage.key === "deploy";
      const status = isDeployStage
        ? (scan.action_taken === "BLOCK" ? "failed" : scan.status === "running" ? "running" : scan.status === "complete" && scan.action_taken === "ALLOW" ? "success" : "pending")
        : stageStatus(scan, stage.key);
      const color = stageColor(status);
      const detail = isDeployStage
        ? (scan.action_taken === "BLOCK" ? "blocked" : scan.status === "running" ? "running…" : scan.action_taken === "ALLOW" ? "cloud run" : "—")
        : (scan.pipeline_steps?.[stage.key]?.detail || status);

      return (
        <React.Fragment key={stage.key}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 56 }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: status === "pending" ? C.bgSurface : color + "18",
              border: `2px solid ${color}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, flexShrink: 0,
              boxShadow: status !== "pending" && status !== "skipped" ? `0 0 10px ${color}44` : "none",
              animation: status === "running" ? "pulse 1.5s ease-in-out infinite" : "none",
            }}>
              {status === "success" && <span style={{ color: C.teal, fontSize: 11 }}>✓</span>}
              {status === "failed"  && <span style={{ color: C.red,  fontSize: 11 }}>✗</span>}
              {status === "running" && <span style={{ color: C.blue, fontSize: 8 }}>●</span>}
              {status === "skipped" && <span style={{ color: C.inkLow, fontSize: 9 }}>–</span>}
              {status === "pending" && <span style={{ color: C.inkLow, fontSize: 9 }}>·</span>}
            </div>
            <div style={{ fontSize: 9, color: C.inkMid, marginTop: 5, textAlign: "center", whiteSpace: "nowrap" }}>{stage.label}</div>
            <div style={{ fontSize: 8, color, fontWeight: 700, textAlign: "center", whiteSpace: "nowrap", maxWidth: 56, overflow: "hidden", textOverflow: "ellipsis" }}>{detail}</div>
          </div>
          {i < STAGES.length - 1 && (
            <div style={{
              flex: 1, height: 2, minWidth: 8,
              background: stageStatus(scan, STAGES[i+1]?.key) !== "pending" || i === 0 ? color + "60" : C.border,
              marginBottom: 24, flexShrink: 0,
              transition: "background 0.3s",
            }} />
          )}
        </React.Fragment>
      );
    })}
  </div>
);

// ── CommitCard ────────────────────────────────────────────────────────────────
const CommitCard = ({ scan, feedback, onFeedback }) => {
  const [expanded, setExpanded] = useState(false);
  const bl = scan.action_taken === "BLOCK";
  const isRunning = scan.status === "running";
  const accentColor = isRunning ? C.blue : bl ? C.red : C.teal;

  return (
    <div style={{
      background: C.bgCard, borderRadius: 14,
      border: `1px solid ${C.border}`,
      borderLeft: `3px solid ${accentColor}`,
      padding: "14px 16px", marginBottom: 10,
      transition: "border-color 0.2s, box-shadow 0.2s",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginBottom: 5 }}>
            <span style={{ fontFamily: C.mono, fontSize: 12, color: C.blue, fontWeight: 700 }}>
              {scan.commit_sha?.slice(0, 8) || "—"}
            </span>
            {isRunning
              ? <Badge color={C.blue}><span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><span style={{ width: 5, height: 5, borderRadius: "50%", background: C.blue, animation: "blink 1s infinite", display: "inline-block" }} />RUNNING</span></Badge>
              : <Badge color={bl ? C.red : C.teal}>{scan.action_taken || "—"}</Badge>
            }
            {!isRunning && scan.severity && <Badge color={severityColor(scan.severity)}>{scan.severity}</Badge>}
            {scan.risk_score != null && !isRunning && <Badge color={riskColor(scan.risk_score)} small>Risk {scan.risk_score}/10</Badge>}
            {scan.ai_urgency && !isRunning && <Badge color={scan.ai_urgency === "Fix right now" ? C.red : scan.ai_urgency === "Fix before next deploy" ? C.amber : C.inkMid} small>{scan.ai_urgency}</Badge>}
          </div>
          <div style={{ fontSize: 13, color: C.ink, fontWeight: 600, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {scan.commit_message || scan.repo_name || "—"}
          </div>
          <div style={{ fontSize: 11, color: C.inkMid }}>
            {scan.repo_name} · {scan.branch} · {fmt(scan.created_at)}
          </div>
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

      <PipelineTimeline scan={scan} />

      {expanded && (
        <div style={{ marginTop: 12, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            {[
              { label: "REPO / BRANCH", value: `${scan.repo_name || "—"} / ${scan.branch || "—"}` },
              { label: "SCANNED AT",    value: fmtFull(scan.created_at) },
              { label: "SCAN TYPE",     value: (scan.scan_type || "").toUpperCase().replace(/-/g," ") + " PIPELINE" },
              { label: "COMMIT SHA",    value: scan.commit_sha?.slice(0,12) || "—", mono: true },
            ].map(({ label, value, mono }) => (
              <div key={label}>
                <div style={{ fontSize: 9, color: C.inkLow, fontWeight: 800, letterSpacing: "0.1em", marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 12, color: C.inkMid, fontFamily: mono ? C.mono : "inherit" }}>{value}</div>
              </div>
            ))}
          </div>

          {scan.vuln_breakdown && <VulnBreakdown breakdown={scan.vuln_breakdown} />}

          {/* ── WHY THIS WAS ALLOWED (shows when high-risk scan still passed) ── */}
          {scan.allow_reason && (
            <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, background: C.tealSoft, border: `1px solid ${C.tealBord}`, fontSize: 12, color: C.inkMid, lineHeight: 1.6 }}>
              <strong style={{ color: C.teal, display: "block", marginBottom: 4, fontSize: 10, letterSpacing: "0.08em" }}>✓ WHY THIS WAS ALLOWED</strong>
              {scan.allow_reason}
            </div>
          )}

          {scan.ai_explanation && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 9, color: C.violet, fontWeight: 800, letterSpacing: "0.1em", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <Zap size={10} color={C.violet} /> AI ANALYSIS · GROQ
              </div>
              <div style={{ fontSize: 12, color: C.inkMid, lineHeight: 1.7, background: C.violetSoft, borderRadius: 10, padding: "12px 14px", border: `1px solid ${C.violetBord}` }}>
                {scan.ai_explanation}
              </div>
              {scan.ai_fix && (
                <div style={{ marginTop: 8, fontSize: 12, color: C.inkMid, background: C.tealSoft, borderRadius: 10, padding: "10px 14px", border: `1px solid ${C.tealBord}` }}>
                  <strong style={{ color: C.teal, display: "block", marginBottom: 4, fontSize: 10, letterSpacing: "0.08em" }}>REMEDIATION</strong>
                  {scan.ai_fix}
                </div>
              )}
              {/* ── Urgency tag under remediation ── */}
              {scan.ai_urgency && (
                <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 10, color: C.inkLow, fontWeight: 700, letterSpacing: "0.08em" }}>URGENCY</span>
                  <Badge color={
                    scan.ai_urgency === "Fix right now" ? C.red :
                    scan.ai_urgency === "Fix before next deploy" ? C.amber : C.inkMid
                  } small>{scan.ai_urgency}</Badge>
                </div>
              )}
              <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 10, color: C.inkLow }}>WAS THIS HELPFUL?</span>
                {feedback[scan.id] ? (
                  <Badge color={feedback[scan.id] === "error" ? C.red : feedback[scan.id] === "accept" ? C.teal : C.amber} small>
                    {feedback[scan.id] === "error" ? "Error" : feedback[scan.id] === "accept" ? "Marked accurate" : "Marked incorrect"}
                  </Badge>
                ) : (
                  <>
                    <button onClick={() => onFeedback(scan.id, "accept")} style={{ border: `1px solid ${C.border}`, borderRadius: 7, background: C.bgSurface, padding: "3px 10px", cursor: "pointer", fontSize: 11, color: C.inkMid }}>Accurate</button>
                    <button onClick={() => onFeedback(scan.id, "reject")} style={{ border: `1px solid ${C.border}`, borderRadius: 7, background: C.bgSurface, padding: "3px 10px", cursor: "pointer", fontSize: 11, color: C.inkMid }}>Incorrect</button>
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

// ── Notification panel ────────────────────────────────────────────────────────
const NotificationPanel = ({ scans, onClose, onClearAll }) => (
  <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 50, width: 340, background: C.bgCard, borderRadius: 14, border: `1px solid ${C.border}`, boxShadow: "0 16px 48px rgba(0,0,0,0.6)" }}>
    <div style={{ padding: "12px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>Blocked Pipelines</span>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {scans.length > 0 && <button onClick={onClearAll} style={{ border: `1px solid ${C.border}`, borderRadius: 7, background: C.bgSurface, padding: "3px 9px", cursor: "pointer", fontSize: 10, color: C.inkMid, fontWeight: 600 }}>Dismiss all</button>}
        <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: C.inkMid }}><X size={15} /></button>
      </div>
    </div>
    {scans.length === 0
      ? <div style={{ padding: "28px 14px", textAlign: "center", color: C.inkMid, fontSize: 13 }}><CheckCircle size={24} color={C.teal} style={{ marginBottom: 8, display: "block", margin: "0 auto 8px" }} />All clear</div>
      : scans.map(s => (
        <div key={s.id} style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
            <Badge color={C.red}>BLOCKED</Badge>
            <span style={{ fontSize: 10, color: C.inkLow }}>{fmt(s.created_at)}</span>
          </div>
          <div style={{ fontSize: 12, color: C.ink, fontWeight: 600, margin: "4px 0 2px" }}>{s.commit_message?.slice(0,60) || s.repo_name}</div>
          <div style={{ fontSize: 11, color: C.inkMid, fontFamily: C.mono }}>{s.commit_sha?.slice(0,10)}</div>
          {s.ai_explanation && <div style={{ fontSize: 11, color: C.inkMid, marginTop: 5, lineHeight: 1.5, borderLeft: `2px solid ${C.red}44`, paddingLeft: 8 }}>{s.ai_explanation.slice(0,100)}…</div>}
        </div>
      ))
    }
  </div>
);

// ── Command palette (⌘K) ──────────────────────────────────────────────────────
const CommandPalette = ({ scans, onClose, onNavigate }) => {
  const [q, setQ] = useState("");
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const results = useMemo(() => {
    if (!q.trim()) return [];
    const lq = q.toLowerCase();
    return scans.filter(s =>
      [s.repo_name, s.branch, s.commit_sha, s.severity, s.action_taken, s.commit_message]
        .some(v => String(v || "").toLowerCase().includes(lq))
    ).slice(0, 8);
  }, [q, scans]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "15vh" }} onClick={onClose}>
      <div style={{ width: 560, background: C.bgCard, borderRadius: 16, border: `1px solid ${C.borderBright}`, boxShadow: "0 24px 64px rgba(0,0,0,0.8)", overflow: "hidden" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: `1px solid ${C.border}` }}>
          <Search size={15} color={C.inkMid} />
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} placeholder="Search commits, repos, CVEs, severity…" style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: 14, color: C.ink, fontFamily: C.sans }} />
          <kbd style={{ fontSize: 10, color: C.inkLow, background: C.bgSurface, border: `1px solid ${C.border}`, borderRadius: 5, padding: "2px 6px" }}>ESC</kbd>
        </div>
        {results.length === 0 && q.trim() && (
          <div style={{ padding: "24px 16px", textAlign: "center", color: C.inkMid, fontSize: 13 }}>No results for "{q}"</div>
        )}
        {results.length === 0 && !q.trim() && (
          <div style={{ padding: "16px", color: C.inkLow, fontSize: 12 }}>
            <div style={{ marginBottom: 8, fontWeight: 700, letterSpacing: "0.08em", fontSize: 9 }}>QUICK TIPS</div>
            {["Search by commit SHA", "Filter by severity: CRITICAL, HIGH", "Find blocked pipelines"].map(tip => (
              <div key={tip} style={{ padding: "6px 0", display: "flex", alignItems: "center", gap: 8 }}><Terminal size={11} color={C.inkLow} />{tip}</div>
            ))}
          </div>
        )}
        {results.map(s => (
          <div key={s.id} onClick={() => { onNavigate("pipeline"); onClose(); }} style={{ padding: "10px 16px", borderBottom: `1px solid ${C.border}`, cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}
            onMouseEnter={e => e.currentTarget.style.background = C.bgSurface}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <span style={{ fontFamily: C.mono, fontSize: 11, color: C.blue }}>{s.commit_sha?.slice(0,8)}</span>
            <span style={{ flex: 1, fontSize: 12, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.commit_message || s.repo_name}</span>
            <Badge color={s.action_taken === "BLOCK" ? C.red : C.teal} small>{s.action_taken}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Filter bar ────────────────────────────────────────────────────────────────
const FilterBar = ({ filters, setFilters, counts }) => {
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
      <div style={{ display: "flex", gap: 4 }}>
        {severities.map(s => (
          <button key={s} onClick={() => setFilters(f => ({ ...f, severity: s }))} style={{
            padding: "4px 10px", borderRadius: 7, border: `1px solid ${filters.severity === s ? (severityColor(s) + "40") : C.border}`,
            background: filters.severity === s ? (severityColor(s) + "15") : C.bgSurface,
            color: filters.severity === s ? severityColor(s) : C.inkMid,
            cursor: "pointer", fontSize: 10, fontWeight: 700, fontFamily: C.mono,
          }}>{s}</button>
        ))}
      </div>
    </div>
  );
};

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [tab,          setTab]          = useState(() => lsGet("sf_tab", "overview"));
  const [scans,        setScans]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [feedback,     setFeedback]     = useState({});
  const [lastUpdated,  setLastUpdated]  = useState(null);
  const [search,       setSearch]       = useState("");
  const [filters,      setFilters]      = useState(() => lsGet("sf_filters", { action: "ALL", severity: "ALL" }));
  const [navOpen,      setNavOpen]      = useState(false);
  const [bellOpen,     setBellOpen]     = useState(false);
  const [cmdOpen,      setCmdOpen]      = useState(false);
  const [dismissedIds, setDismissedIds] = useState(() => lsGet("sf_dismissed", []));

  const bellRef    = useRef(null);
  const retryCount = useRef(0);
  const retryTimer = useRef(null);

  // Persist preferences
  useEffect(() => { lsSet("sf_tab", tab); }, [tab]);
  useEffect(() => { lsSet("sf_filters", filters); }, [filters]);
  useEffect(() => { lsSet("sf_dismissed", dismissedIds); }, [dismissedIds]);

  // ⌘K / Ctrl+K
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setCmdOpen(o => !o); }
      if (e.key === "Escape") { setCmdOpen(false); setBellOpen(false); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/scan-results`, { timeout: 10000 });
      const data = Array.isArray(res.data) ? res.data : [];
      setScans(data);
      setError(null);
      setLastUpdated(fmtTime(new Date()));
      retryCount.current = 0;
      clearTimeout(retryTimer.current);
    } catch {
      retryCount.current += 1;
      if (retryCount.current <= 3) {
        const delay = retryCount.current * 3000;
        setError(`Backend unreachable — retrying in ${delay/1000}s… (${retryCount.current}/3)`);
        retryTimer.current = setTimeout(fetchAll, delay);
      } else {
        setError("Cannot reach backend. Check your connection or try refreshing.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const WS_URL = API.replace("https://", "wss://").replace("http://", "ws://");
    let ws, reconnectTimer, pingTimer;

    const connect = () => {
      ws = new WebSocket(`${WS_URL}/ws`);
      ws.onopen = () => {
        pingTimer = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send("ping");
        }, 30000);
      };
      ws.onmessage = () => { fetchAll(); };
      ws.onclose = () => {
        clearInterval(pingTimer);
        reconnectTimer = setTimeout(connect, 3000);
      };
      ws.onerror = () => { ws.close(); };
    };

    connect();

    return () => {
      clearInterval(pingTimer);
      clearTimeout(reconnectTimer);
      clearTimeout(retryTimer.current);
      if (ws) ws.close();
    };
  }, [fetchAll]);

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
    const ids = scans.filter(s => s.action_taken === "BLOCK").map(s => s.id);
    setDismissedIds(prev => [...new Set([...prev, ...ids])]);
    setTimeout(() => setBellOpen(false), 600);
  };

  // ── Derived stats (memoized) ─────────────────────────────────────────────
  const running   = useMemo(() => scans.filter(s => s.status === "running"), [scans]);
  const completed = useMemo(() => scans.filter(s => s.status !== "running"), [scans]);
  const blocked   = useMemo(() => completed.filter(s => s.action_taken === "BLOCK"), [completed]);
  const allowed   = useMemo(() => completed.filter(s => s.action_taken === "ALLOW"), [completed]);
  const withAI    = useMemo(() => completed.filter(s => s.ai_explanation), [completed]);
  const avgRisk   = useMemo(() => completed.length ? +(completed.reduce((a,s) => a + (s.risk_score||0), 0) / completed.length).toFixed(1) : 0, [completed]);

  // Security health score: 100 - (block% * 40) - (avgRisk * 6)
  const healthScore = useMemo(() => {
    if (!completed.length) return 100;
    const blockPenalty = (blocked.length / completed.length) * 40;
    const riskPenalty  = avgRisk * 6;
    return Math.max(0, Math.min(100, Math.round(100 - blockPenalty - riskPenalty)));
  }, [completed, blocked, avgRisk]);

  const undismissedBlocked = useMemo(() => blocked.filter(s => !dismissedIds.includes(s.id)), [blocked, dismissedIds]);
  const blockCount = undismissedBlocked.length;

  const filtered = useMemo(() => {
    return scans.filter(s => {
      const q = search.toLowerCase().trim();
      const matchSearch = !q || [s.repo_name, s.branch, s.commit_sha, s.severity, s.action_taken, s.commit_message].some(v => String(v||"").toLowerCase().includes(q));
      const matchAction = filters.action === "ALL" || s.action_taken === filters.action;
      const matchSev    = filters.severity === "ALL" || (s.severity||"").toUpperCase() === filters.severity;
      return matchSearch && matchAction && matchSev;
    });
  }, [scans, search, filters]);

  const trendData = useMemo(() => [...scans]
    .filter(s => s.created_at && s.risk_score != null)
    .sort((a,b) => new Date(a.created_at) - new Date(b.created_at))
    .slice(-20)
    .map(s => ({ date: fmt(s.created_at), risk: s.risk_score||0, sha: s.commit_sha?.slice(0,7) })),
  [scans]);

  const sevData = useMemo(() => ["CRITICAL","HIGH","MEDIUM","LOW","CLEAN"]
    .map(name => ({ name, v: scans.filter(s => (s.severity||"").toUpperCase() === name).length, color: severityColor(name) }))
    .filter(d => d.v > 0),
  [scans]);

  const gateData = useMemo(() => [
    { name: "Allowed", value: allowed.length, color: C.teal },
    { name: "Blocked", value: blocked.length, color: C.red  },
  ].filter(d => d.value > 0), [allowed, blocked]);

  const weekData = useMemo(() => {
    const map = {};
    [...scans].sort((a,b) => new Date(a.created_at) - new Date(b.created_at)).forEach(s => {
      if (!s.created_at) return;
      const d = new Date(s.created_at);
      if (isNaN(d.getTime())) return;
      const key = d.toISOString().slice(0,10);
      if (!map[key]) map[key] = { date: fmt(s.created_at), allowed: 0, blocked: 0 };
      if (s.action_taken === "BLOCK") map[key].blocked++; else map[key].allowed++;
    });
    return Object.values(map).slice(-10);
  }, [scans]);

  const feedbackCounts = useMemo(() => {
    const r = { accurate: 0, incorrect: 0, partial: 0, total: 0 };
    withAI.forEach(s => {
      if (s.ai_feedback === "accept")  { r.accurate++;  r.total++; }
      if (s.ai_feedback === "reject")  { r.incorrect++; r.total++; }
      if (s.ai_feedback === "edit")    { r.partial++;   r.total++; }
    });
    return r;
  }, [withAI]);

  const accuracyPct = feedbackCounts.total ? Math.round((feedbackCounts.accurate / feedbackCounts.total) * 100) : null;

  const { topRisks, maxCvssOverall } = useMemo(() => {
    const tally = {};
    completed.forEach(s => {
      (s.vuln_breakdown?.fixable_details || []).forEach(v => {
        const key = v.package || v.id || "unknown";
        if (!tally[key]) tally[key] = { name: key, count: 0, maxCvss: 0, severity: v.severity };
        tally[key].count++;
        tally[key].maxCvss = Math.max(tally[key].maxCvss, v.cvss || 0);
      });
    });
    const risks = Object.values(tally).sort((a,b) => b.maxCvss - a.maxCvss).slice(0,5);
    return { topRisks: risks, maxCvssOverall: Math.max(1, ...risks.map(r => r.maxCvss)) };
  }, [completed]);

  // ── Nav items ─────────────────────────────────────────────────────────────
  const NavItems = () => NAV.map(({ id, label, icon: Icon }) => {
    const active = tab === id;
    return (
      <button key={id} onClick={() => { setTab(id); setNavOpen(false); }} style={{
        display: "flex", alignItems: "center", gap: 10,
        width: "100%", padding: "9px 12px", borderRadius: 9,
        border: "none", cursor: "pointer", marginBottom: 2,
        textAlign: "left", fontSize: 13, fontWeight: active ? 700 : 500,
        background: active ? C.tealSoft : "transparent",
        color: active ? C.teal : C.inkMid, outline: "none",
        transition: "background 0.15s, color 0.15s",
        borderLeft: active ? `2px solid ${C.teal}` : "2px solid transparent",
      }}>
        <Icon size={15} strokeWidth={active ? 2.5 : 2} />
        <span style={{ flex: 1 }}>{label}</span>
        {id === "ai" && <Badge color={C.violet} small>AI</Badge>}
      </button>
    );
  });

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg, fontFamily: C.sans, color: C.ink }}>

      {/* ⌘K Command palette */}
      {cmdOpen && <CommandPalette scans={scans} onClose={() => setCmdOpen(false)} onNavigate={setTab} />}

      {/* ── Sidebar ── */}
      <aside className="sidebar-desktop" style={{
        width: 216, flexShrink: 0, background: C.bgCard,
        borderRight: `1px solid ${C.border}`,
        display: "flex", flexDirection: "column",
        position: "sticky", top: 0, height: "100vh", overflowY: "auto",
      }}>
        <div style={{ padding: "22px 16px 18px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ background: `linear-gradient(135deg, ${C.teal}, ${C.blue})`, borderRadius: 10, padding: 9, boxShadow: `0 0 20px ${C.teal}30` }}>
              <Shield size={16} color="#fff" strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, color: C.ink, letterSpacing: "-0.04em", background: `linear-gradient(90deg, ${C.teal}, ${C.blue})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                SecureFlow
              </div>
              <div style={{ fontSize: 8, color: C.inkLow, fontWeight: 700, letterSpacing: "0.12em" }}>DEVSECOPS · AI</div>
            </div>
          </div>
          {/* ⌘K shortcut hint */}
          <button onClick={() => setCmdOpen(true)} style={{
            width: "100%", display: "flex", alignItems: "center", gap: 8,
            padding: "7px 10px", borderRadius: 8, border: `1px solid ${C.border}`,
            background: C.bgSurface, cursor: "pointer", color: C.inkMid, fontSize: 11,
          }}>
            <Search size={11} />
            <span style={{ flex: 1, textAlign: "left" }}>Search…</span>
            <kbd style={{ fontSize: 9, background: C.bgElevated, border: `1px solid ${C.borderBright}`, borderRadius: 4, padding: "1px 5px", color: C.inkLow }}>⌘K</kbd>
          </button>
        </div>

        <nav style={{ flex: 1, padding: "12px 10px" }}>
          <div style={{ fontSize: 9, color: C.inkLow, fontWeight: 800, padding: "4px 10px 8px", letterSpacing: "0.12em" }}>NAVIGATION</div>
          <NavItems />
        </nav>

        <div style={{ padding: "14px 16px", borderTop: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: error ? C.red : C.teal, boxShadow: `0 0 8px ${error ? C.red : C.teal}` }} />
            <span style={{ fontSize: 11, color: error ? C.red : C.teal, fontWeight: 700 }}>{error ? "Connection issue" : "Pipeline Active"}</span>
          </div>
          {lastUpdated && <div style={{ fontSize: 10, color: C.inkLow, display: "flex", alignItems: "center", gap: 4 }}><Clock size={9} /> Updated {lastUpdated}</div>}
        </div>
      </aside>

      {/* Mobile nav overlay */}
      {navOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.7)" }} onClick={() => setNavOpen(false)}>
          <div style={{ width: 230, height: "100%", background: C.bgCard, borderRight: `1px solid ${C.border}`, padding: "20px 12px" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ background: `linear-gradient(135deg, ${C.teal}, ${C.blue})`, borderRadius: 10, padding: 8 }}><Shield size={15} color="#fff" /></div>
                <span style={{ fontWeight: 900, fontSize: 15, color: C.ink }}>SecureFlow</span>
              </div>
              <button onClick={() => setNavOpen(false)} style={{ border: "none", background: "none", cursor: "pointer", color: C.inkMid }}><X size={18} /></button>
            </div>
            <NavItems />
          </div>
        </div>
      )}

      {/* ── Main ── */}
      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>

        {/* Topbar */}
        <header style={{
          position: "sticky", top: 0, zIndex: 20,
          background: "rgba(10,14,19,0.92)", backdropFilter: "blur(16px)",
          borderBottom: `1px solid ${C.border}`,
          padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setNavOpen(true)} className="hamburger" style={{ border: "none", background: "none", cursor: "pointer", padding: 4, color: C.inkMid, display: "none" }}><Menu size={20} /></button>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.ink, letterSpacing: "-0.02em" }}>{NAV.find(n => n.id === tab)?.label}</div>
              <div style={{ fontSize: 10, color: C.inkLow, marginTop: 1 }}>abhienix / SecureFlow · main</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {running.length > 0 && <Badge color={C.blue}><span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: C.blue, animation: "blink 1s infinite", display: "inline-block" }} />{running.length} running</span></Badge>}
            <Badge color={C.blue}>{completed.length} scans</Badge>
            <Badge color={blocked.length > 0 ? C.red : C.teal}>{blocked.length} blocked</Badge>
            <button onClick={() => setCmdOpen(true)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 10px", borderRadius: 9, border: `1px solid ${C.border}`, background: C.bgCard, color: C.inkMid, cursor: "pointer", fontSize: 12 }}>
              <Command size={12} />
              <span style={{ fontSize: 10, color: C.inkLow }}>⌘K</span>
            </button>
            <button onClick={fetchAll} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 9, border: `1px solid ${C.border}`, background: C.bgCard, color: C.inkMid, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
              <RefreshCw size={12} /> Refresh
            </button>
            <div ref={bellRef} style={{ position: "relative" }}>
              <button onClick={() => setBellOpen(o => !o)} style={{ position: "relative", padding: "7px 9px", borderRadius: 9, border: `1px solid ${blockCount > 0 ? C.redBord : C.border}`, background: blockCount > 0 ? C.redSoft : C.bgCard, cursor: "pointer", display: "flex", alignItems: "center" }}>
                <Bell size={16} color={blockCount > 0 ? C.red : C.inkMid} />
                {blockCount > 0 && <span style={{ position: "absolute", top: -4, right: -4, width: 16, height: 16, borderRadius: "50%", background: C.red, color: "#fff", fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${C.bg}` }}>{blockCount > 99 ? "99+" : blockCount}</span>}
              </button>
              {bellOpen && <NotificationPanel scans={undismissedBlocked} onClose={() => setBellOpen(false)} onClearAll={handleClearAll} />}
            </div>
          </div>
        </header>

        {error && (
          <div style={{ margin: "14px 20px 0", padding: "11px 16px", borderRadius: 10, background: C.redSoft, border: `1px solid ${C.redBord}`, color: C.red, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={14} />{error}
          </div>
        )}

        <div style={{ padding: "20px", flex: 1 }}>

          {/* ══ OVERVIEW ══ */}
          {tab === "overview" && (
            <>
              {/* Hero: Health Ring + Executive Summary */}
              <div style={{
                background: `linear-gradient(135deg, ${C.tealDim}60, ${C.blueDim}80)`,
                border: `1px solid ${C.tealBord}`,
                borderRadius: 16, padding: "24px 28px", marginBottom: 20,
                display: "flex", alignItems: "center", gap: 28, flexWrap: "wrap",
                boxShadow: `0 0 40px ${C.teal}08`,
              }}>
                <HealthRing score={healthScore} size={130} />
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: C.teal, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>
                    ⚡ Security Health — Today
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: C.ink, letterSpacing: "-0.04em", lineHeight: 1.1, marginBottom: 6 }}>
                    {scans.length} pipelines scanned
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: C.inkMid }}>
                    <span><span style={{ color: C.teal }}>✓</span> {allowed.length} deployed successfully</span>
                    <span><span style={{ color: C.red }}>✗</span> {blocked.length} blocked by policy</span>
                    <span><span style={{ color: C.violet }}>⚡</span> {withAI.length} AI-analyzed</span>
                    {blocked.length > 0 && <span style={{ color: C.amber, marginTop: 4 }}>⚠ Main risk: {scans.find(s => s.action_taken === "BLOCK" && s.severity)?.severity || "policy violation"} severity detected</span>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {[
                    { label: "AVG RISK", value: avgRisk, unit: "/10", color: riskColor(avgRisk) },
                    { label: "BLOCK RATE", value: completed.length ? `${Math.round(blocked.length/completed.length*100)}%` : "0%", unit: "", color: blocked.length > 0 ? C.red : C.teal },
                    { label: "AI ACCURACY", value: accuracyPct !== null ? `${accuracyPct}%` : "—", unit: "", color: C.violet },
                  ].map(m => (
                    <div key={m.label} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: "12px 18px", border: `1px solid ${C.border}`, textAlign: "center", minWidth: 80 }}>
                      <div style={{ fontSize: 9, color: C.inkLow, fontWeight: 800, letterSpacing: "0.1em", marginBottom: 6 }}>{m.label}</div>
                      <div style={{ fontSize: 24, fontWeight: 900, color: m.color, fontFamily: C.mono }}>{m.value}<span style={{ fontSize: 12 }}>{m.unit}</span></div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10, marginBottom: 18 }}>
                <StatCard icon={Activity}      label="Total Scans"   value={scans.length}   color={C.blue}   />
                <StatCard icon={CheckCircle}   label="Allowed"       value={allowed.length} color={C.teal}   />
                <StatCard icon={XCircle}       label="Blocked"       value={blocked.length} color={C.red}    sub={blocked.length > 0 ? "review required" : "all clear"} />
                <StatCard icon={AlertTriangle} label="Critical CVEs" value={scans.filter(s => (s.severity||"").toUpperCase() === "CRITICAL").length} color={C.amber} />
                <StatCard icon={Cpu}           label="Avg Risk"      value={`${avgRisk}/10`} color={C.violet} />
                <StatCard icon={Zap}           label="AI Analyzed"   value={withAI.length}  color={C.violet} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 12, marginBottom: 18 }}>
                <Card>
                  <SectionTitle accent={C.blue}>Risk Score Trend</SectionTitle>
                  {trendData.length === 0 ? <EmptyChart /> : (
                    <ResponsiveContainer width="100%" height={150}>
                      <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                        <defs>
                          <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={C.teal} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={C.teal} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" stroke={C.inkLow} tick={{ fontSize: 9, fill: C.inkMid }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                        <YAxis stroke={C.inkLow} tick={{ fontSize: 9, fill: C.inkMid }} tickLine={false} axisLine={false} domain={[0,10]} />
                        <Tooltip contentStyle={TT} formatter={v => [`${v}/10`, "Risk"]} labelFormatter={(l,items) => items[0]?.payload?.sha || l} />
                        <Area type="monotone" dataKey="risk" stroke={C.teal} strokeWidth={2.5} fill="url(#rg)" dot={{ r: 2.5, fill: C.teal, stroke: C.bgCard, strokeWidth: 1.5 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </Card>
                <Card>
                  <SectionTitle accent={C.amber}>Deployments Over Time</SectionTitle>
                  {weekData.length === 0 ? <EmptyChart /> : (
                    <ResponsiveContainer width="100%" height={150}>
                      <BarChart data={weekData} barSize={14} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                        <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" stroke={C.inkLow} tick={{ fontSize: 9, fill: C.inkMid }} tickLine={false} axisLine={false} />
                        <YAxis stroke={C.inkLow} tick={{ fontSize: 9, fill: C.inkMid }} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={TT} />
                        <Bar dataKey="allowed" fill={C.teal} radius={[4,4,0,0]} name="Allowed" stackId="a" />
                        <Bar dataKey="blocked" fill={C.red}  radius={[4,4,0,0]} name="Blocked" stackId="a" />
                        <Legend iconSize={8} wrapperStyle={{ fontSize: 10, color: C.inkMid }} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </Card>
                <Card>
                  <SectionTitle accent={C.violet}>Severity Breakdown</SectionTitle>
                  {sevData.length === 0 ? <EmptyChart /> : (
                    <>
                      <ResponsiveContainer width="100%" height={110}>
                        <PieChart>
                          <Pie data={sevData} cx="50%" cy="50%" innerRadius={30} outerRadius={48} dataKey="v" strokeWidth={2} stroke={C.bgCard}>
                            {sevData.map((d,i) => <Cell key={i} fill={d.color} />)}
                          </Pie>
                          <Tooltip contentStyle={TT} formatter={(v,n) => [v,n]} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 10, fontSize: 11, color: C.inkMid, marginTop: 4 }}>
                        {sevData.map(d => <span key={d.name} style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: d.color, display: "inline-block" }} />{d.name} <strong style={{ color: C.ink }}>{d.v}</strong></span>)}
                      </div>
                    </>
                  )}
                </Card>
              </div>

              <Card>
                <SectionTitle accent={C.teal}>Recent Pipelines</SectionTitle>
                {loading && [1,2,3].map(i => <SkeletonCard key={i} />)}
                {!loading && scans.length === 0 && <EmptyState text="No scans yet — push a commit to get started." />}
                {scans.slice(0,5).map(scan => {
                  const bl = scan.action_taken === "BLOCK";
                  return (
                    <div key={scan.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: bl ? C.red : C.teal, flexShrink: 0, boxShadow: `0 0 6px ${bl ? C.red : C.teal}` }} />
                      <span style={{ fontFamily: C.mono, fontSize: 11, color: C.blue, flexShrink: 0 }}>{scan.commit_sha?.slice(0,8) || "—"}</span>
                      <span style={{ fontSize: 12, color: C.inkMid, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{scan.commit_message || scan.repo_name}</span>
                      <Badge color={bl ? C.red : C.teal}>{scan.action_taken}</Badge>
                      {scan.severity && <Badge color={severityColor(scan.severity)}>{scan.severity}</Badge>}
                      <span style={{ fontSize: 11, color: C.inkLow, flexShrink: 0 }}>{fmt(scan.created_at)}</span>
                    </div>
                  );
                })}
              </Card>
            </>
          )}

          {/* ══ PIPELINE ══ */}
          {tab === "pipeline" && (
            <>
              <div style={{ marginBottom: 14, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
                  <Search size={13} color={C.inkLow} style={{ position: "absolute", left: 10, top: 9, pointerEvents: "none" }} />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search commits, repos, severity…" style={{ width: "100%", padding: "8px 10px 8px 30px", borderRadius: 9, border: `1px solid ${C.border}`, fontSize: 12, outline: "none", background: C.bgCard, color: C.ink, boxSizing: "border-box" }} />
                </div>
                {running.length > 0 && <Badge color={C.blue}><span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: C.blue, animation: "blink 1s infinite", display: "inline-block" }} />{running.length} running</span></Badge>}
                <Badge color={C.teal}>{allowed.length} allowed</Badge>
                <Badge color={C.red}>{blocked.length} blocked</Badge>
              </div>

              <FilterBar filters={filters} setFilters={setFilters} />

              {loading && [1,2,3].map(i => <SkeletonCard key={i} />)}
              {!loading && filtered.length === 0 && <Card style={{ textAlign: "center", padding: 40, color: C.inkLow }}>{search ? `No scans match "${search}"` : "No scans found."}</Card>}
              {filtered.map(scan => <CommitCard key={scan.id} scan={scan} feedback={feedback} onFeedback={submitFeedback} />)}
            </>
          )}

          {/* ══ AI INSIGHTS ══ */}
          {tab === "ai" && (
            <>
              <div style={{ background: `linear-gradient(135deg, ${C.violetSoft}, ${C.blueDim}80)`, border: `1px solid ${C.violetBord}`, borderRadius: 16, padding: "22px 24px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ background: `linear-gradient(135deg, ${C.violet}, ${C.blue})`, borderRadius: 12, padding: 10, boxShadow: `0 0 20px ${C.violet}44` }}>
                    <Zap size={20} color="#fff" strokeWidth={2.5} />
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: C.ink, letterSpacing: "-0.03em" }}>AI Security Intelligence</div>
                    <div style={{ fontSize: 11, color: C.inkMid }}>Powered by Groq · every scan explained in plain language</div>
                  </div>
                  <Badge color={C.violet}>GROQ</Badge>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  {[{ label: "AI Analyzed", value: withAI.length }, { label: "Avg Risk", value: `${avgRisk}/10` }, { label: "Accuracy", value: accuracyPct !== null ? `${accuracyPct}%` : "—" }].map(m => (
                    <div key={m.label} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "10px 16px", border: `1px solid ${C.violetBord}`, textAlign: "center" }}>
                      <div style={{ fontSize: 9, color: C.inkLow, marginBottom: 4, fontWeight: 800, letterSpacing: "0.06em" }}>{m.label}</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: C.violet, fontFamily: C.mono }}>{m.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 12, marginBottom: 20 }}>
                <Card>
                  <SectionTitle accent={C.teal}>AI Feedback Breakdown</SectionTitle>
                  {feedbackCounts.total === 0
                    ? <div style={{ height: 100, display: "flex", alignItems: "center", justifyContent: "center", color: C.inkLow, fontSize: 13 }}>No feedback yet</div>
                    : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {[{ label: "Accurate", value: feedbackCounts.accurate, color: C.teal, icon: ThumbsUp }, { label: "Incorrect", value: feedbackCounts.incorrect, color: C.red, icon: ThumbsDown }, { label: "Partial", value: feedbackCounts.partial, color: C.amber, icon: Minus }].map(row => {
                          const Icon = row.icon;
                          const pct = feedbackCounts.total ? Math.round(row.value/feedbackCounts.total*100) : 0;
                          return (
                            <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <Icon size={13} color={row.color} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                              <span style={{ fontSize: 12, color: C.inkMid, width: 64, flexShrink: 0 }}>{row.label}</span>
                              <div style={{ flex: 1, height: 8, background: C.bgSurface, borderRadius: 4, overflow: "hidden" }}>
                                <div style={{ width: `${pct}%`, height: "100%", background: row.color, borderRadius: 4, transition: "width 0.4s ease" }} />
                              </div>
                              <span style={{ fontSize: 12, fontWeight: 700, color: C.ink, width: 28, textAlign: "right", flexShrink: 0 }}>{row.value}</span>
                            </div>
                          );
                        })}
                      </div>
                  }
                </Card>
                <Card>
                  <SectionTitle accent={C.red}>Riskiest Packages</SectionTitle>
                  {topRisks.length === 0
                    ? <div style={{ height: 100, display: "flex", alignItems: "center", justifyContent: "center", color: C.inkLow, fontSize: 13 }}>No fixable vulnerabilities</div>
                    : <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {topRisks.map(r => (
                          <div key={r.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontSize: 11, fontFamily: C.mono, color: C.inkMid, width: 110, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
                            <div style={{ flex: 1, height: 8, background: C.bgSurface, borderRadius: 4, overflow: "hidden" }}>
                              <div style={{ width: `${(r.maxCvss/maxCvssOverall)*100}%`, height: "100%", background: riskColor(r.maxCvss), borderRadius: 4, transition: "width 0.4s ease" }} />
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: C.ink, width: 32, textAlign: "right", flexShrink: 0 }}>{r.maxCvss.toFixed(1)}</span>
                          </div>
                        ))}
                      </div>
                  }
                </Card>
              </div>

              {loading && [1,2].map(i => <SkeletonCard key={i} />)}
              {!loading && withAI.length === 0 && <Card style={{ textAlign: "center", padding: 40, color: C.inkLow }}><Zap size={32} color={C.violet} style={{ opacity: 0.3, marginBottom: 10, display: "block", margin: "0 auto 10px" }} />No AI-analyzed scans yet.</Card>}
              {!loading && withAI.length > 0 && (
                <Card>
                  <SectionTitle accent={C.violet}>Recent AI Analyses</SectionTitle>
                  {withAI.slice(0,8).map(scan => (
                    <div key={scan.id} style={{ padding: "14px 0", borderBottom: `1px solid ${C.border}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                        <span style={{ fontFamily: C.mono, fontSize: 11, color: C.blue, fontWeight: 700 }}>{scan.commit_sha?.slice(0,8)}</span>
                        <Badge color={riskColor(scan.risk_score||0)} small>Risk {scan.risk_score||0}/10</Badge>
                        <Badge color={scan.action_taken === "BLOCK" ? C.red : C.teal} small>{scan.action_taken}</Badge>
                        {scan.ai_feedback === "accept" && <Badge color={C.teal} small>accurate</Badge>}
                        {scan.ai_feedback === "reject" && <Badge color={C.red}  small>incorrect</Badge>}
                        <span style={{ fontSize: 10, color: C.inkLow, marginLeft: "auto" }}>{fmt(scan.created_at)}</span>
                      </div>
                      <div style={{ fontSize: 12, color: C.inkMid, lineHeight: 1.7, background: C.violetSoft, borderRadius: 10, padding: "10px 12px", border: `1px solid ${C.violetBord}` }}>{scan.ai_explanation}</div>
                      {scan.ai_fix && <div style={{ marginTop: 6, fontSize: 12, color: C.inkMid, background: C.tealSoft, borderRadius: 10, padding: "8px 12px", border: `1px solid ${C.tealBord}` }}><strong style={{ color: C.teal }}>Fix: </strong>{scan.ai_fix}</div>}
                    </div>
                  ))}
                </Card>
              )}
            </>
          )}

          {/* ══ METRICS ══ */}
          {tab === "metrics" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10, marginBottom: 18 }}>
                <StatCard icon={Activity}      label="Total Scans" value={scans.length}      color={C.blue}   sub="all time" />
                <StatCard icon={CheckCircle}   label="Allowed"     value={allowed.length}    color={C.teal}   sub="clean deployments" />
                <StatCard icon={XCircle}       label="Blocked"     value={blocked.length}    color={C.red}    sub="policy violations" />
                <StatCard icon={Zap}           label="AI Analyzed" value={withAI.length}     color={C.violet} sub="with Groq" />
                <StatCard icon={AlertTriangle} label="High Risk"   value={scans.filter(s => (s.risk_score||0) >= 7).length} color={C.amber} sub="risk ≥ 7/10" />
                <StatCard icon={Cpu}           label="Avg Risk"    value={`${avgRisk}/10`}   color={C.violet} sub="mean score" />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                <Card>
                  <SectionTitle accent={C.blue}>Risk Score Over Time</SectionTitle>
                  {trendData.length === 0 ? <EmptyChart /> : (
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                        <defs><linearGradient id="rg2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={C.teal} stopOpacity={0.3} /><stop offset="95%" stopColor={C.teal} stopOpacity={0} /></linearGradient></defs>
                        <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" stroke={C.inkLow} tick={{ fontSize: 9, fill: C.inkMid }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                        <YAxis stroke={C.inkLow} tick={{ fontSize: 9, fill: C.inkMid }} tickLine={false} axisLine={false} domain={[0,10]} />
                        <Tooltip contentStyle={TT} formatter={v => [`${v}/10`, "Risk Score"]} labelFormatter={(l,items) => items[0]?.payload?.sha || l} />
                        <Area type="monotone" dataKey="risk" stroke={C.teal} strokeWidth={2.5} fill="url(#rg2)" dot={{ r: 3, fill: C.teal, stroke: C.bgCard, strokeWidth: 2 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </Card>
                <Card>
                  <SectionTitle accent={C.red}>Policy Gate — Allow vs Block</SectionTitle>
                  {gateData.length === 0 ? <EmptyChart /> : (
                    <>
                      <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                          <Pie data={gateData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} dataKey="value" strokeWidth={3} stroke={C.bgCard} paddingAngle={3}>
                            {gateData.map((d,i) => <Cell key={i} fill={d.color} />)}
                          </Pie>
                          <Tooltip contentStyle={TT} formatter={(v,n) => [v,n]} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{ display: "flex", justifyContent: "center", gap: 20, fontSize: 12, color: C.inkMid }}>
                        {gateData.map(d => <span key={d.name} style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: d.color, display: "inline-block" }} />{d.name} <strong style={{ color: C.ink }}>{d.value}</strong> <span style={{ color: C.inkLow }}>({scans.length ? Math.round(d.value/scans.length*100) : 0}%)</span></span>)}
                      </div>
                    </>
                  )}
                </Card>
              </div>
              <Card>
                <SectionTitle accent={C.amber}>Severity Distribution</SectionTitle>
                {sevData.length === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={sevData} barSize={32} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" stroke={C.inkLow} tick={{ fontSize: 11, fill: C.inkMid }} tickLine={false} axisLine={false} />
                      <YAxis stroke={C.inkLow} tick={{ fontSize: 10, fill: C.inkMid }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={TT} formatter={v => [v, "scans"]} />
                      <Bar dataKey="v" radius={[6,6,0,0]} name="Count">{sevData.map((d,i) => <Cell key={i} fill={d.color} />)}</Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>
              <Card>
                <SectionTitle accent={C.teal}>Daily Volume</SectionTitle>
                {weekData.length === 0 ? <EmptyChart /> : (
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={weekData} barSize={14} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                      <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" stroke={C.inkLow} tick={{ fontSize: 9, fill: C.inkMid }} tickLine={false} axisLine={false} />
                      <YAxis stroke={C.inkLow} tick={{ fontSize: 9, fill: C.inkMid }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={TT} />
                      <Bar dataKey="allowed" fill={C.teal} radius={[4,4,0,0]} name="Allowed" stackId="a" />
                      <Bar dataKey="blocked" fill={C.red}  radius={[4,4,0,0]} name="Blocked" stackId="a" />
                      <Legend iconSize={8} wrapperStyle={{ fontSize: 10, color: C.inkMid }} />
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
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }
        @keyframes pulse {
          0%,100% { box-shadow: 0 0 0 1.5px ${C.blue}, 0 0 0 4px ${C.blue}30; }
          50%      { box-shadow: 0 0 0 1.5px ${C.blue}, 0 0 0 8px ${C.blue}10; }
        }
        @keyframes shimmer {
          0%   { opacity: 0.4; }
          50%  { opacity: 0.8; }
          100% { opacity: 0.4; }
        }
        @media (max-width: 768px) {
          .sidebar-desktop { display: none !important; }
          .hamburger { display: flex !important; }
        }
        @media (min-width: 769px) {
          .hamburger { display: none !important; }
        }
      `}</style>
    </div>
  );
}

const EmptyChart = () => <div style={{ height: 150, display: "flex", alignItems: "center", justifyContent: "center", color: C.inkLow, fontSize: 13 }}>No data yet</div>;
const EmptyState = ({ text }) => <div style={{ color: C.inkLow, fontSize: 13, padding: "24px 0", textAlign: "center" }}>{text}</div>;