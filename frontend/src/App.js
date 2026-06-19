import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid,
} from "recharts";
import {
  Shield, AlertTriangle, CheckCircle, XCircle, Activity,
  Cpu, GitBranch, Bell, Zap, BarChart2, Layout,
  ChevronRight, ExternalLink, RefreshCw, Terminal, Eye, Search,
} from "lucide-react";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";
const GRAFANA = process.env.REACT_APP_GRAFANA_URL || "http://localhost:3001";

const T = {
  bg: "#F4F7FB",
  surface: "#FFFFFF",
  card: "#FFFFFF",
  border: "#E2E8F0",
  borderSoft: "#F1F5F9",
  text: "#0F172A",
  textMid: "#475569",
  textLow: "#94A3B8",
  primary: "#2563EB",
  primarySoft: "#EFF6FF",
  primaryBorder: "#BFDBFE",
  success: "#059669",
  successSoft: "#ECFDF5",
  successBorder: "#A7F3D0",
  danger: "#DC2626",
  dangerSoft: "#FEF2F2",
  dangerBorder: "#FECACA",
  warning: "#D97706",
  warningSoft: "#FFFBEB",
  warningBorder: "#FDE68A",
  purple: "#7C3AED",
  purpleSoft: "#F5F3FF",
  purpleBorder: "#DDD6FE",
  shadow: "0 1px 3px rgba(15,23,42,0.06), 0 8px 24px rgba(15,23,42,0.04)",
  shadowHover: "0 4px 16px rgba(37,99,235,0.12)",
  mono: "'JetBrains Mono', 'Consolas', monospace",
};

const NAV = [
  { id: "overview", label: "Overview", icon: Layout },
  { id: "ai", label: "AI Insights", icon: Zap, badge: "NEW" },
  { id: "alerts", label: "Alerts", icon: Bell },
  { id: "metrics", label: "Metrics", icon: BarChart2 },
  { id: "grafana", label: "Grafana", icon: Activity },
];

function parsePrometheus(text) {
  const m = {};
  (text || "").split("\n").forEach((line) => {
    if (line.startsWith("#") || !line.trim()) return;
    const match = line.match(/^([^\s{]+)(?:\{[^}]*\})?\s+([\d.e+\-]+)/);
    if (match) m[match[1]] = (m[match[1]] || 0) + parseFloat(match[2]);
  });
  return m;
}

function riskColor(score) {
  if (score >= 8) return T.danger;
  if (score >= 5) return T.warning;
  return T.success;
}

function Tag({ children, tone = "primary" }) {
  const styles = {
    primary: { color: T.primary, bg: T.primarySoft, border: T.primaryBorder },
    success: { color: T.success, bg: T.successSoft, border: T.successBorder },
    danger: { color: T.danger, bg: T.dangerSoft, border: T.dangerBorder },
    warning: { color: T.warning, bg: T.warningSoft, border: T.warningBorder },
    purple: { color: T.purple, bg: T.purpleSoft, border: T.purpleBorder },
  };
  const s = styles[tone] || styles.primary;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "3px 9px",
      borderRadius: 999, fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
      color: s.color, background: s.bg, border: `1px solid ${s.border}`,
    }}>{children}</span>
  );
}

function StatCard({ icon: Icon, label, value, tone = "primary", sub }) {
  const colors = {
    primary: T.primary, success: T.success, danger: T.danger,
    warning: T.warning, purple: T.purple,
  };
  const color = colors[tone] || T.primary;
  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`, borderRadius: 14,
      padding: "18px 20px", boxShadow: T.shadow, transition: "box-shadow 0.2s, transform 0.2s",
    }}
    onMouseEnter={(e) => { e.currentTarget.style.boxShadow = T.shadowHover; e.currentTarget.style.transform = "translateY(-2px)"; }}
    onMouseLeave={(e) => { e.currentTarget.style.boxShadow = T.shadow; e.currentTarget.style.transform = "translateY(0)"; }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <span style={{ fontSize: 11, color: T.textMid, fontWeight: 600, letterSpacing: "0.04em" }}>{label}</span>
        <div style={{ padding: 8, borderRadius: 10, background: `${color}12` }}>
          <Icon size={16} color={color} />
        </div>
      </div>
      <div style={{ fontSize: 30, fontWeight: 800, color: T.text, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: T.textLow, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function SectionLabel({ children, action }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: T.textMid, letterSpacing: "0.06em" }}>{children}</div>
      {action}
    </div>
  );
}

function Panel({ children, style }) {
  return (
    <div style={{
      background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14,
      padding: 18, boxShadow: T.shadow, ...style,
    }}>{children}</div>
  );
}

function AICard({ scan }) {
  const blocked = scan.action_taken === "BLOCK";
  const rc = riskColor(scan.risk_score || 0);
  return (
    <Panel style={{ marginBottom: 14, padding: 0, overflow: "hidden" }}>
      <div style={{
        padding: "14px 18px", borderBottom: `1px solid ${T.borderSoft}`,
        background: blocked ? T.dangerSoft : T.successSoft,
        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Tag tone={blocked ? "danger" : "success"}>{blocked ? "BLOCKED" : "ALLOWED"}</Tag>
          <span style={{ fontFamily: T.mono, fontSize: 12, color: T.textMid }}>{scan.commit_sha?.slice(0, 12)}</span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Tag tone={scan.risk_score >= 8 ? "danger" : scan.risk_score >= 5 ? "warning" : "success"}>
            Risk {scan.risk_score || 0}/10
          </Tag>
          <Tag tone="purple">AI ANALYZED</Tag>
        </div>
      </div>
      <div style={{ padding: "16px 18px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 14, marginBottom: 14 }}>
          {[
            { label: "Repo", value: scan.repo_name },
            { label: "Branch", value: scan.branch },
            { label: "Severity", value: scan.severity, tone: scan.severity === "CRITICAL" ? "danger" : "warning" },
            { label: "Scanner", value: scan.scan_type?.toUpperCase() },
          ].map((m) => (
            <div key={m.label}>
              <div style={{ fontSize: 10, color: T.textLow, marginBottom: 3 }}>{m.label}</div>
              {m.tone ? <Tag tone={m.tone}>{m.value || "—"}</Tag> : (
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text, fontFamily: T.mono }}>{m.value || "—"}</div>
              )}
            </div>
          ))}
        </div>
        {scan.ai_explanation && (
          <div style={{ background: T.primarySoft, border: `1px solid ${T.primaryBorder}`, borderRadius: 10, padding: 14, marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <Zap size={12} color={T.primary} />
              <span style={{ fontSize: 11, fontWeight: 700, color: T.primary }}>AI Vulnerability Analysis</span>
            </div>
            <div style={{ fontSize: 13, color: T.textMid, lineHeight: 1.7 }}>{scan.ai_explanation}</div>
          </div>
        )}
        {scan.ai_fix && (
          <div style={{ background: T.successSoft, border: `1px solid ${T.successBorder}`, borderRadius: 10, padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <Terminal size={12} color={T.success} />
              <span style={{ fontSize: 11, fontWeight: 700, color: T.success }}>Suggested Remediation</span>
            </div>
            <div style={{ fontSize: 12, color: T.text, lineHeight: 1.6, fontFamily: T.mono, whiteSpace: "pre-wrap" }}>{scan.ai_fix}</div>
          </div>
        )}
      </div>
    </Panel>
  );
}

export default function App() {
  const [tab, setTab] = useState("overview");
  const [scans, setScans] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [promRaw, setPromRaw] = useState("");
  const [feedback, setFeedback] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);
  const [search, setSearch] = useState("");

  const fetchAll = useCallback(async () => {
    try {
      const [scanRes, promRes] = await Promise.allSettled([
        axios.get(`${API}/api/scan-results`),
        axios.get(`${API}/metrics`, { responseType: "text" }),
      ]);
      if (scanRes.status === "fulfilled") {
        const data = scanRes.value.data || [];
        setScans(data);
        setSelected((prev) => (prev ? data.find((s) => s.id === prev.id) || null : null));
        setError(null);
      } else {
        setError("Could not reach scan API. Is the backend running on port 8000?");
      }
      if (promRes.status === "fulfilled") setPromRaw(promRes.value.data || "");
      setLastUpdated(new Date().toLocaleTimeString());
    } catch {
      setError("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const iv = setInterval(fetchAll, 8000);
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

  const pm = parsePrometheus(promRaw);
  const stats = {
    total: scans.length,
    blocked: scans.filter((s) => s.action_taken === "BLOCK").length,
    allowed: scans.filter((s) => s.action_taken === "ALLOW").length,
    critical: scans.filter((s) => s.severity === "CRITICAL").length,
    avgRisk: scans.length ? +(scans.reduce((a, s) => a + (s.risk_score || 0), 0) / scans.length).toFixed(1) : 0,
    aiScanned: scans.filter((s) => s.ai_explanation).length,
  };

  const filtered = scans.filter((s) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return [s.repo_name, s.branch, s.commit_sha, s.severity, s.action_taken].some((v) =>
      String(v || "").toLowerCase().includes(q)
    );
  });

  const trendData = scans.slice(-12).reverse().map((s, i) => ({
    i: `#${i + 1}`, risk: s.risk_score || 0,
    sev: s.severity === "CRITICAL" ? 10 : s.severity === "HIGH" ? 7 : s.severity === "MEDIUM" ? 4 : 2,
  }));

  const sevData = [
    { name: "CRIT", count: scans.filter((s) => s.severity === "CRITICAL").length, color: T.danger },
    { name: "HIGH", count: scans.filter((s) => s.severity === "HIGH").length, color: T.warning },
    { name: "MED", count: scans.filter((s) => s.severity === "MEDIUM").length, color: T.primary },
    { name: "LOW", count: scans.filter((s) => s.severity === "LOW").length, color: T.success },
  ];

  const totalReq = Math.round(pm.http_requests_total || 0);
  const avgLatMs = pm.http_request_duration_highr_seconds_count
    ? ((pm.http_request_duration_highr_seconds_sum || 0) / pm.http_request_duration_highr_seconds_count * 1000).toFixed(0)
    : "—";

  const tooltipStyle = {
    background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8,
    fontSize: 11, color: T.text, boxShadow: T.shadow,
  };

  return (
    <div style={{
      display: "flex", minHeight: "100vh", background: T.bg, color: T.text,
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    }}>
      <aside style={{
        width: 240, flexShrink: 0, background: T.surface, borderRight: `1px solid ${T.border}`,
        display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh",
      }}>
        <div style={{ padding: "24px 20px 20px", borderBottom: `1px solid ${T.borderSoft}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ background: T.primary, borderRadius: 12, padding: 10, boxShadow: "0 8px 20px rgba(37,99,235,0.25)" }}>
              <Shield size={18} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: T.text }}>SecureFlow</div>
              <div style={{ fontSize: 10, color: T.textLow, letterSpacing: "0.08em", fontWeight: 600 }}>DEVSECOPS · AI</div>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: "14px 12px" }}>
          <div style={{ fontSize: 10, color: T.textLow, fontWeight: 700, padding: "6px 10px 8px", letterSpacing: "0.1em" }}>PLATFORM</div>
          {NAV.map(({ id, label, icon: Icon, badge }) => {
            const active = tab === id;
            return (
              <button key={id} onClick={() => setTab(id)} style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%",
                padding: "10px 12px", borderRadius: 10, border: "none", cursor: "pointer",
                marginBottom: 4, textAlign: "left", fontSize: 13, fontWeight: 600,
                background: active ? T.primarySoft : "transparent",
                color: active ? T.primary : T.textMid,
                boxShadow: active ? "inset 0 0 0 1px #BFDBFE" : "none",
              }}>
                <Icon size={16} />
                <span style={{ flex: 1 }}>{label}</span>
                {badge && <Tag tone="purple">{badge}</Tag>}
                {active && <ChevronRight size={14} color={T.primary} />}
              </button>
            );
          })}
        </nav>

        <div style={{ padding: "16px", borderTop: `1px solid ${T.borderSoft}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.success }} />
            <span style={{ fontSize: 12, color: T.success, fontWeight: 700 }}>Pipeline Active</span>
          </div>
          {lastUpdated && (
            <div style={{ fontSize: 11, color: T.textLow, display: "flex", alignItems: "center", gap: 5 }}>
              <RefreshCw size={10} /> Updated {lastUpdated}
            </div>
          )}
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          position: "sticky", top: 0, zIndex: 10, background: "rgba(244,247,251,0.92)",
          backdropFilter: "blur(10px)", borderBottom: `1px solid ${T.border}`,
          padding: "16px 28px", display: "flex", justifyContent: "space-between",
          alignItems: "center", gap: 16, flexWrap: "wrap",
        }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: T.text }}>{NAV.find((n) => n.id === tab)?.label}</div>
            <div style={{ fontSize: 12, color: T.textLow, marginTop: 2 }}>abhienix / SecureFlow · main branch</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <Tag tone="primary">{stats.total} scans</Tag>
            <Tag tone={stats.blocked > 0 ? "danger" : "success"}>{stats.blocked} blocked</Tag>
            <Tag tone="purple">{stats.aiScanned} AI analyzed</Tag>
            <button onClick={fetchAll} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 12px",
              borderRadius: 10, border: `1px solid ${T.border}`, background: T.surface,
              color: T.textMid, cursor: "pointer", fontSize: 12, fontWeight: 600, boxShadow: T.shadow,
            }}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>

        {error && (
          <div style={{
            margin: "16px 28px 0", padding: "12px 16px", borderRadius: 10,
            background: T.dangerSoft, border: `1px solid ${T.dangerBorder}`, color: T.danger, fontSize: 13,
          }}>{error}</div>
        )}

        <div style={{ padding: "24px 28px" }}>
          {tab === "overview" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 20 }}>
                <StatCard icon={Activity} label="Total Scans" value={stats.total} tone="primary" />
                <StatCard icon={XCircle} label="Blocked" value={stats.blocked} tone="danger" />
                <StatCard icon={CheckCircle} label="Allowed" value={stats.allowed} tone="success" />
                <StatCard icon={AlertTriangle} label="Critical" value={stats.critical} tone="warning" />
                <StatCard icon={Cpu} label="Avg Risk" value={`${stats.avgRisk}/10`} tone="purple" />
                <StatCard icon={Zap} label="AI Analyzed" value={stats.aiScanned} tone="purple" sub="vulnerabilities explained" />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14, marginBottom: 20 }}>
                <Panel>
                  <SectionLabel>RISK SCORE TREND</SectionLabel>
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={T.primary} stopOpacity={0.25} />
                          <stop offset="95%" stopColor={T.primary} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke={T.borderSoft} strokeDasharray="3 3" />
                      <XAxis dataKey="i" stroke={T.textLow} tick={{ fontSize: 10 }} />
                      <YAxis stroke={T.textLow} tick={{ fontSize: 10 }} domain={[0, 10]} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Area type="monotone" dataKey="risk" stroke={T.primary} strokeWidth={2.5} fill="url(#riskGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </Panel>

                <Panel>
                  <SectionLabel>GATE DECISIONS</SectionLabel>
                  <ResponsiveContainer width="100%" height={130}>
                    <PieChart>
                      <Pie data={[{ name: "BLOCK", value: stats.blocked }, { name: "ALLOW", value: stats.allowed }]}
                        cx="50%" cy="50%" innerRadius={40} outerRadius={58} dataKey="value" strokeWidth={0}>
                        <Cell fill={T.danger} /><Cell fill={T.success} />
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: "flex", justifyContent: "center", gap: 16, fontSize: 12, color: T.textMid }}>
                    <span><span style={{ color: T.danger }}>●</span> BLOCK {stats.blocked}</span>
                    <span><span style={{ color: T.success }}>●</span> ALLOW {stats.allowed}</span>
                  </div>
                </Panel>

                <Panel>
                  <SectionLabel>SEVERITY DISTRIBUTION</SectionLabel>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={sevData} barSize={18}>
                      <CartesianGrid stroke={T.borderSoft} strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" stroke={T.textLow} tick={{ fontSize: 10 }} />
                      <YAxis stroke={T.textLow} tick={{ fontSize: 10 }} allowDecimals={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                        {sevData.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Panel>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 1fr) minmax(360px, 1.4fr)", gap: 14 }}>
                <Panel style={{ maxHeight: 480, overflowY: "auto" }}>
                  <SectionLabel action={
                    <div style={{ position: "relative" }}>
                      <Search size={14} color={T.textLow} style={{ position: "absolute", left: 10, top: 8 }} />
                      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search scans..."
                        style={{
                          padding: "7px 10px 7px 32px", borderRadius: 8, border: `1px solid ${T.border}`,
                          fontSize: 12, outline: "none", width: 180, background: T.bg,
                        }} />
                    </div>
                  }>SCAN HISTORY</SectionLabel>
                  {loading && <div style={{ color: T.textLow, fontSize: 13 }}>Loading scans…</div>}
                  {!loading && filtered.length === 0 && <div style={{ color: T.textLow, fontSize: 13 }}>No scans found.</div>}
                  {filtered.map((scan) => (
                    <div key={scan.id} onClick={() => setSelected(scan)} style={{
                      padding: "12px 14px", borderRadius: 10, marginBottom: 8, cursor: "pointer",
                      border: `1px solid ${selected?.id === scan.id ? T.primaryBorder : T.border}`,
                      borderLeft: `4px solid ${scan.action_taken === "BLOCK" ? T.danger : T.success}`,
                      background: selected?.id === scan.id ? T.primarySoft : T.surface,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontFamily: T.mono, fontSize: 12, color: T.primary, fontWeight: 600 }}>
                          <GitBranch size={10} style={{ marginRight: 4, verticalAlign: "middle" }} />
                          {scan.commit_sha?.slice(0, 10)}
                        </span>
                        <div style={{ display: "flex", gap: 6 }}>
                          {scan.ai_explanation && <Tag tone="purple">AI</Tag>}
                          <Tag tone={scan.action_taken === "BLOCK" ? "danger" : "success"}>{scan.action_taken}</Tag>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 10, fontSize: 11, color: T.textLow, flexWrap: "wrap" }}>
                        <span>{scan.repo_name}</span>
                        <Tag tone={scan.severity === "CRITICAL" ? "danger" : "warning"}>{scan.severity}</Tag>
                        <span>{scan.created_at ? new Date(scan.created_at).toLocaleDateString() : ""}</span>
                      </div>
                    </div>
                  ))}
                </Panel>

                <Panel style={{ maxHeight: 480, overflowY: "auto" }}>
                  {!selected ? (
                    <div style={{ minHeight: 320, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", color: T.textLow, gap: 10 }}>
                      <Eye size={36} color={T.textLow} style={{ opacity: 0.35 }} />
                      <div style={{ fontSize: 14, fontWeight: 600, color: T.textMid }}>Select a scan to inspect</div>
                      <div style={{ fontSize: 12 }}>AI analysis, fix suggestions & analyst feedback</div>
                    </div>
                  ) : (
                    <>
                      <SectionLabel action={
                        <button onClick={() => setTab("ai")} style={{
                          fontSize: 11, color: T.purple, background: T.purpleSoft, border: `1px solid ${T.purpleBorder}`,
                          borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontWeight: 700,
                        }}><Zap size={10} style={{ verticalAlign: "middle", marginRight: 4 }} />View AI Insights</button>
                      }>SCAN DETAILS</SectionLabel>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 14 }}>
                        {[
                          { label: "Commit", value: selected.commit_sha?.slice(0, 12), mono: true },
                          { label: "Branch", value: selected.branch },
                          { label: "Severity", value: selected.severity, tone: selected.severity === "CRITICAL" ? "danger" : "warning" },
                          { label: "Decision", value: selected.action_taken, tone: selected.action_taken === "BLOCK" ? "danger" : "success" },
                          { label: "Risk", value: `${selected.risk_score || 0}/10`, tone: "purple" },
                          { label: "Scanner", value: selected.scan_type?.toUpperCase() },
                        ].map((item) => (
                          <div key={item.label} style={{ background: T.bg, borderRadius: 10, padding: "10px 12px", border: `1px solid ${T.borderSoft}` }}>
                            <div style={{ fontSize: 10, color: T.textLow, marginBottom: 4 }}>{item.label}</div>
                            {item.tone ? <Tag tone={item.tone}>{item.value || "—"}</Tag> : (
                              <div style={{ fontSize: 13, fontWeight: 700, fontFamily: item.mono ? T.mono : "inherit" }}>{item.value || "—"}</div>
                            )}
                          </div>
                        ))}
                      </div>

                      {selected.ai_explanation && (
                        <div style={{ background: T.primarySoft, border: `1px solid ${T.primaryBorder}`, borderRadius: 10, padding: 14, marginBottom: 10 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: T.primary, marginBottom: 8 }}>AI ANALYSIS</div>
                          <div style={{ fontSize: 13, lineHeight: 1.7, color: T.textMid }}>{selected.ai_explanation}</div>
                        </div>
                      )}

                      {selected.ai_fix && (
                        <div style={{ background: T.successSoft, border: `1px solid ${T.successBorder}`, borderRadius: 10, padding: 14, marginBottom: 10 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: T.success, marginBottom: 8 }}>REMEDIATION</div>
                          <div style={{ fontSize: 12, lineHeight: 1.6, fontFamily: T.mono, whiteSpace: "pre-wrap" }}>{selected.ai_fix}</div>
                        </div>
                      )}

                      <div style={{ background: T.purpleSoft, border: `1px solid ${T.purpleBorder}`, borderRadius: 10, padding: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: T.purple, marginBottom: 10 }}>ANALYST FEEDBACK</div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {[
                            { type: "accept", label: "Accurate", tone: "success" },
                            { type: "reject", label: "Incorrect", tone: "danger" },
                            { type: "edit", label: "Partial", tone: "warning" },
                          ].map(({ type, label, tone }) => (
                            <button key={type} onClick={() => submitFeedback(selected.id, type)} style={{
                              padding: "7px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700,
                              border: `1px solid ${T[`${tone}Border`] || T.border}`,
                              background: feedback[selected.id] === type ? T[`${tone}Soft`] : T.surface,
                              color: T[tone],
                            }}>{label}</button>
                          ))}
                        </div>
                        {feedback[selected.id] && feedback[selected.id] !== "error" && (
                          <div style={{ fontSize: 11, color: T.textLow, marginTop: 8 }}>Feedback recorded — helps improve AI accuracy</div>
                        )}
                      </div>
                    </>
                  )}
                </Panel>
              </div>
            </>
          )}

          {tab === "ai" && (
            <>
              <Panel style={{ marginBottom: 20, background: `linear-gradient(135deg, ${T.primarySoft}, ${T.purpleSoft})` }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
                  <div style={{ maxWidth: 560 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <Zap size={20} color={T.purple} />
                      <span style={{ fontSize: 20, fontWeight: 800 }}>AI Security Intelligence</span>
                      <Tag tone="purple">POWERED BY OLLAMA</Tag>
                    </div>
                    <div style={{ fontSize: 14, color: T.textMid, lineHeight: 1.7 }}>
                      Real-time vulnerability analysis with plain-language explanations, remediation steps,
                      and risk scores — processed locally without sending code to external APIs.
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(110px, 1fr))", gap: 10 }}>
                    {[
                      { label: "AI Analyzed", value: stats.aiScanned },
                      { label: "Avg Risk", value: `${stats.avgRisk}/10` },
                      { label: "Model", value: "qwen2.5:7b" },
                      { label: "Privacy", value: "Local ✓" },
                    ].map((m) => (
                      <div key={m.label} style={{ background: T.surface, borderRadius: 10, padding: "12px 14px", border: `1px solid ${T.border}`, textAlign: "center" }}>
                        <div style={{ fontSize: 10, color: T.textLow, marginBottom: 4 }}>{m.label}</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: T.text, fontFamily: T.mono }}>{m.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </Panel>

              <SectionLabel>AI-ANALYZED VULNERABILITIES</SectionLabel>
              {loading && <div style={{ color: T.textLow }}>Loading…</div>}
              {!loading && scans.filter((s) => s.ai_explanation).length === 0 && (
                <Panel><div style={{ textAlign: "center", color: T.textLow, padding: 20 }}>No AI-analyzed scans yet.</div></Panel>
              )}
              {scans.filter((s) => s.ai_explanation).map((scan) => <AICard key={scan.id} scan={scan} />)}
            </>
          )}

          {tab === "alerts" && (
            <>
              <Panel style={{ marginBottom: 16, padding: "14px 18px" }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>Real-Time Alert Feed</div>
                <div style={{ fontSize: 12, color: T.textLow, marginTop: 4 }}>Mirrors Slack #security-alerts · auto-refreshes every 8s</div>
              </Panel>
              {scans.map((scan) => {
                const blocked = scan.action_taken === "BLOCK";
                return (
                  <Panel key={scan.id} style={{
                    marginBottom: 10, padding: 0, overflow: "hidden",
                    borderLeft: `4px solid ${blocked ? T.danger : T.success}`,
                  }}>
                    <div style={{ padding: "14px 18px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Tag tone={blocked ? "danger" : "success"}>Deployment {scan.action_taken}</Tag>
                          {scan.ai_explanation && <Tag tone="purple">AI</Tag>}
                        </div>
                        <span style={{ fontSize: 11, color: T.textLow, fontFamily: T.mono }}>
                          {scan.commit_sha?.slice(0, 10)} · {scan.created_at ? new Date(scan.created_at).toLocaleString() : ""}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: T.primary }}>{scan.repo_name}</span>
                        <span style={{ fontSize: 12, color: T.textLow }}>branch: {scan.branch}</span>
                        <Tag tone={scan.severity === "CRITICAL" ? "danger" : "warning"}>{scan.severity}</Tag>
                        {scan.risk_score > 0 && <Tag tone={scan.risk_score >= 8 ? "danger" : "warning"}>Risk {scan.risk_score}/10</Tag>}
                      </div>
                      {scan.ai_explanation && (
                        <div style={{ fontSize: 13, color: T.textMid, lineHeight: 1.6, marginBottom: 6, paddingLeft: 12, borderLeft: `3px solid ${T.primary}` }}>
                          <strong style={{ color: T.primary }}>AI: </strong>{scan.ai_explanation}
                        </div>
                      )}
                      {scan.ai_fix && <div style={{ fontSize: 12, color: T.success, fontFamily: T.mono }}>→ {scan.ai_fix}</div>}
                    </div>
                  </Panel>
                );
              })}
            </>
          )}

          {tab === "metrics" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 20 }}>
                {[
                  { label: "Total HTTP Requests", value: totalReq || "—", tone: "primary", sub: "since last restart" },
                  { label: "Avg Latency", value: avgLatMs !== "—" ? `${avgLatMs}ms` : "—", tone: "warning", sub: "mean response time" },
                  { label: "Request Samples", value: Math.round(pm.http_request_duration_highr_seconds_count || 0) || "—", tone: "purple", sub: "duration histogram count" },
                  { label: "AI Scans", value: stats.aiScanned, tone: "success", sub: "with AI explanation" },
                ].map((m) => (
                  <StatCard key={m.label} icon={BarChart2} label={m.label} value={m.value} tone={m.tone} sub={m.sub} />
                ))}
              </div>

              <Panel>
                <SectionLabel>REQUEST RATE OVER RECENT SCANS</SectionLabel>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={trendData}>
                    <CartesianGrid stroke={T.borderSoft} strokeDasharray="3 3" />
                    <XAxis dataKey="i" stroke={T.textLow} tick={{ fontSize: 10 }} />
                    <YAxis stroke={T.textLow} tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="risk" stroke={T.primary} strokeWidth={2.5} dot={false} />
                    <Line type="monotone" dataKey="sev" stroke={T.danger} strokeWidth={2} dot={false} strokeDasharray="5 3" />
                  </LineChart>
                </ResponsiveContainer>
              </Panel>

              <Panel style={{ marginTop: 14 }}>
                <SectionLabel>RAW PROMETHEUS ENDPOINT</SectionLabel>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <code style={{ fontFamily: T.mono, fontSize: 12, color: T.primary, background: T.primarySoft, padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.primaryBorder}` }}>
                    GET {API}/metrics
                  </code>
                  <a href={`${API}/metrics`} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: T.textMid, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
                    <ExternalLink size={12} /> Open
                  </a>
                </div>
              </Panel>
            </>
          )}

          {tab === "grafana" && (
            <>
              <Panel style={{ marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>Grafana Metrics Dashboard</div>
                  <div style={{ fontSize: 12, color: T.textLow, marginTop: 4 }}>Prometheus-backed charts · auto-refresh 10s</div>
                </div>
                <a href={GRAFANA} target="_blank" rel="noreferrer" style={{
                  display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.primary,
                  background: T.primarySoft, border: `1px solid ${T.primaryBorder}`, borderRadius: 10,
                  padding: "8px 14px", textDecoration: "none", fontWeight: 700,
                }}>
                  <ExternalLink size={12} /> Open Grafana
                </a>
              </Panel>
              <Panel style={{ padding: 0, overflow: "hidden" }}>
                <iframe src={`${GRAFANA}?orgId=1&refresh=10s&theme=light&kiosk=tv`} width="100%" height="620"
                  style={{ border: "none", display: "block" }} title="Grafana Dashboard" />
              </Panel>
            </>
          )}
        </div>
      </main>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        button:hover { opacity: 0.92; }
        input:focus { border-color: #2563EB !important; box-shadow: 0 0 0 3px rgba(37,99,235,0.12); }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 999px; }
      `}</style>
    </div>
  );
}