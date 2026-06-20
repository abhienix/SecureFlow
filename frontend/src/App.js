import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  Shield, AlertTriangle, CheckCircle, XCircle, Activity,
  Cpu, GitBranch, Bell, Zap, BarChart2, Layout,
  ChevronRight, RefreshCw, Terminal, Eye, Search,
  GitCommit, Clock, TrendingUp, Menu, X,
} from "lucide-react";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

// ── Design tokens ──────────────────────────────────────────────────────────
const C = {
  white:        "#FFFFFF",
  bg:           "#F8FAFC",
  surface:      "#FFFFFF",
  border:       "#E8EDF3",
  borderStrong: "#CBD5E1",

  ink:          "#0D1117",
  inkMid:       "#4A5568",
  inkLow:       "#94A3B8",
  inkXlow:      "#C8D3DF",

  blue:         "#2563EB",
  blueSoft:     "#EFF6FF",
  blueBorder:   "#BFDBFE",

  green:        "#059669",
  greenSoft:    "#ECFDF5",
  greenBorder:  "#6EE7B7",

  red:          "#DC2626",
  redSoft:      "#FEF2F2",
  redBorder:    "#FECACA",

  amber:        "#D97706",
  amberSoft:    "#FFFBEB",
  amberBorder:  "#FDE68A",

  violet:       "#7C3AED",
  violetSoft:   "#F5F3FF",
  violetBorder: "#DDD6FE",

  mono: "'JetBrains Mono', 'Fira Mono', 'Consolas', monospace",
  sans: "'Inter', 'Segoe UI', system-ui, sans-serif",

  shadow:   "0 1px 2px rgba(13,17,23,0.06), 0 4px 16px rgba(13,17,23,0.04)",
  shadowMd: "0 4px 24px rgba(13,17,23,0.08)",
};

const NAV = [
  { id: "overview", label: "Overview",   icon: Layout   },
  { id: "ai",       label: "AI Insights", icon: Zap,  badge: "AI" },
  { id: "alerts",   label: "Alerts",     icon: Bell     },
  { id: "metrics",  label: "Metrics",    icon: BarChart2 },
];

// ── Helpers ────────────────────────────────────────────────────────────────
function severityColor(s) {
  if (s === "CRITICAL") return C.red;
  if (s === "HIGH")     return C.amber;
  if (s === "MEDIUM")   return C.blue;
  return C.green;
}
function riskColor(n) {
  if (n >= 8) return C.red;
  if (n >= 5) return C.amber;
  return C.green;
}
function fmt(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtTime(ts) {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

// ── Micro components ───────────────────────────────────────────────────────
function Badge({ children, color = C.blue, bg, border }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 8px", borderRadius: 99,
      fontSize: 10, fontWeight: 700, letterSpacing: "0.05em",
      color, background: bg || color + "14", border: `1px solid ${border || color + "33"}`,
      whiteSpace: "nowrap",
    }}>{children}</span>
  );
}

function Chip({ label, value, color }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 3,
      padding: "10px 14px", borderRadius: 10,
      background: C.bg, border: `1px solid ${C.border}`,
      minWidth: 0,
    }}>
      <span style={{ fontSize: 10, color: C.inkLow, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: color || C.ink, fontFamily: value && String(value).length < 6 ? C.mono : C.sans }}>{value || "—"}</span>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color = C.blue, sub }) {
  return (
    <div style={{
      background: C.white, border: `1px solid ${C.border}`,
      borderRadius: 14, padding: "18px 20px", boxShadow: C.shadow,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <span style={{ fontSize: 11, color: C.inkMid, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</span>
        <div style={{ padding: 8, borderRadius: 10, background: color + "12" }}>
          <Icon size={16} color={color} strokeWidth={2} />
        </div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: C.ink, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.inkLow, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function Card({ children, style }) {
  return (
    <div style={{
      background: C.white, border: `1px solid ${C.border}`,
      borderRadius: 14, padding: 20, boxShadow: C.shadow, ...style,
    }}>{children}</div>
  );
}

function SectionTitle({ children, right }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: C.inkLow, letterSpacing: "0.08em", textTransform: "uppercase" }}>{children}</span>
      {right}
    </div>
  );
}

const TT = { background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 11, color: C.ink, boxShadow: C.shadowMd };

// ── AI Card ────────────────────────────────────────────────────────────────
function AICard({ scan }) {
  const [open, setOpen] = useState(false);
  const blocked = scan.action_taken === "BLOCK";
  const risk = scan.risk_score || 0;
  return (
    <div style={{
      background: C.white, border: `1px solid ${C.border}`,
      borderRadius: 14, overflow: "hidden", marginBottom: 12, boxShadow: C.shadow,
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "14px 18px", borderBottom: open ? `1px solid ${C.border}` : "none",
        background: blocked ? C.redSoft : C.greenSoft,
        cursor: "pointer", gap: 12, flexWrap: "wrap",
      }} onClick={() => setOpen(!open)}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <Badge color={blocked ? C.red : C.green}>{blocked ? "BLOCKED" : "ALLOWED"}</Badge>
          <span style={{ fontFamily: C.mono, fontSize: 12, color: C.inkMid, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {scan.commit_sha?.slice(0, 12)}
          </span>
          {scan.commit_message && (
            <span style={{ fontSize: 12, color: C.inkMid, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>
              — {scan.commit_message}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
          <Badge color={riskColor(risk)}>Risk {risk}/10</Badge>
          <Badge color={C.violet}>AI</Badge>
          <ChevronRight size={14} color={C.inkLow} style={{ transform: open ? "rotate(90deg)" : "none", transition: "0.2s" }} />
        </div>
      </div>

      {open && (
        <div style={{ padding: "16px 18px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10, marginBottom: 14 }}>
            <Chip label="Repo"     value={scan.repo_name} />
            <Chip label="Branch"   value={scan.branch} />
            <Chip label="Severity" value={scan.severity} color={severityColor(scan.severity)} />
            <Chip label="Scanner"  value={scan.scan_type?.toUpperCase()} />
          </div>
          {scan.ai_explanation && (
            <div style={{ background: C.blueSoft, border: `1px solid ${C.blueBorder}`, borderRadius: 10, padding: 14, marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <Zap size={12} color={C.blue} />
                <span style={{ fontSize: 11, fontWeight: 700, color: C.blue }}>AI ANALYSIS</span>
              </div>
              <div style={{ fontSize: 13, color: C.inkMid, lineHeight: 1.75 }}>{scan.ai_explanation}</div>
            </div>
          )}
          {scan.ai_fix && (
            <div style={{ background: C.greenSoft, border: `1px solid ${C.greenBorder}`, borderRadius: 10, padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <Terminal size={12} color={C.green} />
                <span style={{ fontSize: 11, fontWeight: 700, color: C.green }}>REMEDIATION</span>
              </div>
              <div style={{ fontSize: 12, color: C.ink, lineHeight: 1.65, fontFamily: C.mono, whiteSpace: "pre-wrap" }}>{scan.ai_fix}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Scan row ───────────────────────────────────────────────────────────────
function ScanRow({ scan, selected, onClick }) {
  const blocked = scan.action_taken === "BLOCK";
  const isSelected = selected?.id === scan.id;
  return (
    <div onClick={onClick} style={{
      padding: "12px 14px", borderRadius: 10, marginBottom: 6, cursor: "pointer",
      border: `1px solid ${isSelected ? C.blueBorder : C.border}`,
      borderLeft: `3px solid ${blocked ? C.red : C.green}`,
      background: isSelected ? C.blueSoft : C.white,
      transition: "background 0.15s, border-color 0.15s",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 5 }}>
        <div style={{ minWidth: 0, flex: 1, marginRight: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <GitCommit size={11} color={C.inkLow} />
            <span style={{ fontFamily: C.mono, fontSize: 11, color: C.blue, fontWeight: 600 }}>
              {scan.commit_sha?.slice(0, 10)}
            </span>
          </div>
          {scan.commit_message && (
            <div style={{ fontSize: 12, color: C.inkMid, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {scan.commit_message}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
          {scan.ai_explanation && <Badge color={C.violet}>AI</Badge>}
          <Badge color={blocked ? C.red : C.green}>{scan.action_taken}</Badge>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 11, color: C.inkLow }}>{scan.repo_name}</span>
        <span style={{ fontSize: 11, color: C.inkXlow }}>·</span>
        <Badge color={severityColor(scan.severity)}>{scan.severity}</Badge>
        <span style={{ fontSize: 11, color: C.inkXlow }}>·</span>
        <span style={{ fontSize: 11, color: C.inkLow, display: "flex", alignItems: "center", gap: 3 }}>
          <Clock size={10} />{fmt(scan.created_at)}
        </span>
      </div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────
export default function App() {
  const [tab,         setTab]         = useState("overview");
  const [scans,       setScans]       = useState([]);
  const [selected,    setSelected]    = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [feedback,    setFeedback]    = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);
  const [search,      setSearch]      = useState("");
  const [navOpen,     setNavOpen]     = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/api/scan-results`);
      const data = res.data || [];
      setScans(data);
      setSelected((prev) => prev ? data.find((s) => s.id === prev.id) || null : null);
      setError(null);
      setLastUpdated(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }));
    } catch {
      setError("Cannot reach backend. Check that the API is running.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const iv = setInterval(fetchAll, 10000);
    return () => clearInterval(iv);
  }, [fetchAll]);

  const submitFeedback = async (scanId, type) => {
    try {
      await axios.post(`${API}/api/scan-results/${scanId}/feedback`, { feedback: type });
      setFeedback((p) => ({ ...p, [scanId]: type }));
    } catch {
      setFeedback((p) => ({ ...p, [scanId]: "error" }));
    }
  };

  // ── Stats ────────────────────────────────────────────────────────────────
  const stats = {
    total:   scans.length,
    blocked: scans.filter((s) => s.action_taken === "BLOCK").length,
    allowed: scans.filter((s) => s.action_taken === "ALLOW").length,
    critical: scans.filter((s) => s.severity === "CRITICAL").length,
    high:    scans.filter((s) => s.severity === "HIGH").length,
    avgRisk: scans.length
      ? +(scans.reduce((a, s) => a + (s.risk_score || 0), 0) / scans.length).toFixed(1)
      : 0,
    aiScanned: scans.filter((s) => s.ai_explanation).length,
  };

  const filtered = scans.filter((s) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return [s.repo_name, s.branch, s.commit_sha, s.severity, s.action_taken, s.commit_message]
      .some((v) => String(v || "").toLowerCase().includes(q));
  });

  const trendData = [...scans].reverse().slice(-12).map((s, i) => ({
    n: i + 1, risk: s.risk_score || 0,
  }));

  const sevData = [
    { name: "Critical", v: stats.critical,                                              color: C.red   },
    { name: "High",     v: scans.filter((s) => s.severity === "HIGH").length,           color: C.amber },
    { name: "Medium",   v: scans.filter((s) => s.severity === "MEDIUM").length,         color: C.blue  },
    { name: "Low",      v: scans.filter((s) => s.severity === "LOW").length,            color: C.green },
    { name: "Unknown",  v: scans.filter((s) => s.severity === "unknown").length,        color: C.inkLow},
  ].filter((d) => d.v > 0);

  const gateData = [
    { name: "Blocked", value: stats.blocked, color: C.red   },
    { name: "Allowed", value: stats.allowed, color: C.green },
  ].filter((d) => d.value > 0);

  // ── Nav ──────────────────────────────────────────────────────────────────
  const NavItems = () => (
    <>
      {NAV.map(({ id, label, icon: Icon, badge }) => {
        const active = tab === id;
        return (
          <button key={id} onClick={() => { setTab(id); setNavOpen(false); }} style={{
            display: "flex", alignItems: "center", gap: 10, width: "100%",
            padding: "10px 12px", borderRadius: 10, border: "none", cursor: "pointer",
            marginBottom: 2, textAlign: "left", fontSize: 13, fontWeight: active ? 700 : 500,
            background: active ? C.blueSoft : "transparent",
            color: active ? C.blue : C.inkMid,
            outline: "none",
          }}>
            <Icon size={16} strokeWidth={active ? 2.5 : 2} />
            <span style={{ flex: 1 }}>{label}</span>
            {badge && <Badge color={C.violet}>{badge}</Badge>}
          </button>
        );
      })}
    </>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg, fontFamily: C.sans, color: C.ink }}>

      {/* ── Sidebar (desktop) ── */}
      <aside style={{
        width: 220, flexShrink: 0, background: C.white, borderRight: `1px solid ${C.border}`,
        display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh",
        overflowY: "auto",
      }} className="sidebar-desktop">
        {/* Logo */}
        <div style={{ padding: "22px 18px 18px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ background: C.blue, borderRadius: 10, padding: 9 }}>
              <Shield size={17} color="#fff" strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.ink, letterSpacing: "-0.02em" }}>SecureFlow</div>
              <div style={{ fontSize: 10, color: C.inkLow, fontWeight: 600, letterSpacing: "0.06em" }}>DEVSECOPS · AI</div>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: "12px 10px" }}>
          <div style={{ fontSize: 10, color: C.inkXlow, fontWeight: 700, padding: "4px 10px 8px", letterSpacing: "0.1em" }}>NAVIGATION</div>
          <NavItems />
        </nav>

        {/* Status */}
        <div style={{ padding: "14px 16px", borderTop: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.green }} />
            <span style={{ fontSize: 12, color: C.green, fontWeight: 700 }}>Pipeline Active</span>
          </div>
          {lastUpdated && (
            <div style={{ fontSize: 11, color: C.inkLow, display: "flex", alignItems: "center", gap: 4 }}>
              <RefreshCw size={10} /> Updated {lastUpdated}
            </div>
          )}
        </div>
      </aside>

      {/* ── Mobile nav overlay ── */}
      {navOpen && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 100,
          background: "rgba(13,17,23,0.45)", backdropFilter: "blur(4px)",
        }} onClick={() => setNavOpen(false)}>
          <div style={{
            width: 240, height: "100%", background: C.white,
            borderRight: `1px solid ${C.border}`, padding: "20px 12px",
            display: "flex", flexDirection: "column",
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ background: C.blue, borderRadius: 10, padding: 8 }}>
                  <Shield size={15} color="#fff" />
                </div>
                <span style={{ fontWeight: 800, fontSize: 15 }}>SecureFlow</span>
              </div>
              <button onClick={() => setNavOpen(false)} style={{ border: "none", background: "none", cursor: "pointer", color: C.inkMid }}>
                <X size={18} />
              </button>
            </div>
            <NavItems />
          </div>
        </div>
      )}

      {/* ── Main ── */}
      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>

        {/* Top bar */}
        <header style={{
          position: "sticky", top: 0, zIndex: 20,
          background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${C.border}`,
          padding: "14px 20px",
          display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Hamburger (mobile) */}
            <button onClick={() => setNavOpen(true)} style={{
              border: "none", background: "none", cursor: "pointer", padding: 4, color: C.inkMid,
              display: "none",
            }} className="hamburger">
              <Menu size={20} />
            </button>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, color: C.ink, letterSpacing: "-0.02em" }}>
                {NAV.find((n) => n.id === tab)?.label}
              </div>
              <div style={{ fontSize: 11, color: C.inkLow, marginTop: 1 }}>
                abhienix / SecureFlow · main
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <Badge color={C.blue}>{stats.total} scans</Badge>
            <Badge color={stats.blocked > 0 ? C.red : C.green}>{stats.blocked} blocked</Badge>
            <Badge color={C.violet}>{stats.aiScanned} AI</Badge>
            <button onClick={fetchAll} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 12px", borderRadius: 9,
              border: `1px solid ${C.border}`, background: C.white,
              color: C.inkMid, cursor: "pointer", fontSize: 12, fontWeight: 600,
              boxShadow: C.shadow,
            }}>
              <RefreshCw size={13} /> Refresh
            </button>
          </div>
        </header>

        {error && (
          <div style={{
            margin: "16px 20px 0", padding: "12px 16px", borderRadius: 10,
            background: C.redSoft, border: `1px solid ${C.redBorder}`, color: C.red, fontSize: 13,
          }}>{error}</div>
        )}

        <div style={{ padding: "20px", flex: 1 }}>

          {/* ══ OVERVIEW ══════════════════════════════════════════════════ */}
          {tab === "overview" && (
            <>
              {/* Stat cards */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: 12, marginBottom: 20,
              }}>
                <StatCard icon={Activity}      label="Total Scans" value={stats.total}          color={C.blue}  />
                <StatCard icon={XCircle}        label="Blocked"     value={stats.blocked}         color={C.red}   />
                <StatCard icon={CheckCircle}    label="Allowed"     value={stats.allowed}         color={C.green} />
                <StatCard icon={AlertTriangle}  label="Critical"    value={stats.critical}        color={C.amber} />
                <StatCard icon={Cpu}            label="Avg Risk"    value={`${stats.avgRisk}/10`} color={C.violet} sub="out of 10" />
                <StatCard icon={Zap}            label="AI Analyzed" value={stats.aiScanned}       color={C.violet} sub="vulnerabilities" />
              </div>

              {/* Charts row */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 12, marginBottom: 20,
              }}>
                {/* Risk trend */}
                <Card>
                  <SectionTitle>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <TrendingUp size={13} color={C.blue} /> Risk Score Trend
                    </span>
                  </SectionTitle>
                  {trendData.length === 0 ? (
                    <div style={{ height: 140, display: "flex", alignItems: "center", justifyContent: "center", color: C.inkLow, fontSize: 13 }}>No data yet</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={140}>
                      <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor={C.blue} stopOpacity={0.18} />
                            <stop offset="95%" stopColor={C.blue} stopOpacity={0}    />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke={C.border} strokeDasharray="4 4" vertical={false} />
                        <XAxis dataKey="n" stroke={C.inkXlow} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                        <YAxis stroke={C.inkXlow} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} domain={[0, 10]} />
                        <Tooltip contentStyle={TT} formatter={(v) => [`${v}/10`, "Risk"]} />
                        <Area type="monotone" dataKey="risk" stroke={C.blue} strokeWidth={2.5} fill="url(#rg)" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </Card>

                {/* Gate decisions */}
                <Card>
                  <SectionTitle>Gate Decisions</SectionTitle>
                  {gateData.length === 0 ? (
                    <div style={{ height: 140, display: "flex", alignItems: "center", justifyContent: "center", color: C.inkLow, fontSize: 13 }}>No data yet</div>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={110}>
                        <PieChart>
                          <Pie data={gateData} cx="50%" cy="50%" innerRadius={32} outerRadius={48} dataKey="value" strokeWidth={2} stroke={C.white}>
                            {gateData.map((d, i) => <Cell key={i} fill={d.color} />)}
                          </Pie>
                          <Tooltip contentStyle={TT} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{ display: "flex", justifyContent: "center", gap: 20, fontSize: 12, color: C.inkMid }}>
                        {gateData.map((d) => (
                          <span key={d.name} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: d.color, display: "inline-block" }} />
                            {d.name} <strong style={{ color: C.ink }}>{d.value}</strong>
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </Card>

                {/* Severity */}
                <Card>
                  <SectionTitle>Severity Breakdown</SectionTitle>
                  {sevData.length === 0 ? (
                    <div style={{ height: 140, display: "flex", alignItems: "center", justifyContent: "center", color: C.inkLow, fontSize: 13 }}>No data yet</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={140}>
                      <BarChart data={sevData} barSize={20} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                        <CartesianGrid stroke={C.border} strokeDasharray="4 4" vertical={false} />
                        <XAxis dataKey="name" stroke={C.inkXlow} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                        <YAxis stroke={C.inkXlow} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={TT} />
                        <Bar dataKey="v" radius={[5, 5, 0, 0]}>
                          {sevData.map((d, i) => <Cell key={i} fill={d.color} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </Card>
              </div>

              {/* Scan list + detail */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "minmax(260px, 1fr) minmax(320px, 1.5fr)",
                gap: 12,
              }}>
                {/* List */}
                <Card style={{ maxHeight: 520, display: "flex", flexDirection: "column", padding: 0 }}>
                  <div style={{ padding: "16px 16px 10px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
                    <SectionTitle>Scan History</SectionTitle>
                    <div style={{ position: "relative" }}>
                      <Search size={13} color={C.inkLow} style={{ position: "absolute", left: 10, top: 9, pointerEvents: "none" }} />
                      <input
                        value={search} onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search commits, repos, severity…"
                        style={{
                          width: "100%", padding: "8px 10px 8px 30px",
                          borderRadius: 9, border: `1px solid ${C.border}`,
                          fontSize: 12, outline: "none", background: C.bg,
                          color: C.ink, boxSizing: "border-box",
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px" }}>
                    {loading && <div style={{ color: C.inkLow, fontSize: 13, padding: 12 }}>Loading scans…</div>}
                    {!loading && filtered.length === 0 && (
                      <div style={{ color: C.inkLow, fontSize: 13, padding: 20, textAlign: "center" }}>No scans found.</div>
                    )}
                    {filtered.map((scan) => (
                      <ScanRow key={scan.id} scan={scan} selected={selected} onClick={() => setSelected(scan)} />
                    ))}
                  </div>
                </Card>

                {/* Detail */}
                <Card style={{ maxHeight: 520, overflowY: "auto" }}>
                  {!selected ? (
                    <div style={{ minHeight: 300, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 10, color: C.inkLow }}>
                      <Eye size={40} strokeWidth={1.2} style={{ opacity: 0.3 }} />
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.inkMid }}>Select a scan to inspect</div>
                      <div style={{ fontSize: 12 }}>AI analysis, fix suggestions & feedback</div>
                    </div>
                  ) : (
                    <>
                      <SectionTitle>Scan Details</SectionTitle>

                      {/* Commit info banner */}
                      <div style={{
                        background: C.bg, border: `1px solid ${C.border}`,
                        borderRadius: 10, padding: "12px 14px", marginBottom: 14,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <GitCommit size={13} color={C.blue} />
                          <span style={{ fontFamily: C.mono, fontSize: 12, color: C.blue, fontWeight: 600 }}>{selected.commit_sha?.slice(0, 14)}</span>
                          <Badge color={selected.action_taken === "BLOCK" ? C.red : C.green}>{selected.action_taken}</Badge>
                        </div>
                        {selected.commit_message && (
                          <div style={{ fontSize: 13, color: C.inkMid, lineHeight: 1.5 }}>{selected.commit_message}</div>
                        )}
                        <div style={{ display: "flex", gap: 10, marginTop: 6, fontSize: 11, color: C.inkLow }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <GitBranch size={10} />{selected.branch}
                          </span>
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <Clock size={10} />{fmt(selected.created_at)} {fmtTime(selected.created_at)}
                          </span>
                        </div>
                      </div>

                      {/* Chips */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8, marginBottom: 14 }}>
                        <Chip label="Repo"      value={selected.repo_name} />
                        <Chip label="Severity"  value={selected.severity}  color={severityColor(selected.severity)} />
                        <Chip label="Risk"       value={`${selected.risk_score || 0}/10`} color={riskColor(selected.risk_score || 0)} />
                        <Chip label="Scanner"   value={selected.scan_type?.toUpperCase()} />
                      </div>

                      {/* AI analysis */}
                      {selected.ai_explanation && (
                        <div style={{ background: C.blueSoft, border: `1px solid ${C.blueBorder}`, borderRadius: 10, padding: 14, marginBottom: 10 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                            <Zap size={12} color={C.blue} />
                            <span style={{ fontSize: 11, fontWeight: 700, color: C.blue }}>AI ANALYSIS · GEMINI</span>
                          </div>
                          <div style={{ fontSize: 13, color: C.inkMid, lineHeight: 1.75 }}>{selected.ai_explanation}</div>
                        </div>
                      )}

                      {/* Remediation */}
                      {selected.ai_fix && (
                        <div style={{ background: C.greenSoft, border: `1px solid ${C.greenBorder}`, borderRadius: 10, padding: 14, marginBottom: 10 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                            <Terminal size={12} color={C.green} />
                            <span style={{ fontSize: 11, fontWeight: 700, color: C.green }}>REMEDIATION</span>
                          </div>
                          <div style={{ fontSize: 12, color: C.ink, lineHeight: 1.65, fontFamily: C.mono, whiteSpace: "pre-wrap" }}>{selected.ai_fix}</div>
                        </div>
                      )}

                      {/* Feedback */}
                      <div style={{ background: C.violetSoft, border: `1px solid ${C.violetBorder}`, borderRadius: 10, padding: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: C.violet, marginBottom: 10 }}>ANALYST FEEDBACK</div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {[
                            { type: "accept", label: "✓ Accurate", color: C.green,  bg: C.greenSoft,  border: C.greenBorder  },
                            { type: "reject", label: "✗ Incorrect", color: C.red,   bg: C.redSoft,    border: C.redBorder    },
                            { type: "edit",   label: "~ Partial",   color: C.amber, bg: C.amberSoft,  border: C.amberBorder  },
                          ].map(({ type, label, color, bg, border }) => (
                            <button key={type} onClick={() => submitFeedback(selected.id, type)} style={{
                              padding: "7px 14px", borderRadius: 8, cursor: "pointer",
                              fontSize: 12, fontWeight: 700, border: `1px solid ${border}`,
                              background: feedback[selected.id] === type ? bg : C.white,
                              color,
                            }}>{label}</button>
                          ))}
                        </div>
                        {feedback[selected.id] && feedback[selected.id] !== "error" && (
                          <div style={{ fontSize: 11, color: C.inkLow, marginTop: 8 }}>Feedback recorded — helps improve AI accuracy</div>
                        )}
                      </div>
                    </>
                  )}
                </Card>
              </div>
            </>
          )}

          {/* ══ AI INSIGHTS ═══════════════════════════════════════════════ */}
          {tab === "ai" && (
            <>
              {/* Header banner */}
              <div style={{
                background: `linear-gradient(135deg, ${C.blueSoft}, ${C.violetSoft})`,
                border: `1px solid ${C.blueBorder}`, borderRadius: 14,
                padding: "20px 24px", marginBottom: 20,
                display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 16,
              }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <Zap size={20} color={C.violet} />
                    <span style={{ fontSize: 18, fontWeight: 800, color: C.ink }}>AI Security Intelligence</span>
                    <Badge color={C.violet}>POWERED BY GEMINI</Badge>
                  </div>
                  <div style={{ fontSize: 13, color: C.inkMid, lineHeight: 1.7, maxWidth: 500 }}>
                    Every vulnerability is analyzed by Google Gemini — plain-language explanations,
                    remediation steps, and risk scores delivered automatically on each scan.
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[
                    { label: "AI Analyzed",    value: stats.aiScanned      },
                    { label: "Avg Risk Score", value: `${stats.avgRisk}/10` },
                    { label: "AI Model",       value: "Gemini 1.5"         },
                    { label: "Provider",       value: "Google AI"          },
                  ].map((m) => (
                    <div key={m.label} style={{
                      background: C.white, borderRadius: 10, padding: "10px 14px",
                      border: `1px solid ${C.border}`, textAlign: "center",
                      minWidth: 110,
                    }}>
                      <div style={{ fontSize: 10, color: C.inkLow, marginBottom: 4, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>{m.label}</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: C.ink, fontFamily: C.mono }}>{m.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ fontSize: 11, fontWeight: 700, color: C.inkLow, letterSpacing: "0.08em", marginBottom: 14, textTransform: "uppercase" }}>
                AI-Analyzed Vulnerabilities
              </div>

              {loading && <div style={{ color: C.inkLow, fontSize: 13 }}>Loading…</div>}
              {!loading && scans.filter((s) => s.ai_explanation).length === 0 && (
                <Card style={{ textAlign: "center", padding: 40, color: C.inkLow }}>
                  <Zap size={32} style={{ opacity: 0.2, marginBottom: 10 }} />
                  <div>No AI-analyzed scans yet. Push a commit to trigger the pipeline.</div>
                </Card>
              )}
              {scans.filter((s) => s.ai_explanation).map((scan) => (
                <AICard key={scan.id} scan={scan} />
              ))}
            </>
          )}

          {/* ══ ALERTS ════════════════════════════════════════════════════ */}
          {tab === "alerts" && (
            <>
              <Card style={{ marginBottom: 16, padding: "14px 18px" }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>Real-Time Alert Feed</div>
                <div style={{ fontSize: 12, color: C.inkLow, marginTop: 4 }}>
                  All pipeline events · auto-refreshes every 10s
                </div>
              </Card>

              {loading && <div style={{ color: C.inkLow, fontSize: 13 }}>Loading…</div>}
              {!loading && scans.length === 0 && (
                <Card style={{ textAlign: "center", padding: 40, color: C.inkLow }}>No alerts yet.</Card>
              )}

              {scans.map((scan) => {
                const blocked = scan.action_taken === "BLOCK";
                return (
                  <div key={scan.id} style={{
                    background: C.white, borderRadius: 12, marginBottom: 10,
                    border: `1px solid ${C.border}`,
                    borderLeft: `4px solid ${blocked ? C.red : C.green}`,
                    padding: "14px 18px", boxShadow: C.shadow,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Badge color={blocked ? C.red : C.green}>Deployment {scan.action_taken}</Badge>
                        {scan.ai_explanation && <Badge color={C.violet}>AI Analyzed</Badge>}
                      </div>
                      <span style={{ fontSize: 11, color: C.inkLow, fontFamily: C.mono }}>
                        {scan.commit_sha?.slice(0, 10)} · {fmt(scan.created_at)} {fmtTime(scan.created_at)}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.ink, marginBottom: 4 }}>
                      {scan.commit_message || scan.repo_name}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: scan.ai_explanation ? 10 : 0 }}>
                      <span style={{ fontSize: 12, color: C.inkMid }}>{scan.repo_name}</span>
                      <span style={{ fontSize: 12, color: C.inkXlow }}>·</span>
                      <span style={{ fontSize: 12, color: C.inkMid }}>{scan.branch}</span>
                      <Badge color={severityColor(scan.severity)}>{scan.severity}</Badge>
                      {(scan.risk_score > 0) && <Badge color={riskColor(scan.risk_score)}>Risk {scan.risk_score}/10</Badge>}
                    </div>
                    {scan.ai_explanation && (
                      <div style={{
                        fontSize: 12, color: C.inkMid, lineHeight: 1.65,
                        paddingLeft: 12, borderLeft: `3px solid ${C.blue}`,
                        marginTop: 8,
                      }}>
                        <strong style={{ color: C.blue, marginRight: 4 }}>Gemini:</strong>
                        {scan.ai_explanation.slice(0, 200)}{scan.ai_explanation.length > 200 ? "…" : ""}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}

          {/* ══ METRICS ═══════════════════════════════════════════════════ */}
          {tab === "metrics" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
                <StatCard icon={Activity}   label="Total Scans"   value={stats.total}            color={C.blue}   sub="all time" />
                <StatCard icon={XCircle}    label="Total Blocked" value={stats.blocked}           color={C.red}    sub="policy violations" />
                <StatCard icon={CheckCircle}label="Total Allowed" value={stats.allowed}           color={C.green}  sub="clean deployments" />
                <StatCard icon={Zap}        label="AI Analyzed"   value={stats.aiScanned}         color={C.violet} sub="with Gemini" />
                <StatCard icon={AlertTriangle} label="High Risk"  value={scans.filter(s => (s.risk_score||0) >= 7).length} color={C.amber} sub="risk ≥ 7/10" />
                <StatCard icon={Cpu}        label="Avg Risk"      value={`${stats.avgRisk}/10`}   color={C.violet} sub="mean score" />
              </div>

              <Card>
                <SectionTitle>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <TrendingUp size={13} color={C.blue} /> Risk Score Over Time
                  </span>
                </SectionTitle>
                {trendData.length === 0 ? (
                  <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: C.inkLow, fontSize: 13 }}>No data yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="rg2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={C.blue} stopOpacity={0.18} />
                          <stop offset="95%" stopColor={C.blue} stopOpacity={0}    />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke={C.border} strokeDasharray="4 4" vertical={false} />
                      <XAxis dataKey="n" stroke={C.inkXlow} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} label={{ value: "Scan #", position: "insideBottomRight", offset: -4, fontSize: 10, fill: C.inkLow }} />
                      <YAxis stroke={C.inkXlow} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} domain={[0, 10]} />
                      <Tooltip contentStyle={TT} formatter={(v) => [`${v}/10`, "Risk Score"]} />
                      <Area type="monotone" dataKey="risk" stroke={C.blue} strokeWidth={2.5} fill="url(#rg2)" dot={{ r: 3, fill: C.blue, stroke: C.white, strokeWidth: 2 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </Card>

              <div style={{ marginTop: 12 }}>
                <Card>
                  <SectionTitle>Severity Distribution</SectionTitle>
                  {sevData.length === 0 ? (
                    <div style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center", color: C.inkLow, fontSize: 13 }}>No data yet</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={sevData} barSize={28} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                        <CartesianGrid stroke={C.border} strokeDasharray="4 4" vertical={false} />
                        <XAxis dataKey="name" stroke={C.inkXlow} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                        <YAxis stroke={C.inkXlow} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={TT} />
                        <Bar dataKey="v" radius={[6, 6, 0, 0]} name="Count">
                          {sevData.map((d, i) => <Cell key={i} fill={d.color} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </Card>
              </div>
            </>
          )}

        </div>
      </main>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${C.bg}; }
        button { font-family: inherit; }
        input  { font-family: inherit; }
        button:active { opacity: 0.85; }
        input:focus { border-color: ${C.blue} !important; outline: none; box-shadow: 0 0 0 3px ${C.blue}22; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 999px; }

        @media (max-width: 768px) {
          .sidebar-desktop { display: none !important; }
          .hamburger       { display: flex !important; }
        }
        @media (min-width: 769px) {
          .hamburger { display: none !important; }
        }

        /* Responsive scan list + detail: stack on mobile */
        @media (max-width: 900px) {
          .split-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
