import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  Shield, Activity, CheckCircle, XCircle, AlertTriangle, Zap, Cpu,
  RefreshCw, Bell, Search, Menu, X, ThumbsUp, ThumbsDown, Minus,
  ChevronDown, ChevronUp, Package, Info, GitCommit, Clock, TrendingUp,
} from "lucide-react";

const API =
  process.env.REACT_APP_BACKEND_URL ||
  "https://secureflow-backend-1083585992526.us-central1.run.app";

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  // Backgrounds
  bg:        "#0d1117",
  bgCard:    "#161b22",
  bgHover:   "#1c2128",
  bgSurface: "#21262d",
  // Borders
  border:    "#30363d",
  borderFoc: "#58a6ff",
  // Text
  ink:       "#e6edf3",
  inkMid:    "#8b949e",
  inkLow:    "#484f58",
  inkXlow:   "#2d333b",
  // Accents
  blue:      "#58a6ff",
  blueSoft:  "#1f3a5f",
  blueDim:   "#0d2644",
  green:     "#3fb950",
  greenSoft: "#1a3a22",
  greenBord: "#238636",
  red:       "#f85149",
  redSoft:   "#3d1a1a",
  redBord:   "#da3633",
  amber:     "#d29922",
  amberSoft: "#3a2a0a",
  amberBord: "#9e6a03",
  violet:    "#a371f7",
  violetSoft:"#271a40",
  violetBord:"#6e40c9",
  // Glow accent for hero
  glow:      "rgba(88,166,255,0.15)",
  // Fonts
  mono: "'JetBrains Mono','Fira Mono','Consolas',monospace",
  sans: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
};

const NAV = [
  { id: "overview", label: "Overview",    icon: Activity },
  { id: "pipeline", label: "Pipeline",    icon: GitCommit },
  { id: "ai",       label: "AI Insights", icon: Zap      },
  { id: "metrics",  label: "Metrics",     icon: TrendingUp },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

const fmtFull = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

const fmtTime = (date) =>
  date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

const severityColor = (s) =>
  ({ CRITICAL: C.red, HIGH: C.amber, MEDIUM: C.blue, LOW: C.inkMid, CLEAN: C.green }[
    String(s || "").toUpperCase()
  ] || C.inkMid);

const riskColor = (n) => (n >= 7 ? C.red : n >= 4 ? C.amber : C.green);

const TT = {
  background: C.bgCard,
  border: `1px solid ${C.border}`,
  borderRadius: 10,
  fontSize: 12,
  color: C.ink,
};

// ── Shared components ─────────────────────────────────────────────────────────
const Badge = ({ color, children, small }) => (
  <span
    style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      padding: small ? "2px 7px" : "3px 10px",
      borderRadius: 999, fontSize: small ? 9 : 10, fontWeight: 700,
      background: color + "22", color,
      border: `1px solid ${color}44`, whiteSpace: "nowrap", letterSpacing: "0.04em",
    }}
  >
    {children}
  </span>
);

const Card = ({ children, style }) => (
  <div
    style={{
      background: C.bgCard,
      borderRadius: 12,
      border: `1px solid ${C.border}`,
      padding: "16px 18px",
      marginBottom: 12,
      ...style,
    }}
  >
    {children}
  </div>
);

const SectionTitle = ({ children }) => (
  <div
    style={{
      fontSize: 10, fontWeight: 700, color: C.inkMid,
      letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12,
    }}
  >
    {children}
  </div>
);

const StatCard = ({ icon: Icon, label, value, color, sub }) => (
  <div
    style={{
      background: C.bgCard, borderRadius: 12, border: `1px solid ${C.border}`,
      padding: "16px 18px", display: "flex", flexDirection: "column", gap: 6,
      transition: "border-color 0.15s",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ background: color + "18", borderRadius: 8, padding: 7, flexShrink: 0 }}>
        <Icon size={14} color={color} strokeWidth={2.5} />
      </div>
      <span style={{ fontSize: 11, color: C.inkMid, fontWeight: 600 }}>{label}</span>
    </div>
    <div style={{ fontSize: 26, fontWeight: 800, color: C.ink, lineHeight: 1, fontFamily: C.mono }}>
      {value}
    </div>
    {sub && <div style={{ fontSize: 10, color: C.inkLow }}>{sub}</div>}
  </div>
);

// ── VulnBreakdown ─────────────────────────────────────────────────────────────
const VulnBreakdown = ({ breakdown }) => {
  const [open, setOpen] = useState(false);
  if (!breakdown) return null;
  const {
    base_image_count = 0, fixable_count = 0, app_count = 0,
    total = 0, fixable_details = [], base_image_note,
  } = breakdown;

  return (
    <div
      style={{
        marginTop: 10, border: `1px solid ${C.border}`,
        borderRadius: 10, overflow: "hidden",
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center",
          justifyContent: "space-between", padding: "9px 12px",
          background: C.bgSurface, border: "none", cursor: "pointer",
          fontSize: 11, fontWeight: 700, color: C.inkMid,
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Package size={12} />
          {total} CVEs — {base_image_count} base image · {fixable_count} fixable · {app_count} other
        </span>
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {open && (
        <div style={{ padding: "10px 12px", background: C.bgCard, fontSize: 12 }}>
          {base_image_note && (
            <div
              style={{
                display: "flex", gap: 8, padding: "8px 10px", borderRadius: 8,
                background: C.amberSoft, border: `1px solid ${C.amberBord}`,
                marginBottom: 10, color: C.amber, lineHeight: 1.5,
              }}
            >
              <Info size={13} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{base_image_note}</span>
            </div>
          )}
          {fixable_details.length > 0 && (
            <>
              <div
                style={{
                  fontSize: 10, fontWeight: 700, color: C.red,
                  marginBottom: 6, letterSpacing: "0.06em",
                }}
              >
                ⚠ FIXABLE — ACTION REQUIRED
              </div>
              {fixable_details.map((v) => (
                <div
                  key={v.id}
                  style={{
                    display: "flex", gap: 8, alignItems: "flex-start",
                    padding: "6px 0", borderBottom: `1px solid ${C.border}`,
                  }}
                >
                  <Badge color={severityColor(v.severity)} small>
                    {v.severity}
                  </Badge>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontFamily: C.mono, fontSize: 10, color: C.blue }}>
                      {v.id}
                    </span>
                    <span style={{ color: C.inkMid, marginLeft: 6 }}>{v.package}</span>
                    <div style={{ fontSize: 10, color: C.green, marginTop: 2 }}>Fix: {v.fix}</div>
                  </div>
                </div>
              ))}
            </>
          )}
          {fixable_count === 0 && (
            <div style={{ color: C.green, fontSize: 11, padding: "4px 0" }}>
              ✓ No fixable CVEs — all vulnerabilities are informational only.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Pipeline stages ───────────────────────────────────────────────────────────
const STAGES = [
  { key: "checkout",  label: "Checkout" },
  { key: "code_scan", label: "Code scan" },
  { key: "docker",    label: "Docker" },
  { key: "trivy",     label: "Trivy" },
  { key: "policy",    label: "Policy" },
  { key: "ai",        label: "AI" },
  { key: "deploy",    label: "Deploy" },
];

const stageStatus = (scan, stageKey) => {
  const steps = scan.pipeline_steps || {};
  const s = steps[stageKey];
  if (s) {
    const r = String(s.result || s.status || "").toUpperCase();
    if (r === "PASS" || r === "SUCCESS" || r === "SCANNED") return "success";
    if (r === "BLOCK" || r === "FAILED") return "failed";
    if (r === "SKIPPED") return "skipped";
    if (r === "RUNNING") return "running";
    return "pending";
  }
  // Fallback inference for legacy scans with no pipeline_steps
  const bl = scan.action_taken === "BLOCK";
  const done = scan.status === "complete";
  const isCodeOnly = scan.scan_type === "code-scan";
  if (!done) return stageKey === "checkout" ? "running" : "pending";
  if (stageKey === "checkout")  return "success";
  if (stageKey === "code_scan") return bl && isCodeOnly ? "failed" : "success";
  if (stageKey === "docker")    return isCodeOnly ? "skipped" : "success";
  if (stageKey === "trivy")     return isCodeOnly ? "skipped" : "success";
  if (stageKey === "policy")    return isCodeOnly ? "skipped" : bl ? "failed" : "success";
  if (stageKey === "ai")        return scan.ai_explanation ? "success" : "skipped";
  if (stageKey === "deploy")    return isCodeOnly ? "skipped" : bl ? "failed" : "success";
  return "pending";
};

const stageDotColor = (status) =>
  ({ success: C.green, failed: C.red, running: C.blue, skipped: C.inkLow, pending: C.bgSurface }[
    status
  ] || C.bgSurface);

const deployLabel = (scan) => {
  if (scan.action_taken === "BLOCK") return "Blocked";
  if (scan.status === "running") return "Running…";
  const steps = scan.pipeline_steps || {};
  if (steps.deploy?.status === "success" || steps.deploy?.result === "PASS") return "Cloud Run";
  if (steps.deploy?.status === "failed") return "Failed";
  if (scan.action_taken === "ALLOW" && scan.status === "complete") return "Cloud Run";
  return "—";
};

const deployColor = (scan) => {
  if (scan.action_taken === "BLOCK") return C.red;
  if (scan.status === "running") return C.blue;
  const steps = scan.pipeline_steps || {};
  if (steps.deploy?.status === "failed") return C.red;
  if (
    steps.deploy?.status === "success" ||
    steps.deploy?.result === "PASS" ||
    (scan.action_taken === "ALLOW" && scan.status === "complete")
  )
    return C.green;
  return C.inkMid;
};

// ── CommitCard ────────────────────────────────────────────────────────────────
const CommitCard = ({ scan, feedback, onFeedback }) => {
  const [expanded, setExpanded] = useState(false);
  const bl = scan.action_taken === "BLOCK";
  const isRunning = scan.status === "running";
  const accentColor = isRunning ? C.blue : bl ? C.red : C.green;

  return (
    <div
      style={{
        background: C.bgCard,
        borderRadius: 12,
        border: `1px solid ${C.border}`,
        borderLeft: `3px solid ${accentColor}`,
        padding: "14px 16px",
        marginBottom: 10,
        transition: "border-color 0.15s",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex", alignItems: "flex-start",
          justifyContent: "space-between", gap: 10, flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex", alignItems: "center",
              gap: 7, flexWrap: "wrap", marginBottom: 4,
            }}
          >
            <span
              style={{
                fontFamily: C.mono, fontSize: 12,
                color: C.blue, fontWeight: 700,
              }}
            >
              {scan.commit_sha?.slice(0, 8) || "—"}
            </span>
            {isRunning ? (
              <Badge color={C.blue}>
                <span
                  style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                >
                  <span
                    style={{
                      width: 5, height: 5, borderRadius: "50%",
                      background: C.blue, animation: "blink 1s infinite",
                    }}
                  />
                  RUNNING
                </span>
              </Badge>
            ) : (
              <Badge color={bl ? C.red : C.green}>{scan.action_taken}</Badge>
            )}
            {!isRunning && scan.severity && (
              <Badge color={severityColor(scan.severity)}>{scan.severity}</Badge>
            )}
            {scan.risk_score != null && !isRunning && (
              <Badge color={riskColor(scan.risk_score)} small>
                Risk {scan.risk_score}/10
              </Badge>
            )}
          </div>
          <div
            style={{
              fontSize: 13, color: C.ink, fontWeight: 600, marginBottom: 2,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}
          >
            {scan.commit_message || scan.repo_name || "—"}
          </div>
          <div style={{ fontSize: 11, color: C.inkMid }}>
            {scan.repo_name} · {scan.branch} · {fmt(scan.created_at)}
          </div>
        </div>
        <button
          onClick={() => setExpanded((e) => !e)}
          style={{
            border: `1px solid ${C.border}`, borderRadius: 8,
            background: C.bgSurface, padding: "5px 10px",
            cursor: "pointer", fontSize: 11, color: C.inkMid,
            display: "flex", alignItems: "center", gap: 4,
            flexShrink: 0,
          }}
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {expanded ? "Less" : "Details"}
        </button>
      </div>

      {/* Stage pipeline dots */}
      <div
        style={{
          display: "flex", alignItems: "center",
          margin: "14px 0 4px", overflowX: "auto",
        }}
      >
        {STAGES.map((stage, i) => {
          const status = stageStatus(scan, stage.key);
          const isDeployStage = stage.key === "deploy";
          const dotColor = isDeployStage ? deployColor(scan) : stageDotColor(status);
          const labelText = isDeployStage
            ? deployLabel(scan)
            : (scan.pipeline_steps?.[stage.key]?.detail || status);

          return (
            <React.Fragment key={stage.key}>
              <div
                style={{
                  display: "flex", flexDirection: "column",
                  alignItems: "center", minWidth: 52,
                }}
              >
                <div
                  style={{
                    width: 10, height: 10, borderRadius: "50%",
                    background: dotColor,
                    border: `2px solid ${C.bgCard}`,
                    boxShadow: `0 0 0 1.5px ${dotColor}`,
                    flexShrink: 0,
                    ...(status === "running"
                      ? { animation: "pulse 1.5s ease-in-out infinite" }
                      : {}),
                  }}
                />
                <div
                  style={{
                    fontSize: 9, color: C.inkMid, marginTop: 4,
                    textAlign: "center", whiteSpace: "nowrap",
                  }}
                >
                  {stage.label}
                </div>
                <div
                  style={{
                    fontSize: 8, color: dotColor, fontWeight: 700,
                    textAlign: "center", whiteSpace: "nowrap",
                    maxWidth: 56, overflow: "hidden", textOverflow: "ellipsis",
                  }}
                >
                  {labelText}
                </div>
              </div>
              {i < STAGES.length - 1 && (
                <div
                  style={{
                    flex: 1, height: 1.5, minWidth: 8,
                    background: C.border, marginBottom: 22, flexShrink: 0,
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div
          style={{
            marginTop: 10, paddingTop: 12,
            borderTop: `1px solid ${C.border}`,
          }}
        >
          <div
            style={{
              display: "grid", gridTemplateColumns: "1fr 1fr",
              gap: 8, marginBottom: 10,
            }}
          >
            {[
              { label: "REPO / BRANCH", value: `${scan.repo_name || "—"} / ${scan.branch || "—"}` },
              { label: "SCANNED AT",    value: fmtFull(scan.created_at) },
              { label: "SCAN TYPE",     value: (scan.scan_type || "").toUpperCase().replace(/-/g, " ") + " pipeline" },
              { label: "COMMIT SHA",    value: scan.commit_sha?.slice(0, 12) || "—", mono: true },
            ].map(({ label, value, mono }) => (
              <div key={label}>
                <div
                  style={{
                    fontSize: 9, color: C.inkLow, fontWeight: 700,
                    letterSpacing: "0.08em", marginBottom: 2,
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    fontSize: 12, color: C.inkMid,
                    fontFamily: mono ? C.mono : "inherit",
                  }}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>

          {scan.vuln_breakdown && <VulnBreakdown breakdown={scan.vuln_breakdown} />}

          {scan.ai_explanation && (
            <div style={{ marginTop: 10 }}>
              <div
                style={{
                  fontSize: 9, color: C.violet, fontWeight: 700,
                  letterSpacing: "0.08em", marginBottom: 6,
                }}
              >
                AI ANALYSIS · GROQ
              </div>
              <div
                style={{
                  fontSize: 12, color: C.inkMid, lineHeight: 1.65,
                  background: C.violetSoft, borderRadius: 8,
                  padding: "10px 12px", border: `1px solid ${C.violetBord}`,
                }}
              >
                {scan.ai_explanation}
              </div>
              {scan.ai_fix && (
                <div
                  style={{
                    marginTop: 6, fontSize: 12, color: C.inkMid,
                    background: C.greenSoft, borderRadius: 8,
                    padding: "8px 12px", border: `1px solid ${C.greenBord}`,
                  }}
                >
                  <strong style={{ color: C.green }}>REMEDIATION</strong>
                  <br />
                  {scan.ai_fix}
                </div>
              )}
              <div
                style={{
                  marginTop: 8, display: "flex",
                  alignItems: "center", gap: 8,
                }}
              >
                <span style={{ fontSize: 10, color: C.inkLow }}>
                  WAS THIS ANALYSIS HELPFUL?
                </span>
                {feedback[scan.id] ? (
                  <Badge
                    color={
                      feedback[scan.id] === "error"
                        ? C.red
                        : feedback[scan.id] === "accept"
                        ? C.green
                        : C.amber
                    }
                    small
                  >
                    {feedback[scan.id] === "error"
                      ? "Error saving"
                      : feedback[scan.id] === "accept"
                      ? "Marked accurate"
                      : "Marked incorrect"}
                  </Badge>
                ) : (
                  <>
                    <button
                      onClick={() => onFeedback(scan.id, "accept")}
                      style={{
                        border: `1px solid ${C.border}`, borderRadius: 7,
                        background: C.bgSurface, padding: "3px 10px",
                        cursor: "pointer", fontSize: 11, color: C.inkMid,
                      }}
                    >
                      Accurate
                    </button>
                    <button
                      onClick={() => onFeedback(scan.id, "reject")}
                      style={{
                        border: `1px solid ${C.border}`, borderRadius: 7,
                        background: C.bgSurface, padding: "3px 10px",
                        cursor: "pointer", fontSize: 11, color: C.inkMid,
                      }}
                    >
                      Incorrect
                    </button>
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

// ── Notification panel ─────────────────────────────────────────────────────────
// BUG FIX: was using `scans.filter(BLOCK).slice(0,10)` — now uses the already-
// filtered undismissedBlocked prop so "Clear all" actually clears them from the panel.
const NotificationPanel = ({ scans, onClose, onClearAll }) => (
  <div
    style={{
      position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 50,
      width: 330, background: C.bgCard, borderRadius: 14,
      border: `1px solid ${C.border}`,
      boxShadow: "0 12px 36px rgba(0,0,0,0.5)",
    }}
  >
    <div
      style={{
        padding: "12px 14px", borderBottom: `1px solid ${C.border}`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>Blocked Runs</span>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {scans.length > 0 && (
          <button
            onClick={onClearAll}
            style={{
              border: `1px solid ${C.border}`, borderRadius: 7,
              background: C.bgSurface, padding: "3px 9px",
              cursor: "pointer", fontSize: 10, color: C.inkMid, fontWeight: 600,
            }}
          >
            Dismiss all
          </button>
        )}
        <button
          onClick={onClose}
          style={{ border: "none", background: "none", cursor: "pointer", color: C.inkMid }}
        >
          <X size={15} />
        </button>
      </div>
    </div>

    {scans.length === 0 ? (
      <div
        style={{
          padding: "24px 14px", textAlign: "center",
          color: C.inkMid, fontSize: 13,
        }}
      >
        <CheckCircle size={24} color={C.green} style={{ marginBottom: 8, display: "block", margin: "0 auto 8px" }} />
        No blocked runs
      </div>
    ) : (
      // BUG FIX: show all undismissed blocked scans, not just 10
      scans.map((s) => (
        <div
          key={s.id}
          style={{
            padding: "10px 14px",
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <div
            style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "flex-start", marginBottom: 4,
            }}
          >
            <Badge color={C.red}>BLOCKED</Badge>
            <span style={{ fontSize: 10, color: C.inkLow }}>{fmt(s.created_at)}</span>
          </div>
          <div style={{ fontSize: 12, color: C.ink, fontWeight: 600, margin: "4px 0 2px" }}>
            {s.commit_message?.slice(0, 60) || s.repo_name}
          </div>
          <div style={{ fontSize: 11, color: C.inkMid, fontFamily: C.mono }}>
            {s.commit_sha?.slice(0, 10)}
          </div>
          {s.ai_explanation && (
            <div
              style={{
                fontSize: 11, color: C.inkMid, marginTop: 5,
                lineHeight: 1.5, borderLeft: `2px solid ${C.red}55`,
                paddingLeft: 8,
              }}
            >
              {s.ai_explanation.slice(0, 100)}…
            </div>
          )}
        </div>
      ))
    )}
  </div>
);

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [tab,          setTab]          = useState("overview");
  const [scans,        setScans]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [feedback,     setFeedback]     = useState({});
  const [lastUpdated,  setLastUpdated]  = useState(null);
  const [search,       setSearch]       = useState("");
  const [navOpen,      setNavOpen]      = useState(false);
  const [bellOpen,     setBellOpen]     = useState(false);
  const [dismissedIds, setDismissedIds] = useState([]);

  const bellRef    = useRef(null);
  const retryCount = useRef(0);
  const retryTimer = useRef(null);

  // BUG FIX: retryCount was never reset when fetch succeeded;
  // error banner persisted even after successful polls.
  // setError(null) now clears it on every successful fetch.
  const fetchAll = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/scan-results`, { timeout: 10000 });
      const data = Array.isArray(res.data) ? res.data : [];
      setScans(data);
      setError(null);                          // ← clears stale error banner
      setLastUpdated(fmtTime(new Date()));
      retryCount.current = 0;
      clearTimeout(retryTimer.current);
    } catch {
      retryCount.current += 1;
      if (retryCount.current <= 3) {
        const delay = retryCount.current * 3000;
        setError(
          `Backend unreachable — retrying in ${delay / 1000}s… (attempt ${retryCount.current}/3)`
        );
        clearTimeout(retryTimer.current);
        retryTimer.current = setTimeout(() => fetchAll(), delay);
      } else {
        setError("Cannot reach backend. Check your connection or try refreshing.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // BUG FIX: polling interval was 4 s, which can hammer the backend and cause
  // transient 500s under load. Raised to 8 s.
  useEffect(() => {
    fetchAll();
    const iv = setInterval(fetchAll, 8000);
    return () => {
      clearInterval(iv);
      clearTimeout(retryTimer.current);
    };
  }, [fetchAll]);

  // Close bell on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setBellOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const submitFeedback = async (scanId, type) => {
    try {
      await axios.post(`${API}/api/scan-results/${scanId}/feedback`, { feedback: type });
      setFeedback((p) => ({ ...p, [scanId]: type }));
    } catch {
      setFeedback((p) => ({ ...p, [scanId]: "error" }));
    }
  };

  // BUG FIX: handleClearAll was closing the bell panel before user could
  // visually confirm. Now it clears IDs first; panel stays open briefly.
  const handleClearAll = () => {
    const blockedIds = scans
      .filter((s) => s.action_taken === "BLOCK")
      .map((s) => s.id);
    setDismissedIds((prev) => [...new Set([...prev, ...blockedIds])]);
    // Close after a short delay so the user sees the "No blocked runs" state
    setTimeout(() => setBellOpen(false), 600);
  };

  // ── Derived stats ────────────────────────────────────────────────────────
  const running   = scans.filter((s) => s.status === "running");
  const completed = scans.filter((s) => s.status !== "running");
  const blocked   = completed.filter((s) => s.action_taken === "BLOCK");
  const allowed   = completed.filter((s) => s.action_taken === "ALLOW");
  const withAI    = completed.filter((s) => s.ai_explanation);
  const avgRisk   = completed.length
    ? +(completed.reduce((a, s) => a + (s.risk_score || 0), 0) / completed.length).toFixed(1)
    : 0;

  const undismissedBlocked = blocked.filter((s) => !dismissedIds.includes(s.id));
  const blockCount = undismissedBlocked.length;

  const filtered = scans.filter((s) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return [s.repo_name, s.branch, s.commit_sha, s.severity, s.action_taken, s.commit_message]
      .some((v) => String(v || "").toLowerCase().includes(q));
  });

  // BUG FIX: trendData was built from reversed scans; if scans are already
  // newest-first from the API this doubled-reversed incorrectly.
  // Now we sort by created_at ascending so trend always flows left→right.
  const trendData = [...scans]
    .filter((s) => s.created_at && s.risk_score != null)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .slice(-20)
    .map((s) => ({
      date: fmt(s.created_at),
      risk: s.risk_score || 0,
      sha:  s.commit_sha?.slice(0, 7),
    }));

  const sevData = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "CLEAN"]
    .map((name) => ({
      name,
      v: scans.filter((s) => (s.severity || "").toUpperCase() === name).length,
      color: severityColor(name),
    }))
    .filter((d) => d.v > 0);

  const gateData = [
    { name: "Allowed", value: allowed.length, color: C.green },
    { name: "Blocked", value: blocked.length, color: C.red   },
  ].filter((d) => d.value > 0);

  // BUG FIX: weekData used fmt() as map key; fmt() strips year, so scans from
  // the same calendar date in different years would merge. Now we key on ISO date.
  const weekData = (() => {
    const map = {};
    [...scans]
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .forEach((s) => {
        if (!s.created_at) return;
        const d = new Date(s.created_at);
        if (isNaN(d.getTime())) return;
        const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
        const label = fmt(s.created_at);
        if (!map[key]) map[key] = { date: label, allowed: 0, blocked: 0 };
        if (s.action_taken === "BLOCK") map[key].blocked++;
        else map[key].allowed++;
      });
    return Object.values(map).slice(-10);
  })();

  // ── AI tab: feedback tally & top risks ──────────────────────────────────
  const feedbackCounts = { accurate: 0, incorrect: 0, partial: 0, total: 0 };
  withAI.forEach((s) => {
    if (s.ai_feedback === "accept")  { feedbackCounts.accurate++;  feedbackCounts.total++; }
    else if (s.ai_feedback === "reject") { feedbackCounts.incorrect++; feedbackCounts.total++; }
    else if (s.ai_feedback === "edit")   { feedbackCounts.partial++;   feedbackCounts.total++; }
  });
  const accuracyPct = feedbackCounts.total
    ? Math.round((feedbackCounts.accurate / feedbackCounts.total) * 100)
    : null;

  // BUG FIX: topRisks iterated scan.blocked / scan.warned which are
  // DB-persisted fields that don't exist (this is what caused the AI tab to
  // silently show nothing). Now falls back to vuln_breakdown.fixable_details.
  const cveTally = {};
  completed.forEach((s) => {
    const details = s.vuln_breakdown?.fixable_details || [];
    details.forEach((v) => {
      const key = v.package || v.id || "unknown";
      if (!cveTally[key]) cveTally[key] = { name: key, count: 0, maxCvss: 0, severity: v.severity };
      cveTally[key].count++;
      cveTally[key].maxCvss = Math.max(cveTally[key].maxCvss, v.cvss || 0);
    });
  });
  const topRisks = Object.values(cveTally)
    .sort((a, b) => b.maxCvss - a.maxCvss)
    .slice(0, 5);
  const maxCvssOverall = Math.max(1, ...topRisks.map((r) => r.maxCvss));

  // ── Nav items ─────────────────────────────────────────────────────────────
  const NavItems = () =>
    NAV.map(({ id, label, icon: Icon }) => {
      const active = tab === id;
      return (
        <button
          key={id}
          onClick={() => { setTab(id); setNavOpen(false); }}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            width: "100%", padding: "9px 12px", borderRadius: 9,
            border: "none", cursor: "pointer", marginBottom: 2,
            textAlign: "left", fontSize: 13, fontWeight: active ? 700 : 500,
            background: active ? C.blueDim : "transparent",
            color: active ? C.blue : C.inkMid, outline: "none",
            transition: "background 0.12s, color 0.12s",
          }}
        >
          <Icon size={15} strokeWidth={active ? 2.5 : 2} />
          <span style={{ flex: 1 }}>{label}</span>
          {id === "ai" && <Badge color={C.violet} small>AI</Badge>}
        </button>
      );
    });

  return (
    <div
      style={{
        display: "flex", minHeight: "100vh",
        background: C.bg, fontFamily: C.sans, color: C.ink,
      }}
    >
      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside
        className="sidebar-desktop"
        style={{
          width: 210, flexShrink: 0, background: C.bgCard,
          borderRight: `1px solid ${C.border}`,
          display: "flex", flexDirection: "column",
          position: "sticky", top: 0, height: "100vh", overflowY: "auto",
        }}
      >
        {/* Logo / brand */}
        <div
          style={{
            padding: "22px 16px 18px",
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          {/* Hero brand mark */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div
              style={{
                background: `linear-gradient(135deg, ${C.blue}, ${C.violet})`,
                borderRadius: 10, padding: 9,
                boxShadow: `0 0 18px ${C.glow}`,
              }}
            >
              <Shield size={16} color="#fff" strokeWidth={2.5} />
            </div>
            <div>
              <div
                style={{
                  fontSize: 16, fontWeight: 900, color: C.ink,
                  letterSpacing: "-0.03em",
                  background: `linear-gradient(90deg, ${C.blue}, ${C.violet})`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                SecureFlow
              </div>
              <div
                style={{
                  fontSize: 8, color: C.inkLow, fontWeight: 700,
                  letterSpacing: "0.1em",
                }}
              >
                DEVSECOPS · AI
              </div>
            </div>
          </div>
          {/* Subtle tagline */}
          <div
            style={{
              fontSize: 10, color: C.inkMid, lineHeight: 1.5,
              padding: "6px 8px", background: C.bgSurface,
              borderRadius: 7, border: `1px solid ${C.border}`,
            }}
          >
            <span style={{ color: C.violet }}>⚡</span> AI-powered pipeline security
          </div>
        </div>

        <nav style={{ flex: 1, padding: "12px 10px" }}>
          <div
            style={{
              fontSize: 9, color: C.inkLow, fontWeight: 700,
              padding: "4px 10px 8px", letterSpacing: "0.1em",
            }}
          >
            NAVIGATION
          </div>
          <NavItems />
        </nav>

        <div
          style={{
            padding: "14px 16px",
            borderTop: `1px solid ${C.border}`,
          }}
        >
          <div
            style={{
              display: "flex", alignItems: "center",
              gap: 7, marginBottom: 4,
            }}
          >
            <div
              style={{
                width: 7, height: 7, borderRadius: "50%",
                background: error ? C.red : C.green,
                boxShadow: `0 0 6px ${error ? C.red : C.green}`,
              }}
            />
            <span
              style={{
                fontSize: 11,
                color: error ? C.red : C.green,
                fontWeight: 700,
              }}
            >
              {error ? "Connection issue" : "Pipeline Active"}
            </span>
          </div>
          {lastUpdated && (
            <div
              style={{
                fontSize: 10, color: C.inkLow,
                display: "flex", alignItems: "center", gap: 4,
              }}
            >
              <Clock size={9} /> Updated {lastUpdated}
            </div>
          )}
        </div>
      </aside>

      {/* ── Mobile overlay nav ────────────────────────────────────────────── */}
      {navOpen && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 100,
            background: "rgba(0,0,0,0.6)",
          }}
          onClick={() => setNavOpen(false)}
        >
          <div
            style={{
              width: 230, height: "100%", background: C.bgCard,
              borderRight: `1px solid ${C.border}`, padding: "20px 12px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex", justifyContent: "space-between",
                alignItems: "center", marginBottom: 20,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    background: `linear-gradient(135deg, ${C.blue}, ${C.violet})`,
                    borderRadius: 10, padding: 8,
                  }}
                >
                  <Shield size={15} color="#fff" />
                </div>
                <span style={{ fontWeight: 900, fontSize: 15, color: C.ink }}>
                  SecureFlow
                </span>
              </div>
              <button
                onClick={() => setNavOpen(false)}
                style={{
                  border: "none", background: "none",
                  cursor: "pointer", color: C.inkMid,
                }}
              >
                <X size={18} />
              </button>
            </div>
            <NavItems />
          </div>
        </div>
      )}

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>

        {/* Top bar */}
        <header
          style={{
            position: "sticky", top: 0, zIndex: 20,
            background: "rgba(22,27,34,0.95)",
            backdropFilter: "blur(14px)",
            borderBottom: `1px solid ${C.border}`,
            padding: "12px 20px",
            display: "flex", justifyContent: "space-between",
            alignItems: "center", gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={() => setNavOpen(true)}
              className="hamburger"
              style={{
                border: "none", background: "none",
                cursor: "pointer", padding: 4,
                color: C.inkMid, display: "none",
              }}
            >
              <Menu size={20} />
            </button>
            <div>
              <div
                style={{
                  fontSize: 15, fontWeight: 800, color: C.ink,
                  letterSpacing: "-0.02em",
                }}
              >
                {NAV.find((n) => n.id === tab)?.label}
              </div>
              <div style={{ fontSize: 10, color: C.inkLow, marginTop: 1 }}>
                abhienix / SecureFlow · main
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {running.length > 0 && (
              <Badge color={C.blue}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <span
                    style={{
                      width: 6, height: 6, borderRadius: "50%",
                      background: C.blue, animation: "blink 1s infinite",
                    }}
                  />
                  {running.length} running
                </span>
              </Badge>
            )}
            <Badge color={C.blue}>{completed.length} scans</Badge>
            <Badge color={blocked.length > 0 ? C.red : C.green}>
              {blocked.length} blocked
            </Badge>
            <button
              onClick={fetchAll}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "6px 12px", borderRadius: 9,
                border: `1px solid ${C.border}`,
                background: C.bgCard, color: C.inkMid,
                cursor: "pointer", fontSize: 12, fontWeight: 600,
              }}
            >
              <RefreshCw size={12} /> Refresh
            </button>

            {/* Bell */}
            <div ref={bellRef} style={{ position: "relative" }}>
              <button
                onClick={() => setBellOpen((o) => !o)}
                style={{
                  position: "relative", padding: "7px 9px",
                  borderRadius: 9,
                  border: `1px solid ${blockCount > 0 ? C.redBord : C.border}`,
                  background: blockCount > 0 ? C.redSoft : C.bgCard,
                  cursor: "pointer", display: "flex", alignItems: "center",
                }}
              >
                <Bell size={16} color={blockCount > 0 ? C.red : C.inkMid} />
                {blockCount > 0 && (
                  <span
                    style={{
                      position: "absolute", top: -4, right: -4,
                      width: 16, height: 16, borderRadius: "50%",
                      background: C.red, color: "#fff",
                      fontSize: 9, fontWeight: 800,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      border: `2px solid ${C.bg}`,
                    }}
                  >
                    {blockCount > 99 ? "99+" : blockCount}
                  </span>
                )}
              </button>
              {bellOpen && (
                <NotificationPanel
                  scans={undismissedBlocked}
                  onClose={() => setBellOpen(false)}
                  onClearAll={handleClearAll}
                />
              )}
            </div>
          </div>
        </header>

        {/* Error banner — only shown when error exists (cleared on next success) */}
        {error && (
          <div
            style={{
              margin: "14px 20px 0",
              padding: "11px 16px",
              borderRadius: 10,
              background: C.redSoft,
              border: `1px solid ${C.redBord}`,
              color: C.red,
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <AlertTriangle size={14} />
            {error}
          </div>
        )}

        <div style={{ padding: "20px", flex: 1 }}>

          {/* ══ OVERVIEW ════════════════════════════════════════════════════ */}
          {tab === "overview" && (
            <>
              {/* Hero strip */}
              <div
                style={{
                  background: `linear-gradient(135deg, ${C.blueDim}, ${C.violetSoft})`,
                  border: `1px solid ${C.violetBord}44`,
                  borderRadius: 14, padding: "20px 24px",
                  marginBottom: 18,
                  display: "flex", alignItems: "center",
                  justifyContent: "space-between", flexWrap: "wrap", gap: 14,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 11, fontWeight: 700, color: C.violet,
                      letterSpacing: "0.12em", textTransform: "uppercase",
                      marginBottom: 6,
                    }}
                  >
                    ⚡ SecureFlow · AI Security Dashboard
                  </div>
                  <div
                    style={{
                      fontSize: 22, fontWeight: 900, color: C.ink,
                      letterSpacing: "-0.03em", lineHeight: 1.2, marginBottom: 4,
                    }}
                  >
                    {scans.length} pipelines scanned
                  </div>
                  <div style={{ fontSize: 12, color: C.inkMid }}>
                    {blocked.length} blocked · {allowed.length} deployed · {withAI.length} AI-analyzed
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <div
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: `1px solid ${C.violetBord}55`,
                      borderRadius: 10, padding: "10px 18px", textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: 9, color: C.inkLow, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 4 }}>AVG RISK</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: riskColor(avgRisk), fontFamily: C.mono }}>{avgRisk}</div>
                    <div style={{ fontSize: 9, color: C.inkLow }}>out of 10</div>
                  </div>
                  <div
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: `1px solid ${C.violetBord}55`,
                      borderRadius: 10, padding: "10px 18px", textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: 9, color: C.inkLow, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 4 }}>BLOCK RATE</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: blocked.length > 0 ? C.red : C.green, fontFamily: C.mono }}>
                      {completed.length ? Math.round((blocked.length / completed.length) * 100) : 0}%
                    </div>
                    <div style={{ fontSize: 9, color: C.inkLow }}>of completed</div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
                  gap: 10, marginBottom: 18,
                }}
              >
                <StatCard icon={Activity}      label="Total Scans"    value={scans.length}   color={C.blue}   />
                <StatCard icon={CheckCircle}   label="Allowed"        value={allowed.length} color={C.green}  />
                <StatCard icon={XCircle}       label="Blocked"        value={blocked.length} color={C.red}    sub={blocked.length > 0 ? "review required" : "all clear"} />
                <StatCard icon={AlertTriangle} label="Critical CVEs"  value={scans.filter((s) => (s.severity || "").toUpperCase() === "CRITICAL").length} color={C.amber} />
                <StatCard icon={Cpu}           label="Avg Risk Score" value={`${avgRisk}/10`} color={C.violet} />
                <StatCard icon={Zap}           label="AI Analyzed"    value={withAI.length}  color={C.violet} />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
                  gap: 12, marginBottom: 18,
                }}
              >
                <Card>
                  <SectionTitle>Risk Score Trend</SectionTitle>
                  {trendData.length === 0 ? (
                    <EmptyChart />
                  ) : (
                    <ResponsiveContainer width="100%" height={150}>
                      <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                        <defs>
                          <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={C.blue} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={C.blue} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" stroke={C.inkLow} tick={{ fontSize: 9, fill: C.inkMid }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                        <YAxis stroke={C.inkLow} tick={{ fontSize: 9, fill: C.inkMid }} tickLine={false} axisLine={false} domain={[0, 10]} />
                        <Tooltip contentStyle={TT} formatter={(v) => [`${v}/10`, "Risk"]} labelFormatter={(l, items) => items[0]?.payload?.sha || l} />
                        <Area type="monotone" dataKey="risk" stroke={C.blue} strokeWidth={2.5} fill="url(#rg)" dot={{ r: 2.5, fill: C.blue, stroke: C.bgCard, strokeWidth: 1.5 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </Card>

                <Card>
                  <SectionTitle>Deployments Over Time</SectionTitle>
                  {weekData.length === 0 ? (
                    <EmptyChart />
                  ) : (
                    <ResponsiveContainer width="100%" height={150}>
                      <BarChart data={weekData} barSize={14} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                        <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" stroke={C.inkLow} tick={{ fontSize: 9, fill: C.inkMid }} tickLine={false} axisLine={false} />
                        <YAxis stroke={C.inkLow} tick={{ fontSize: 9, fill: C.inkMid }} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={TT} />
                        <Bar dataKey="allowed" fill={C.green} radius={[4, 4, 0, 0]} name="Allowed" stackId="a" />
                        <Bar dataKey="blocked" fill={C.red}   radius={[4, 4, 0, 0]} name="Blocked" stackId="a" />
                        <Legend iconSize={8} wrapperStyle={{ fontSize: 10, color: C.inkMid }} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </Card>

                <Card>
                  <SectionTitle>Severity Breakdown</SectionTitle>
                  {sevData.length === 0 ? (
                    <EmptyChart />
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={110}>
                        <PieChart>
                          <Pie
                            data={sevData} cx="50%" cy="50%"
                            innerRadius={30} outerRadius={48}
                            dataKey="v" strokeWidth={2} stroke={C.bgCard}
                          >
                            {sevData.map((d, i) => <Cell key={i} fill={d.color} />)}
                          </Pie>
                          <Tooltip contentStyle={TT} formatter={(v, n) => [v, n]} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div
                        style={{
                          display: "flex", justifyContent: "center",
                          flexWrap: "wrap", gap: 10,
                          fontSize: 11, color: C.inkMid, marginTop: 4,
                        }}
                      >
                        {sevData.map((d) => (
                          <span key={d.name} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <span
                              style={{
                                width: 8, height: 8, borderRadius: "50%",
                                background: d.color, display: "inline-block",
                              }}
                            />
                            {d.name} <strong style={{ color: C.ink }}>{d.v}</strong>
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </Card>
              </div>

              <Card>
                <SectionTitle>Recent Scans</SectionTitle>
                {loading && <LoadingState />}
                {!loading && scans.length === 0 && <EmptyState text="No scans yet — push a commit to get started." />}
                {scans.slice(0, 5).map((scan) => {
                  const bl = scan.action_taken === "BLOCK";
                  return (
                    <div
                      key={scan.id}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "10px 0", borderBottom: `1px solid ${C.border}`,
                      }}
                    >
                      <div
                        style={{
                          width: 6, height: 6, borderRadius: "50%",
                          background: bl ? C.red : C.green, flexShrink: 0,
                        }}
                      />
                      <span style={{ fontFamily: C.mono, fontSize: 11, color: C.blue, flexShrink: 0 }}>
                        {scan.commit_sha?.slice(0, 8) || "—"}
                      </span>
                      <span
                        style={{
                          fontSize: 12, color: C.inkMid, flex: 1,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}
                      >
                        {scan.commit_message || scan.repo_name}
                      </span>
                      <Badge color={bl ? C.red : C.green}>{scan.action_taken}</Badge>
                      {scan.severity && <Badge color={severityColor(scan.severity)}>{scan.severity}</Badge>}
                      <span style={{ fontSize: 11, color: C.inkLow, flexShrink: 0 }}>
                        {fmt(scan.created_at)}
                      </span>
                    </div>
                  );
                })}
              </Card>
            </>
          )}

          {/* ══ PIPELINE ════════════════════════════════════════════════════ */}
          {tab === "pipeline" && (
            <>
              <div
                style={{
                  marginBottom: 16, display: "flex",
                  gap: 10, alignItems: "center", flexWrap: "wrap",
                }}
              >
                <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
                  <Search
                    size={13} color={C.inkLow}
                    style={{ position: "absolute", left: 10, top: 9, pointerEvents: "none" }}
                  />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search commits, repos, severity…"
                    style={{
                      width: "100%", padding: "8px 10px 8px 30px",
                      borderRadius: 9, border: `1px solid ${C.border}`,
                      fontSize: 12, outline: "none",
                      background: C.bgCard, color: C.ink,
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                {running.length > 0 && (
                  <Badge color={C.blue}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <span
                        style={{
                          width: 6, height: 6, borderRadius: "50%",
                          background: C.blue, animation: "blink 1s infinite",
                        }}
                      />
                      {running.length} running
                    </span>
                  </Badge>
                )}
                <Badge color={C.green}>{allowed.length} allowed</Badge>
                <Badge color={C.red}>{blocked.length} blocked</Badge>
              </div>

              {loading && <LoadingState />}
              {!loading && filtered.length === 0 && (
                <Card style={{ textAlign: "center", padding: 40, color: C.inkLow }}>
                  {search ? `No scans match "${search}"` : "No scans found."}
                </Card>
              )}
              {filtered.map((scan) => (
                <CommitCard
                  key={scan.id}
                  scan={scan}
                  feedback={feedback}
                  onFeedback={submitFeedback}
                />
              ))}
            </>
          )}

          {/* ══ AI INSIGHTS ════════════════════════════════════════════════ */}
          {tab === "ai" && (
            <>
              {/* AI hero card */}
              <div
                style={{
                  background: `linear-gradient(135deg, ${C.violetSoft}, ${C.blueDim})`,
                  border: `1px solid ${C.violetBord}66`,
                  borderRadius: 14, padding: "22px 24px",
                  marginBottom: 16,
                  display: "flex", justifyContent: "space-between",
                  alignItems: "center", flexWrap: "wrap", gap: 14,
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex", alignItems: "center",
                      gap: 10, marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        background: `linear-gradient(135deg, ${C.violet}, ${C.blue})`,
                        borderRadius: 10, padding: 9,
                        boxShadow: `0 0 18px ${C.violet}44`,
                      }}
                    >
                      <Zap size={18} color="#fff" strokeWidth={2.5} />
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 18, fontWeight: 900, color: C.ink,
                          letterSpacing: "-0.03em",
                        }}
                      >
                        AI Security Intelligence
                      </div>
                      <div style={{ fontSize: 11, color: C.inkMid }}>
                        Powered by Groq · every scan explained in plain language
                      </div>
                    </div>
                    <Badge color={C.violet}>GROQ</Badge>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  {[
                    { label: "AI Analyzed",  value: withAI.length },
                    { label: "Avg Risk",     value: `${avgRisk}/10` },
                    { label: "Accuracy",     value: accuracyPct !== null ? `${accuracyPct}%` : "—" },
                  ].map((m) => (
                    <div
                      key={m.label}
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        borderRadius: 10, padding: "10px 16px",
                        border: `1px solid ${C.violetBord}55`,
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 9, color: C.inkLow, marginBottom: 4,
                          fontWeight: 700, letterSpacing: "0.06em",
                          textTransform: "uppercase",
                        }}
                      >
                        {m.label}
                      </div>
                      <div
                        style={{
                          fontSize: 20, fontWeight: 800,
                          color: C.violet, fontFamily: C.mono,
                        }}
                      >
                        {m.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
                  gap: 12, marginBottom: 20,
                }}
              >
                {/* AI feedback breakdown */}
                <Card>
                  <SectionTitle>AI Feedback Breakdown</SectionTitle>
                  {feedbackCounts.total === 0 ? (
                    <div
                      style={{
                        height: 100, display: "flex", alignItems: "center",
                        justifyContent: "center", color: C.inkLow, fontSize: 13,
                      }}
                    >
                      No feedback submitted yet
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {[
                        { label: "Accurate",  value: feedbackCounts.accurate,  color: C.green, icon: ThumbsUp   },
                        { label: "Incorrect", value: feedbackCounts.incorrect, color: C.red,   icon: ThumbsDown },
                        { label: "Partial",   value: feedbackCounts.partial,   color: C.amber, icon: Minus      },
                      ].map((row) => {
                        const Icon = row.icon;
                        const pct = feedbackCounts.total
                          ? Math.round((row.value / feedbackCounts.total) * 100)
                          : 0;
                        return (
                          <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <Icon size={13} color={row.color} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                            <span style={{ fontSize: 12, color: C.inkMid, width: 64, flexShrink: 0 }}>
                              {row.label}
                            </span>
                            <div
                              style={{
                                flex: 1, height: 8, background: C.bgSurface,
                                borderRadius: 4, overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  width: `${pct}%`, height: "100%",
                                  background: row.color, borderRadius: 4,
                                  transition: "width 0.4s ease",
                                }}
                              />
                            </div>
                            <span
                              style={{
                                fontSize: 12, fontWeight: 700, color: C.ink,
                                width: 28, textAlign: "right", flexShrink: 0,
                              }}
                            >
                              {row.value}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>

                {/* Riskiest packages */}
                <Card>
                  <SectionTitle>Riskiest Packages</SectionTitle>
                  {topRisks.length === 0 ? (
                    <div
                      style={{
                        height: 100, display: "flex", alignItems: "center",
                        justifyContent: "center", color: C.inkLow, fontSize: 13,
                      }}
                    >
                      No fixable vulnerabilities flagged yet
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {topRisks.map((r) => (
                        <div key={r.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span
                            style={{
                              fontSize: 11, fontFamily: C.mono, color: C.inkMid,
                              width: 110, flexShrink: 0,
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }}
                          >
                            {r.name}
                          </span>
                          <div
                            style={{
                              flex: 1, height: 8, background: C.bgSurface,
                              borderRadius: 4, overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${(r.maxCvss / maxCvssOverall) * 100}%`,
                                height: "100%", background: riskColor(r.maxCvss),
                                borderRadius: 4, transition: "width 0.4s ease",
                              }}
                            />
                          </div>
                          <span
                            style={{
                              fontSize: 12, fontWeight: 700, color: C.ink,
                              width: 32, textAlign: "right", flexShrink: 0,
                            }}
                          >
                            {r.maxCvss.toFixed(1)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>

              {loading && <LoadingState />}
              {!loading && withAI.length === 0 && (
                <Card style={{ textAlign: "center", padding: 40, color: C.inkLow }}>
                  <Zap
                    size={32}
                    color={C.violet}
                    style={{ opacity: 0.3, marginBottom: 10, display: "block", margin: "0 auto 10px" }}
                  />
                  No AI-analyzed scans yet. Push a commit to trigger the pipeline.
                </Card>
              )}

              {!loading && withAI.length > 0 && (
                <Card>
                  <SectionTitle>Recent AI Analyses</SectionTitle>
                  {withAI.slice(0, 8).map((scan) => (
                    <div
                      key={scan.id}
                      style={{
                        padding: "12px 0",
                        borderBottom: `1px solid ${C.border}`,
                      }}
                    >
                      <div
                        style={{
                          display: "flex", alignItems: "center",
                          gap: 8, marginBottom: 6, flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: C.mono, fontSize: 11,
                            color: C.blue, fontWeight: 700,
                          }}
                        >
                          {scan.commit_sha?.slice(0, 8)}
                        </span>
                        <Badge color={riskColor(scan.risk_score || 0)} small>
                          Risk {scan.risk_score || 0}/10
                        </Badge>
                        <Badge color={scan.action_taken === "BLOCK" ? C.red : C.green} small>
                          {scan.action_taken}
                        </Badge>
                        {scan.ai_feedback === "accept" && <Badge color={C.green} small>marked accurate</Badge>}
                        {scan.ai_feedback === "reject" && <Badge color={C.red}   small>marked incorrect</Badge>}
                        <span style={{ fontSize: 10, color: C.inkLow, marginLeft: "auto" }}>
                          {fmt(scan.created_at)}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 12, color: C.inkMid, lineHeight: 1.65,
                          background: C.violetSoft, borderRadius: 8,
                          padding: "8px 12px", border: `1px solid ${C.violetBord}44`,
                        }}
                      >
                        {scan.ai_explanation}
                      </div>
                      {scan.ai_fix && (
                        <div
                          style={{
                            marginTop: 6, fontSize: 12, color: C.inkMid,
                            background: C.greenSoft, borderRadius: 8,
                            padding: "7px 12px", border: `1px solid ${C.greenBord}44`,
                          }}
                        >
                          <strong style={{ color: C.green }}>Fix: </strong>{scan.ai_fix}
                        </div>
                      )}
                    </div>
                  ))}
                </Card>
              )}
            </>
          )}

          {/* ══ METRICS ════════════════════════════════════════════════════ */}
          {tab === "metrics" && (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
                  gap: 10, marginBottom: 18,
                }}
              >
                <StatCard icon={Activity}      label="Total Scans" value={scans.length}        color={C.blue}   sub="all time" />
                <StatCard icon={CheckCircle}   label="Allowed"     value={allowed.length}      color={C.green}  sub="clean deployments" />
                <StatCard icon={XCircle}       label="Blocked"     value={blocked.length}      color={C.red}    sub="policy violations" />
                <StatCard icon={Zap}           label="AI Analyzed" value={withAI.length}       color={C.violet} sub="with Groq" />
                <StatCard icon={AlertTriangle} label="High Risk"   value={scans.filter((s) => (s.risk_score || 0) >= 7).length} color={C.amber} sub="risk ≥ 7/10" />
                <StatCard icon={Cpu}           label="Avg Risk"    value={`${avgRisk}/10`}     color={C.violet} sub="mean score" />
              </div>

              <div
                style={{
                  display: "grid", gridTemplateColumns: "1fr 1fr",
                  gap: 12, marginBottom: 12,
                }}
              >
                <Card>
                  <SectionTitle>Risk Score Over Time</SectionTitle>
                  {trendData.length === 0 ? (
                    <EmptyChart />
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                        <defs>
                          <linearGradient id="rg2" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={C.blue} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={C.blue} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" stroke={C.inkLow} tick={{ fontSize: 9, fill: C.inkMid }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                        <YAxis stroke={C.inkLow} tick={{ fontSize: 9, fill: C.inkMid }} tickLine={false} axisLine={false} domain={[0, 10]} />
                        <Tooltip contentStyle={TT} formatter={(v) => [`${v}/10`, "Risk Score"]} labelFormatter={(l, items) => items[0]?.payload?.sha || l} />
                        <Area type="monotone" dataKey="risk" stroke={C.blue} strokeWidth={2.5} fill="url(#rg2)" dot={{ r: 3, fill: C.blue, stroke: C.bgCard, strokeWidth: 2 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </Card>

                <Card>
                  <SectionTitle>Policy Gate — Allow vs Block</SectionTitle>
                  {gateData.length === 0 ? (
                    <EmptyChart />
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                          <Pie
                            data={gateData} cx="50%" cy="50%"
                            innerRadius={45} outerRadius={65}
                            dataKey="value" strokeWidth={3}
                            stroke={C.bgCard} paddingAngle={3}
                          >
                            {gateData.map((d, i) => <Cell key={i} fill={d.color} />)}
                          </Pie>
                          <Tooltip contentStyle={TT} formatter={(v, n) => [v, n]} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div
                        style={{
                          display: "flex", justifyContent: "center",
                          gap: 20, fontSize: 12, color: C.inkMid,
                        }}
                      >
                        {gateData.map((d) => (
                          <span key={d.name} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <span
                              style={{
                                width: 10, height: 10, borderRadius: "50%",
                                background: d.color, display: "inline-block",
                              }}
                            />
                            {d.name} <strong style={{ color: C.ink }}>{d.value}</strong>
                            <span style={{ color: C.inkLow }}>
                              ({scans.length ? Math.round((d.value / scans.length) * 100) : 0}%)
                            </span>
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </Card>
              </div>

              <Card>
                <SectionTitle>Severity Distribution</SectionTitle>
                {sevData.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={sevData} barSize={32} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" stroke={C.inkLow} tick={{ fontSize: 11, fill: C.inkMid }} tickLine={false} axisLine={false} />
                      <YAxis stroke={C.inkLow} tick={{ fontSize: 10, fill: C.inkMid }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={TT} formatter={(v) => [v, "scans"]} />
                      <Bar dataKey="v" radius={[6, 6, 0, 0]} name="Count">
                        {sevData.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>

              <Card>
                <SectionTitle>Daily Volume</SectionTitle>
                {weekData.length === 0 ? (
                  <EmptyChart />
                ) : (
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={weekData} barSize={14} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                      <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" stroke={C.inkLow} tick={{ fontSize: 9, fill: C.inkMid }} tickLine={false} axisLine={false} />
                      <YAxis stroke={C.inkLow} tick={{ fontSize: 9, fill: C.inkMid }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={TT} />
                      <Bar dataKey="allowed" fill={C.green} radius={[4, 4, 0, 0]} name="Allowed" stackId="a" />
                      <Bar dataKey="blocked" fill={C.red}   radius={[4, 4, 0, 0]} name="Blocked" stackId="a" />
                      <Legend iconSize={8} wrapperStyle={{ fontSize: 10, color: C.inkMid }} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </>
          )}

        </div>
      </main>

      {/* ── Global styles ─────────────────────────────────────────────────── */}
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: ${C.bg}; color: ${C.ink}; }
        button { font-family: inherit; }
        input  { font-family: inherit; }
        button:active { opacity: 0.8; }
        input:focus {
          border-color: ${C.blue} !important;
          outline: none;
          box-shadow: 0 0 0 3px ${C.blue}22;
        }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 999px; }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.2; }
        }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 1.5px ${C.blue}, 0 0 0 3px ${C.blue}44; }
          50%       { box-shadow: 0 0 0 1.5px ${C.blue}, 0 0 0 6px ${C.blue}22; }
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

// ── Micro helpers ─────────────────────────────────────────────────────────────
const EmptyChart = () => (
  <div
    style={{
      height: 150, display: "flex", alignItems: "center",
      justifyContent: "center", color: C.inkLow, fontSize: 13,
    }}
  >
    No data yet
  </div>
);

const LoadingState = () => (
  <div style={{ color: C.inkLow, fontSize: 13, padding: "12px 0" }}>
    Loading…
  </div>
);

const EmptyState = ({ text }) => (
  <div style={{ color: C.inkLow, fontSize: 13, padding: "24px 0", textAlign: "center" }}>
    {text}
  </div>
);
