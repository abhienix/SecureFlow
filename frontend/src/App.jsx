/**
 * SecureFlow — Final App.jsx (Fixed Version - Part 1)
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

// --- Design tokens ----------------------------------------------------------
const C = {
  bg: "#080c10", bgCard: "#0d1117", bgHover: "#131a22", bgSurface: "#161b22",
  bgElevated: "#1c2330", border: "#1e2d3d", borderBright: "#2a3f55",
  ink: "#e6edf3", inkMid: "#8b949e", inkLow: "#3d4f61",
  teal: "#00d9a6", tealSoft: "#00d9a615", tealBord: "#00d9a635", tealDim: "#003d2e",
  blue: "#58a6ff", blueSoft: "#58a6ff12", blueDim: "#0a2040",
  green: "#3fb950", greenSoft: "#3fb95015",
  red: "#f85149", redSoft: "#f8514912", redBord: "#5c1a1a",
  amber: "#f0883e", amberSoft: "#f0883e12", amberBord: "#7a3800",
  violet: "#bc8cff", violetSoft: "#bc8cff12", violetBord: "#4a1a8a",
  mono: "'JetBrains Mono','Fira Mono','Consolas',monospace",
  sans: "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
};

const BACKEND = "https://secureflow-backend-1083585992526.us-central1.run.app";

const TABS = [
  { id: "overview", label: "Overview", icon: Activity },
  { id: "pipeline", label: "Pipeline", icon: GitPullRequest },
  { id: "feed", label: "Scan Feed", icon: ListChecks },
  { id: "metrics", label: "Metrics", icon: TrendingUp },
];

const PIPELINE_STAGES = [
  { key: "checkout", label: "Checkout", icon: "?" },
  { key: "code_scan", label: "Code Scan", icon: "??" },
  { key: "docker", label: "Docker Build", icon: "??" },
  { key: "trivy", label: "Trivy Scan", icon: "??" },
  { key: "policy", label: "Policy Gate", icon: "?" },
  { key: "deploy", label: "Deploy", icon: "??" },
];

function resultToStatus(result) {
  if (!result) return "pending";
  const r = String(result).toUpperCase();
  if (["PASS", "SCANNED", "ALLOW"].includes(r)) return "passed";
  if (["FAIL", "FAILED", "BLOCK"].includes(r)) return "failed";
  if (r === "RUNNING") return "running";
  if (r === "SKIPPED") return "skipped";
  return "passed";
}

function normaliseScan(raw) {
  const steps = raw.pipeline_steps || {};
  const pipeline = PIPELINE_STAGES.map(({ key, label, icon }) => {
    const info = steps[key] || {};
    return {
      id: key,
      name: label,
      icon,
      status: resultToStatus(info.result || info.status),
      result: info.result || info.status || "",
      detail: info.detail || "",
      logs: info.detail ? [info.detail] : [],
    };
  });

  let vuln_breakdown = raw.vuln_breakdown || null;
  if (!vuln_breakdown && raw.findings?.Results) {
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
        id: v.VulnerabilityID,
        package: v.PkgName,
        severity: v.Severity,
        fix: v.FixedVersion || "—",
        cvss: v.CVSS ? Math.max(...Object.values(v.CVSS).map(c => c.V3Score || c.V2Score || 0)) : 0,
      })),
      base_image_note: allVulns.filter(v => !v.FixedVersion).length > 8 ? "Most CVEs originate from the base image." : undefined,
    };
  }

  return {
    ...raw,
    pipeline,
    vuln_breakdown,
    ai_confidence: raw.ai_confidence || (raw.risk_score != null ? Math.min(99, Math.max(60, Math.floor(raw.risk_score * 10))) : null),
    status: raw.status || "complete",
  };
}
// --- Formatters -------------------------------------------------------------
const fmt = (iso) => iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—";
const fmtFull = (iso) => iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
const relTime = (iso) => {
  if (!iso) return "—";
  const m = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.floor(h/24)}d ago`;
};

const severityColor = (s) => ({
  CRITICAL: C.red, HIGH: C.amber, MEDIUM: C.blue, LOW: C.inkMid, CLEAN: C.teal
}[String(s || "").toUpperCase()] || C.inkMid);

const riskColor = (n) => n >= 7 ? C.red : n >= 4 ? C.amber : C.teal;

const TT = { background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 12, color: C.ink };

// --- Primitive Components ---------------------------------------------------
const EmptyState = ({ text }) => (
  <div style={{ color: C.inkLow, padding: "40px 0", textAlign: "center", fontSize: 14 }}>{text}</div>
);

const Badge = ({ color, children, small }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 4,
    padding: small ? "2px 8px" : "4px 10px",
    borderRadius: 999, fontSize: small ? 10 : 11, fontWeight: 700,
    background: color + "15", color, border: `1px solid ${color}30`,
    fontFamily: C.mono, whiteSpace: "nowrap"
  }}>{children}</span>
);

const Card = ({ children, glow }) => (
  <div style={{
    background: C.bgCard, borderRadius: 14, border: `1px solid ${glow ? C.tealBord : C.border}`,
    padding: "20px", marginBottom: 16, boxShadow: glow ? `0 0 20px ${C.teal}15` : "none"
  }}>{children}</div>
);

const SectionTitle = ({ children, accent }) => (
  <div style={{
    fontSize: 10, fontWeight: 800, color: accent || C.inkLow,
    letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12,
    display: "flex", alignItems: "center", gap: 6
  }}>
    {accent && <div style={{ width: 4, height: 12, background: accent, borderRadius: 2 }} />}
    {children}
  </div>
);

const StatusDot = ({ status }) => {
  const color = status === "running" ? C.blue : status === "failed" ? C.red : C.teal;
  return <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: color, animation: status === "running" ? "pulseBlue 1.5s infinite" : "none" }} />;
};

// Threat Feed Data
const THREAT_FEED_DATA = [
  { id: "tf1", level: "CRITICAL", title: "urllib3 CVE-2024-37891 actively exploited", source: "NVD", time: "12m ago" },
  { id: "tf2", level: "HIGH", title: "GitHub token leak pattern detected", source: "GitHub", time: "48m ago" },
  { id: "tf3", level: "HIGH", title: "Docker privilege escalation", source: "CISA", time: "2h ago" },
];

// Global CSS (Minimal version)
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap');
  body { background: ${C.bg}; color: ${C.ink}; font-family: ${C.sans}; }
  .spin { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulseBlue { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
`;

if (typeof document !== "undefined" && !document.getElementById("sf-global-css")) {
  const style = document.createElement("style");
  style.id = "sf-global-css";
  style.textContent = GLOBAL_CSS;
  document.head.appendChild(style);
}
// --- Major Components -------------------------------------------------------

const HealthRing = ({ score, size = 120 }) => {
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 75 ? C.teal : score >= 50 ? C.amber : C.red;

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.bgSurface} strokeWidth={10} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <div style={{ fontSize: 28, fontWeight: 900, fontFamily: C.mono }}>{score}</div>
        <div style={{ fontSize: 9, color, fontWeight: 700 }}>HEALTH</div>
      </div>
    </div>
  );
};

const RiskBar = ({ score }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <div style={{ flex: 1, height: 6, background: C.bgSurface, borderRadius: 4, overflow: "hidden" }}>
      <div style={{ width: `${Math.min(100, score * 10)}%`, height: "100%", background: riskColor(score), transition: "width 0.6s" }} />
    </div>
    <span style={{ fontFamily: C.mono, fontSize: 13, color: riskColor(score) }}>{score}</span>
  </div>
);

const VulnBreakdown = ({ breakdown }) => {
  const [open, setOpen] = useState(false);
  if (!breakdown) return null;

  const { total = 0, fixable_count = 0, base_image_count = 0, fixable_details = [] } = breakdown;

  return (
    <div style={{ marginTop: 12, border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
      <button onClick={() => setOpen(!open)} style={{
        width: "100%", padding: "10px 14px", background: C.bgSurface, border: "none",
        cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12
      }}>
        <span>?? {total} Vulnerabilities • {fixable_count} Fixable</span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && (
        <div style={{ padding: "12px 14px", background: C.bgCard, fontSize: 13 }}>
          {fixable_details.map((v, i) => (
            <div key={i} style={{ padding: "8px 0", borderBottom: i < fixable_details.length-1 ? `1px solid ${C.border}` : "none" }}>
              <Badge color={severityColor(v.severity)} small>{v.severity}</Badge>
              <span style={{ marginLeft: 8, fontFamily: C.mono }}>{v.id}</span>
              <div style={{ color: C.inkMid, marginTop: 4 }}>{v.package} ? Fix: {v.fix}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Pipeline Stage Nodes
function PipelineMiniNodes({ pipeline }) {
  if (!pipeline?.length) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, margin: "12px 0", overflowX: "auto" }}>
      {pipeline.map((stage, i) => {
        const color = stage.status === "passed" ? C.teal : stage.status === "failed" ? C.red : stage.status === "running" ? C.blue : C.inkMid;
        return (
          <React.Fragment key={stage.id}>
            <div style={{ textAlign: "center", minWidth: 48 }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", border: `2px solid ${color}`, background: color + "10", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", color, fontSize: 11 }}>
                {stage.status === "passed" ? "?" : stage.status === "failed" ? "?" : stage.status === "running" ? "?" : "•"}
              </div>
              <div style={{ fontSize: 9, color: C.inkMid, marginTop: 4 }}>{stage.name}</div>
            </div>
            {i < pipeline.length - 1 && <div style={{ height: 2, flex: 1, background: C.border, marginTop: 12 }} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// Continue with more components in next part
console.log("? PART 3 Applied");
// --- Commit Card & Detail Components ---------------------------------------

const CommitCard = ({ scan, feedback, onFeedback, onOpenWhyBlocked, delay = 0 }) => {
  const [expanded, setExpanded] = useState(false);
  const bl = scan.action_taken === "BLOCK";
  const isRunning = scan.status === "running";
  const accentColor = isRunning ? C.blue : bl ? C.red : C.teal;

  return (
    <div style={{
      background: C.bgCard, borderRadius: 14, border: `1px solid ${C.border}`, borderLeft: `4px solid ${accentColor}`,
      padding: "16px", marginBottom: 12, animationDelay: `${delay}s`
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontFamily: C.mono, color: C.blue }}>{scan.commit_sha?.slice(0,8)}</span>
            <Badge color={bl ? C.red : C.teal}>{scan.action_taken || "ALLOW"}</Badge>
            {scan.severity && <Badge color={severityColor(scan.severity)}>{scan.severity}</Badge>}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{scan.commit_message || scan.repo_name}</div>
          <div style={{ fontSize: 11, color: C.inkMid }}>{scan.repo_name} • {relTime(scan.created_at)}</div>
        </div>
        <button onClick={() => setExpanded(!expanded)} style={{ padding: "6px 12px", borderRadius: 8, background: C.bgSurface, border: `1px solid ${C.border}` }}>
          {expanded ? "Hide" : "Details"}
        </button>
      </div>

      <PipelineMiniNodes pipeline={scan.pipeline} />

      {expanded && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
          {scan.vuln_breakdown && <VulnBreakdown breakdown={scan.vuln_breakdown} />}
          {scan.ai_explanation && (
            <div style={{ marginTop: 12, padding: 14, background: C.violetSoft, borderRadius: 10, border: `1px solid ${C.violetBord}` }}>
              <strong>AI Analysis:</strong> {scan.ai_explanation}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Why Blocked Modal
const WhyBlockedModal = ({ scan, onClose }) => {
  if (!scan) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: C.bgCard, padding: 24, borderRadius: 16, maxWidth: 500, border: `1px solid ${C.redBord}` }} onClick={e => e.stopPropagation()}>
        <h2 style={{ color: C.red }}>Why was this blocked?</h2>
        <p>{scan.ai_explanation || "Policy violation detected."}</p>
        <button onClick={onClose} style={{ marginTop: 20, padding: "10px 20px", background: C.red, color: "white", border: "none", borderRadius: 8 }}>Close</button>
      </div>
    </div>
  );
};

// Scan Detail Slide-in
function ScanDetail({ scan, onClose, feedback, onFeedback, onWhyBlocked }) {
  if (!scan) return null;
  return (
    <div style={{ position: "fixed", top: 0, right: 0, width: 460, height: "100vh", background: C.bgCard, borderLeft: `1px solid ${C.border}`, zIndex: 100, overflowY: "auto", padding: 24 }}>
      <button onClick={onClose} style={{ float: "right" }}>?</button>
      <h2>{scan.repo_name}</h2>
      <p>{scan.commit_sha}</p>
      <PipelineMiniNodes pipeline={scan.pipeline} />
      {scan.vuln_breakdown && <VulnBreakdown breakdown={scan.vuln_breakdown} />}
      {scan.action_taken === "BLOCK" && (
        <button onClick={() => onWhyBlocked(scan)} style={{ background: C.red, color: "white", padding: "12px", width: "100%", borderRadius: 10, marginTop: 20 }}>
          Why Blocked?
        </button>
      )}
    </div>
  );
}
// --- Main App Component -----------------------------------------------------

export default function App() {
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedScan, setSelectedScan] = useState(null);
  const [whyBlockedScan, setWhyBlockedScan] = useState(null);
  const [showCopilot, setShowCopilot] = useState(false);
  const [feedback, setFeedback] = useState({});

  const fetchScans = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND}/api/scan-results`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      const normalised = Array.isArray(data) ? data.map(normaliseScan) : [];
      setScans(normalised);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // WebSocket + Polling
  useEffect(() => {
    let ws;
    let pollInterval;

    const connectWS = () => {
      const WS_URL = BACKEND.replace(/^http/, "ws") + "/ws/scans";
      ws = new WebSocket(WS_URL);

      ws.onopen = () => console.log("? WebSocket Connected");
      ws.onmessage = () => fetchScans();
      ws.onclose = () => setTimeout(connectWS, 4000);
      ws.onerror = () => console.log("WS Error");
    };

    connectWS();
    pollInterval = setInterval(fetchScans, 12000);
    fetchScans();

    return () => {
      clearInterval(pollInterval);
      if (ws) ws.close();
    };
  }, [fetchScans]);

  const submitFeedback = async (scanId, type) => {
    setFeedback(prev => ({ ...prev, [scanId]: type }));
    try {
      await fetch(`${BACKEND}/api/scan-results/${scanId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: type === "accept" ? "accurate" : "incorrect" }),
      });
    } catch (e) {
      console.warn("Feedback failed");
    }
  };

  // Derived Stats
  const running = scans.filter(s => s.status === "running");
  const completed = scans.filter(s => s.status !== "running");
  const blocked = completed.filter(s => s.action_taken === "BLOCK");
  const allowed = completed.filter(s => s.action_taken === "ALLOW");
  const withAI = completed.filter(s => s.ai_explanation);

  const avgRisk = completed.length 
    ? (completed.reduce((a, s) => a + (s.risk_score || 0), 0) / completed.length).toFixed(1) 
    : "0";

  const healthScore = Math.max(0, Math.min(100, 
    Math.round(100 - (blocked.length / (completed.length || 1)) * 40 - parseFloat(avgRisk) * 6)
  ));

  return (
    <>
      {whyBlockedScan && <WhyBlockedModal scan={whyBlockedScan} onClose={() => setWhyBlockedScan(null)} />}

      <div style={{ minHeight: "100vh", background: C.bg, color: C.ink, fontFamily: C.sans }}>
        {/* Header */}
        <header style={{ 
          position: "sticky", top: 0, zIndex: 100, background: "rgba(8,12,16,0.95)", 
          backdropFilter: "blur(12px)", borderBottom: `1px solid ${C.border}`, padding: "12px 24px",
          display: "flex", alignItems: "center", gap: 16
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Shield size={22} color={C.teal} />
            <span style={{ fontSize: 18, fontWeight: 800 }}>SecureFlow</span>
          </div>

          <nav style={{ display: "flex", gap: 8 }}>
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: 8,
                    background: isActive ? C.bgSurface : "transparent",
                    border: isActive ? `1px solid ${C.teal}` : "none",
                    color: isActive ? C.ink : C.inkMid,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontWeight: 600
                  }}
                >
                  <Icon size={16} /> {tab.label}
                </button>
              );
            })}
          </nav>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
            {running.length > 0 && (
              <div style={{ color: C.blue, fontSize: 13, fontWeight: 600 }}>? {running.length} Running</div>
            )}
            <button onClick={() => setShowCopilot(!showCopilot)} style={{ padding: "6px 14px", borderRadius: 8, background: showCopilot ? C.tealSoft : C.bgSurface, border: `1px solid ${C.tealBord}` }}>
              <Sparkles size={16} /> AI Copilot
            </button>
            <button onClick={fetchScans} style={{ padding: 8, background: "none", border: "none", color: C.inkMid }}>
              <RefreshCw size={18} />
            </button>
          </div>
        </header>

        <main style={{ padding: "24px", maxWidth: 1400, margin: "0 auto" }}>
          {loading ? (
            <div>Loading scans...</div>
          ) : (
            <>
              {activeTab === "overview" && <div>Overview Tab Content (Add your full OverviewTab here)</div>}
              {activeTab === "pipeline" && <div>Pipeline Tab (Add your full PipelineTab here)</div>}
              {activeTab === "feed" && <div>Feed Tab (Add your full ScanFeedTab here)</div>}
              {activeTab === "metrics" && <div>Metrics Tab (Add your full MetricsTab here)</div>}
            </>
          )}
        </main>
      </div>

      {selectedScan && <ScanDetail scan={selectedScan} onClose={() => setSelectedScan(null)} feedback={feedback} onFeedback={submitFeedback} onWhyBlocked={setWhyBlockedScan} />}

      {showCopilot && (
        <div style={{ position: "fixed", right: 0, top: 0, width: 360, height: "100vh", background: C.bgCard, borderLeft: `1px solid ${C.border}`, zIndex: 300, padding: 20, overflowY: "auto" }}>
          <AICopilot scans={scans} />
        </div>
      )}
    </>
  );
}
