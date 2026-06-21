import { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line
} from "recharts";
import {
  Shield, AlertTriangle, CheckCircle, XCircle, Activity,
  Lock, Cpu, GitBranch, Bell, Zap, BarChart2, Layout,
  ChevronRight, ExternalLink, RefreshCw, Terminal, Eye
} from "lucide-react";

const API = "http://localhost:8000";
const GRAFANA = "http://localhost:3001";

const C = {
  bg:       "#080D1A",
  surface:  "#0D1424",
  card:     "#111827",
  cardHov:  "#141E30",
  border:   "#1E2D45",
  borderHi: "#2D4060",
  indigo:   "#6366F1",
  indigoLo: "rgba(99,102,241,0.12)",
  emerald:  "#10B981",
  red:      "#EF4444",
  amber:    "#F59E0B",
  purple:   "#8B5CF6",
  pink:     "#EC4899",
  slate:    "#94A3B8",
  text:     "#F1F5F9",
  textMid:  "#CBD5E1",
  textLow:  "#475569",
  mono:     "'JetBrains Mono', 'Fira Code', monospace",
};

const NAV = [
  { id: "overview",  label: "Overview",    icon: Layout },
  { id: "ai",        label: "AI Insights", icon: Zap,   badge: "NEW" },
  { id: "alerts",    label: "Alerts",      icon: Bell },
  { id: "metrics",   label: "Metrics",     icon: BarChart2 },
  { id: "grafana",   label: "Grafana",     icon: Activity },
];

function parsePrometheus(text) {
  const m = {};
  (text || "").split("\n").forEach(line => {
    if (line.startsWith("#") || !line.trim()) return;
    const match = line.match(/^([^\s{]+)(?:\{[^}]*\})?\s+([\d.e+\-]+)/);
    if (match) { m[match[1]] = (m[match[1]] || 0) + parseFloat(match[2]); }
  });
  return m;
}

function Tag({ children, color = C.indigo, bg }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 8px", borderRadius: 4, fontSize: 10,
      fontWeight: 700, letterSpacing: "0.08em",
      color, border: `1px solid ${color}`,
      background: bg || `${color}18`,
    }}>{children}</span>
  );
}

function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 12, padding: "18px 20px",
      borderTop: `2px solid ${color}`,
      transition: "border-color 0.2s, transform 0.2s",
      cursor: "default",
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.transform = "translateY(-2px)"; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = "translateY(0)"; }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <span style={{ fontSize: 11, color: C.slate, letterSpacing: "0.06em", fontWeight: 600 }}>
          {label.toUpperCase()}
        </span>
        <div style={{ padding: 6, borderRadius: 8, background: `${color}15` }}>
          <Icon size={14} color={color} />
        </div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.textLow, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: C.slate,
                  letterSpacing: "0.1em", marginBottom: 14 }}>
      {children}
    </div>
  );
}

function AICard({ scan }) {
  const isBlock = scan.action_taken === "BLOCK";
  const riskColor = scan.risk_score >= 8 ? C.red : scan.risk_score >= 5 ? C.amber : C.emerald;

  return (
    <div style={{
      borderRadius: 12, padding: 1,
      background: `linear-gradient(135deg, ${C.purple}, ${C.pink})`,
      marginBottom: 16,
      boxShadow: `0 0 24px rgba(139,92,246,0.2)`,
    }}>
      <div style={{
        background: C.surface, borderRadius: 11, padding: "18px 20px",
      }}>
        {/* header row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              padding: "4px 10px", borderRadius: 6, fontSize: 10, fontWeight: 800,
              letterSpacing: "0.08em",
              background: isBlock ? "rgba(239,68,68,0.12)" : "rgba(16,185,129,0.12)",
              color: isBlock ? C.red : C.emerald,
              border: `1px solid ${isBlock ? C.red : C.emerald}`,
            }}>
              {isBlock ? "🚨 BLOCKED" : "✅ ALLOWED"}
            </div>
            <span style={{ fontFamily: C.mono, fontSize: 11, color: C.slate }}>
              {scan.commit_sha?.slice(0, 12)}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              fontSize: 13, fontWeight: 800, color: riskColor,
              background: `${riskColor}15`, border: `1px solid ${riskColor}`,
              borderRadius: 6, padding: "3px 10px"
            }}>
              Risk {scan.risk_score || 0}/10
            </div>
            <Tag color={C.purple}>AI ANALYZED</Tag>
          </div>
        </div>

        {/* meta */}
        <div style={{ display: "flex", gap: 16, marginBottom: 14 }}>
          {[
            { label: "REPO", value: scan.repo_name },
            { label: "BRANCH", value: scan.branch },
            { label: "SEVERITY", value: scan.severity, color: scan.severity === "CRITICAL" ? C.red : C.amber },
            { label: "SCAN", value: scan.scan_type?.toUpperCase() },
          ].map((m, i) => (
            <div key={i}>
              <div style={{ fontSize: 9, color: C.textLow, letterSpacing: "0.1em", marginBottom: 2 }}>{m.label}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: m.color || C.textMid, fontFamily: C.mono }}>
                {m.value || "—"}
              </div>
            </div>
          ))}
        </div>

        {/* AI sections */}
        {scan.ai_explanation && (
          <div style={{
            background: "rgba(99,102,241,0.06)", borderRadius: 8, padding: "12px 14px", marginBottom: 10,
            borderLeft: `3px solid ${C.indigo}`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <Zap size={11} color={C.indigo} />
              <span style={{ fontSize: 10, fontWeight: 700, color: C.indigo, letterSpacing: "0.08em" }}>
                AI VULNERABILITY ANALYSIS
              </span>
            </div>
            <div style={{ fontSize: 13, color: C.textMid, lineHeight: 1.7 }}>{scan.ai_explanation}</div>
          </div>
        )}

        {scan.ai_fix && (
          <div style={{
            background: "rgba(16,185,129,0.06)", borderRadius: 8, padding: "12px 14px",
            borderLeft: `3px solid ${C.emerald}`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <Terminal size={11} color={C.emerald} />
              <span style={{ fontSize: 10, fontWeight: 700, color: C.emerald, letterSpacing: "0.08em" }}>
                AI SUGGESTED REMEDIATION
              </span>
            </div>
            <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6, fontFamily: C.mono }}>{scan.ai_fix}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("overview");
  const [scans, setScans] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [promRaw, setPromRaw] = useState("");
  const [feedback, setFeedback] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    fetchAll();
    const iv = setInterval(fetchAll, 8000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    const pts = Array.from({ length: 50 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
      r: Math.random() * 1.2 + 0.4,
    }));
    let id;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(99,102,241,0.35)"; ctx.fill();
      });
      pts.forEach((a, i) => pts.slice(i + 1).forEach(b => {
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 100) {
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(99,102,241,${0.12 * (1 - d / 100)})`;
          ctx.lineWidth = 0.5; ctx.stroke();
        }
      }));
      id = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(id); window.removeEventListener("resize", resize); };
  }, []);

  const fetchAll = async () => {
    try {
      const [scanRes, promRes] = await Promise.allSettled([
        axios.get(`${API}/api/scan-results`),
        axios.get(`${API}/metrics`),
      ]);
      if (scanRes.status === "fulfilled") { setScans(scanRes.value.data); setLoading(false); }
      if (promRes.status === "fulfilled") setPromRaw(promRes.value.data);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch { setLoading(false); }
  };

  const submitFeedback = async (scanId, type) => {
    try {
      await axios.post(`${API}/api/scan-results/${scanId}/feedback`, { feedback: type });
      setFeedback(p => ({ ...p, [scanId]: type }));
    } catch {}
  };

  const pm = parsePrometheus(promRaw);

  const stats = {
    total:    scans.length,
    blocked:  scans.filter(s => s.action_taken === "BLOCK").length,
    allowed:  scans.filter(s => s.action_taken === "ALLOW").length,
    critical: scans.filter(s => s.severity === "CRITICAL").length,
    avgRisk:  scans.length ? +(scans.reduce((a, s) => a + (s.risk_score || 0), 0) / scans.length).toFixed(1) : 0,
    aiScanned: scans.filter(s => s.ai_explanation).length,
  };

  const trendData = scans.slice(-12).reverse().map((s, i) => ({
    i: `#${i + 1}`, risk: s.risk_score || 0,
    sev: s.severity === "CRITICAL" ? 10 : s.severity === "HIGH" ? 7 : s.severity === "MEDIUM" ? 4 : 2,
  }));

  const sevData = [
    { name: "CRIT", count: scans.filter(s => s.severity === "CRITICAL").length, color: C.red },
    { name: "HIGH", count: scans.filter(s => s.severity === "HIGH").length, color: C.amber },
    { name: "MED",  count: scans.filter(s => s.severity === "MEDIUM").length, color: C.indigo },
    { name: "LOW",  count: scans.filter(s => s.severity === "LOW").length, color: C.emerald },
  ];

  const totalReq = Math.round(pm["http_requests_total"] || 0);
  const avgLatMs = pm["http_request_duration_highr_seconds_count"]
    ? ((pm["http_request_duration_highr_seconds_sum"] || 0) / pm["http_request_duration_highr_seconds_count"] * 1000).toFixed(0)
    : "—";

  const tooltipStyle = {
    background: C.surface, border: `1px solid ${C.border}`,
    borderRadius: 8, fontSize: 11, color: C.text,
  };

  // ── RENDER ────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", height: "100vh", background: C.bg, color: C.text,
                  fontFamily: "'Inter', 'Segoe UI', sans-serif", overflow: "hidden" }}>

      {/* particle canvas */}
      <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, zIndex: 0, opacity: 0.5, pointerEvents: "none" }} />

      {/* ── SIDEBAR ── */}
      <aside style={{
        width: 220, flexShrink: 0, background: C.surface,
        borderRight: `1px solid ${C.border}`, display: "flex",
        flexDirection: "column", zIndex: 10, position: "relative",
      }}>
        {/* logo */}
        <div style={{ padding: "22px 20px 18px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
              borderRadius: 8, padding: 7, display: "flex",
            }}>
              <Shield size={16} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: "0.04em" }}>
                Secure<span style={{ color: C.indigo }}>Flow</span>
              </div>
              <div style={{ fontSize: 9, color: C.textLow, letterSpacing: "0.1em" }}>DEVSECOPS · AI</div>
            </div>
          </div>
        </div>

        {/* nav */}
        <nav style={{ flex: 1, padding: "12px 10px" }}>
          <div style={{ fontSize: 9, color: C.textLow, letterSpacing: "0.12em",
                        padding: "8px 10px 6px", fontWeight: 700 }}>PLATFORM</div>
          {NAV.map(({ id, label, icon: Icon, badge }) => {
            const active = tab === id;
            return (
              <button key={id} onClick={() => setTab(id)} style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%",
                padding: "9px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                marginBottom: 2, textAlign: "left", fontSize: 13, fontWeight: 500,
                background: active ? C.indigoLo : "transparent",
                color: active ? C.indigo : C.slate,
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}>
                <Icon size={15} />
                <span style={{ flex: 1 }}>{label}</span>
                {badge && (
                  <span style={{
                    fontSize: 8, fontWeight: 800, padding: "1px 5px", borderRadius: 3,
                    background: "linear-gradient(90deg, #8B5CF6, #EC4899)",
                    color: "#fff", letterSpacing: "0.06em",
                  }}>{badge}</span>
                )}
                {active && <ChevronRight size={12} color={C.indigo} />}
              </button>
            );
          })}
        </nav>

        {/* status footer */}
        <div style={{ padding: "14px 16px", borderTop: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.emerald,
                          boxShadow: `0 0 6px ${C.emerald}` }} />
            <span style={{ fontSize: 11, color: C.emerald, fontWeight: 600 }}>Pipeline Active</span>
          </div>
          {lastUpdated && (
            <div style={{ fontSize: 10, color: C.textLow, display: "flex", alignItems: "center", gap: 4 }}>
              <RefreshCw size={9} /> Updated {lastUpdated}
            </div>
          )}
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main style={{ flex: 1, overflowY: "auto", position: "relative", zIndex: 1 }}>

        {/* top bar */}
        <div style={{
          position: "sticky", top: 0, zIndex: 20,
          background: `${C.bg}ee`, backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${C.border}`,
          padding: "14px 28px", display: "flex",
          justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>
              {NAV.find(n => n.id === tab)?.label}
            </div>
            <div style={{ fontSize: 11, color: C.textLow, marginTop: 1 }}>
              abhienix / SecureFlow · main branch
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Tag color={C.emerald}>{stats.total} scans</Tag>
            <Tag color={stats.blocked > 0 ? C.red : C.emerald}>
              {stats.blocked} blocked
            </Tag>
            <div style={{
              display: "flex", alignItems: "center", gap: 6, fontSize: 11,
              color: C.purple, background: "rgba(139,92,246,0.1)",
              border: `1px solid rgba(139,92,246,0.3)`,
              borderRadius: 6, padding: "4px 10px", fontWeight: 600,
            }}>
              <Zap size={11} />
              {stats.aiScanned} AI analyzed
            </div>
          </div>
        </div>

        <div style={{ padding: "24px 28px" }}>

          {/* ══ OVERVIEW TAB ══ */}
          {tab === "overview" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12, marginBottom: 20 }}>
                <StatCard icon={Activity}      label="Total Scans"  value={stats.total}    color={C.indigo} />
                <StatCard icon={XCircle}       label="Blocked"      value={stats.blocked}  color={C.red} />
                <StatCard icon={CheckCircle}   label="Allowed"      value={stats.allowed}  color={C.emerald} />
                <StatCard icon={AlertTriangle} label="Critical"     value={stats.critical} color={C.amber} />
                <StatCard icon={Cpu}           label="Avg Risk"     value={`${stats.avgRisk}/10`} color={C.purple} />
                <StatCard icon={Zap}           label="AI Analyzed"  value={stats.aiScanned} color={C.pink}
                          sub="vulnerabilities explained" />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 14, marginBottom: 20 }}>
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18 }}>
                  <SectionLabel>RISK SCORE TREND</SectionLabel>
                  <ResponsiveContainer width="100%" height={150}>
                    <AreaChart data={trendData}>
                      <defs>
                        <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={C.indigo} stopOpacity={0.35}/>
                          <stop offset="95%" stopColor={C.indigo} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="i" stroke={C.textLow} tick={{ fontSize: 10 }}/>
                      <YAxis stroke={C.textLow} tick={{ fontSize: 10 }} domain={[0, 10]}/>
                      <Tooltip contentStyle={tooltipStyle}/>
                      <Area type="monotone" dataKey="risk" stroke={C.indigo} strokeWidth={2} fill="url(#rg)"/>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18 }}>
                  <SectionLabel>GATE DECISIONS</SectionLabel>
                  <ResponsiveContainer width="100%" height={130}>
                    <PieChart>
                      <Pie data={[{ name: "BLOCK", value: stats.blocked }, { name: "ALLOW", value: stats.allowed }]}
                           cx="50%" cy="50%" innerRadius={38} outerRadius={56} dataKey="value" strokeWidth={0}>
                        <Cell fill={C.red}/><Cell fill={C.emerald}/>
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle}/>
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: "flex", justifyContent: "center", gap: 14, fontSize: 11 }}>
                    <span style={{ color: C.red }}>● BLOCK {stats.blocked}</span>
                    <span style={{ color: C.emerald }}>● ALLOW {stats.allowed}</span>
                  </div>
                </div>

                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18 }}>
                  <SectionLabel>SEVERITY DISTRIBUTION</SectionLabel>
                  <ResponsiveContainer width="100%" height={150}>
                    <BarChart data={sevData} barSize={14}>
                      <XAxis dataKey="name" stroke={C.textLow} tick={{ fontSize: 9 }}/>
                      <YAxis stroke={C.textLow} tick={{ fontSize: 9 }}/>
                      <Tooltip contentStyle={tooltipStyle}/>
                      <Bar dataKey="count" radius={[4,4,0,0]}>
                        {sevData.map((d, i) => <Cell key={i} fill={d.color}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* scan list + detail */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 14 }}>
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
                              padding: 18, maxHeight: 440, overflowY: "auto" }}>
                  <SectionLabel>SCAN HISTORY</SectionLabel>
                  {loading && <div style={{ color: C.textLow, fontSize: 13 }}>Loading scans…</div>}
                  {scans.map(scan => (
                    <div key={scan.id} onClick={() => setSelected(scan)} style={{
                      padding: "10px 12px", borderRadius: 8, marginBottom: 6,
                      cursor: "pointer", border: `1px solid ${C.border}`,
                      borderLeft: `3px solid ${scan.action_taken === "BLOCK" ? C.red : C.emerald}`,
                      background: selected?.id === scan.id ? "rgba(99,102,241,0.08)" : "transparent",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(99,102,241,0.05)"}
                    onMouseLeave={e => e.currentTarget.style.background = selected?.id === scan.id ? "rgba(99,102,241,0.08)" : "transparent"}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontFamily: C.mono, fontSize: 11, color: C.indigo }}>
                          <GitBranch size={9} style={{ marginRight: 4, verticalAlign: "middle" }}/>
                          {scan.commit_sha?.slice(0, 10)}
                        </span>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          {scan.ai_explanation && <Tag color={C.purple}>AI</Tag>}
                          <Tag color={scan.action_taken === "BLOCK" ? C.red : C.emerald}>
                            {scan.action_taken}
                          </Tag>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 10, fontSize: 11, color: C.textLow }}>
                        <span>{scan.repo_name}</span>
                        <span style={{ color: scan.severity === "CRITICAL" ? C.red : C.amber }}>{scan.severity}</span>
                        <span>{scan.created_at ? new Date(scan.created_at).toLocaleDateString() : ""}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
                              padding: 18, maxHeight: 440, overflowY: "auto" }}>
                  {!selected ? (
                    <div style={{ height: "100%", minHeight: 300, display: "flex", flexDirection: "column",
                                  justifyContent: "center", alignItems: "center", color: C.textLow, gap: 10 }}>
                      <Eye size={32} style={{ opacity: 0.2 }}/>
                      <div style={{ fontSize: 13 }}>Select a scan to inspect</div>
                      <div style={{ fontSize: 11, color: C.textLow }}>AI analysis, fix suggestions & more</div>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                        <SectionLabel>SCAN DETAILS</SectionLabel>
                        <button onClick={() => setTab("ai")} style={{
                          fontSize: 11, color: C.purple, background: "rgba(139,92,246,0.1)",
                          border: `1px solid rgba(139,92,246,0.3)`, borderRadius: 6,
                          padding: "4px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
                        }}>
                          <Zap size={10}/> View AI Insights
                        </button>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
                        {[
                          { label: "Commit SHA", value: selected.commit_sha?.slice(0, 12), mono: true },
                          { label: "Branch", value: selected.branch },
                          { label: "Severity", value: selected.severity, color: selected.severity === "CRITICAL" ? C.red : C.amber },
                          { label: "Decision", value: selected.action_taken, color: selected.action_taken === "BLOCK" ? C.red : C.emerald },
                          { label: "AI Risk Score", value: `${selected.risk_score || 0}/10`, color: C.purple },
                          { label: "Scanner", value: selected.scan_type?.toUpperCase() },
                        ].map((item, i) => (
                          <div key={i} style={{ background: C.surface, borderRadius: 8, padding: "10px 12px",
                                                border: `1px solid ${C.border}` }}>
                            <div style={{ fontSize: 10, color: C.textLow, marginBottom: 3, letterSpacing: "0.08em" }}>
                              {item.label.toUpperCase()}
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: item.color || C.text,
                                          fontFamily: item.mono ? C.mono : "inherit" }}>
                              {item.value || "—"}
                            </div>
                          </div>
                        ))}
                      </div>

                      {selected.ai_explanation && (
                        <div style={{ background: "rgba(99,102,241,0.06)", border: `1px solid rgba(99,102,241,0.2)`,
                                      borderRadius: 8, padding: 14, marginBottom: 10 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                            <Zap size={11} color={C.indigo}/>
                            <span style={{ fontSize: 10, fontWeight: 700, color: C.indigo, letterSpacing: "0.08em" }}>
                              AI ANALYSIS
                            </span>
                          </div>
                          <div style={{ fontSize: 12, lineHeight: 1.7, color: C.textMid }}>{selected.ai_explanation}</div>
                        </div>
                      )}

                      {selected.ai_fix && (
                        <div style={{ background: "rgba(16,185,129,0.06)", border: `1px solid rgba(16,185,129,0.2)`,
                                      borderRadius: 8, padding: 14, marginBottom: 10 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                            <Terminal size={11} color={C.emerald}/>
                            <span style={{ fontSize: 10, fontWeight: 700, color: C.emerald, letterSpacing: "0.08em" }}>
                              REMEDIATION
                            </span>
                          </div>
                          <div style={{ fontSize: 12, lineHeight: 1.6, color: C.text, fontFamily: C.mono }}>
                            {selected.ai_fix}
                          </div>
                        </div>
                      )}

                      <div style={{ background: "rgba(139,92,246,0.06)", border: `1px solid rgba(139,92,246,0.2)`,
                                    borderRadius: 8, padding: 14 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: C.purple, letterSpacing: "0.08em", marginBottom: 10 }}>
                          ANALYST FEEDBACK
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          {[
                            { type: "accept", label: "✓ Accurate", color: C.emerald },
                            { type: "reject", label: "✗ Incorrect", color: C.red },
                            { type: "edit",   label: "~ Partial",   color: C.amber },
                          ].map(({ type, label, color }) => (
                            <button key={type} onClick={() => submitFeedback(selected.id, type)} style={{
                              padding: "6px 14px", borderRadius: 6, border: `1px solid ${color}`,
                              background: feedback[selected.id] === type ? `${color}20` : "transparent",
                              color, cursor: "pointer", fontSize: 11, fontWeight: 600,
                            }}>{label}</button>
                          ))}
                        </div>
                        {feedback[selected.id] && (
                          <div style={{ fontSize: 11, color: C.textLow, marginTop: 8 }}>
                            Feedback recorded — helps improve AI accuracy
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ══ AI INSIGHTS TAB ══ */}
          {tab === "ai" && (
            <>
              {/* AI hero banner */}
              <div style={{
                borderRadius: 14, padding: 1, marginBottom: 20,
                background: "linear-gradient(135deg, #6366F1, #8B5CF6, #EC4899)",
              }}>
                <div style={{
                  background: C.surface, borderRadius: 13, padding: "22px 28px",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <Zap size={18} color={C.purple}/>
                      <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: "0.02em" }}>
                        AI Security Intelligence
                      </span>
                      <Tag color={C.pink}>POWERED BY OLLAMA</Tag>
                    </div>
                    <div style={{ fontSize: 13, color: C.slate, maxWidth: 520, lineHeight: 1.6 }}>
                      Every vulnerability is analyzed in real time using a local LLM — producing plain-language
                      explanations, precise remediation steps, and calibrated risk scores without sending
                      your code to external APIs.
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, flexShrink: 0 }}>
                    {[
                      { label: "AI Analyzed", value: stats.aiScanned, color: C.purple },
                      { label: "Avg Risk",    value: `${stats.avgRisk}/10`, color: C.red },
                      { label: "Model",       value: "qwen2.5:7b", color: C.indigo },
                      { label: "Local LLM",   value: "✓ Private", color: C.emerald },
                    ].map((m, i) => (
                      <div key={i} style={{ background: C.card, borderRadius: 8, padding: "10px 14px",
                                            border: `1px solid ${C.border}`, textAlign: "center" }}>
                        <div style={{ fontSize: 10, color: C.textLow, marginBottom: 4 }}>{m.label}</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: m.color, fontFamily: C.mono }}>
                          {m.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* AI cards */}
              <SectionLabel>AI-ANALYZED VULNERABILITIES — ALL SCANS</SectionLabel>
              {loading && <div style={{ color: C.textLow, fontSize: 13 }}>Loading…</div>}
              {scans.filter(s => s.ai_explanation).length === 0 && !loading && (
                <div style={{ color: C.textLow, fontSize: 13, padding: 20, textAlign: "center",
                              background: C.card, borderRadius: 12, border: `1px solid ${C.border}` }}>
                  No AI-analyzed scans yet. Send a scan payload to see AI insights here.
                </div>
              )}
              {scans.filter(s => s.ai_explanation).map(scan => (
                <AICard key={scan.id} scan={scan} />
              ))}
            </>
          )}

          {/* ══ ALERTS TAB ══ */}
          {tab === "alerts" && (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>Real-Time Alert Feed</div>
                  <div style={{ fontSize: 12, color: C.textLow }}>
                    Mirrors your Slack #security-alerts channel — same data, one place
                  </div>
                </div>
                <Tag color={C.emerald}>Auto-refreshes every 8s</Tag>
              </div>

              {scans.map(scan => {
                const isBlock = scan.action_taken === "BLOCK";
                return (
                  <div key={scan.id} style={{
                    background: C.card, border: `1px solid ${C.border}`,
                    borderLeft: `4px solid ${isBlock ? C.red : C.emerald}`,
                    borderRadius: 10, padding: "14px 18px", marginBottom: 10,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 16 }}>{isBlock ? "🚨" : "✅"}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: isBlock ? C.red : C.emerald }}>
                          Deployment {scan.action_taken}
                        </span>
                        {scan.ai_explanation && <Tag color={C.purple}>AI</Tag>}
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ fontSize: 11, fontFamily: C.mono, color: C.textLow }}>
                          {scan.commit_sha?.slice(0, 10)}
                        </span>
                        <span style={{ fontSize: 10, color: C.textLow }}>
                          {scan.created_at ? new Date(scan.created_at).toLocaleString() : ""}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 16, marginBottom: 10 }}>
                      <span style={{ fontSize: 12, color: C.indigo }}>{scan.repo_name}</span>
                      <span style={{ fontSize: 12, color: C.textLow }}>branch: {scan.branch}</span>
                      <Tag color={scan.severity === "CRITICAL" ? C.red : C.amber}>{scan.severity}</Tag>
                      {scan.risk_score && (
                        <Tag color={scan.risk_score >= 8 ? C.red : C.amber}>
                          Risk {scan.risk_score}/10
                        </Tag>
                      )}
                    </div>

                    {scan.ai_explanation && (
                      <div style={{ fontSize: 12, color: C.textMid, lineHeight: 1.6, marginBottom: 6,
                                    paddingLeft: 12, borderLeft: `2px solid ${C.indigo}` }}>
                        <span style={{ color: C.indigo, fontWeight: 600 }}>AI: </span>
                        {scan.ai_explanation}
                      </div>
                    )}
                    {scan.ai_fix && (
                      <div style={{ fontSize: 11, color: C.emerald, fontFamily: C.mono }}>
                        → {scan.ai_fix}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}

          {/* ══ METRICS TAB ══ */}
          {tab === "metrics" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
                {[
                  { label: "Total HTTP Requests", value: totalReq || "—", color: C.indigo, sub: "since last restart" },
                  { label: "Avg Latency",          value: avgLatMs !== "—" ? `${avgLatMs}ms` : "—", color: C.amber, sub: "mean response time" },
                  { label: "Scan API Calls",       value: Math.round(pm["http_requests_total"] || 0) || "—", color: C.purple, sub: "POST /api/scan-results" },
                  { label: "Metrics Scrapes",      value: Math.round(pm["http_request_duration_highr_seconds_count"] || 0) || "—", color: C.emerald, sub: "by Prometheus" },
                ].map((m, i) => (
                  <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`,
                                        borderRadius: 12, padding: "18px 20px", borderTop: `2px solid ${m.color}` }}>
                    <div style={{ fontSize: 10, color: C.slate, letterSpacing: "0.06em", fontWeight: 600, marginBottom: 10 }}>
                      {m.label.toUpperCase()}
                    </div>
                    <div style={{ fontSize: 30, fontWeight: 800, color: m.color }}>{m.value}</div>
                    <div style={{ fontSize: 11, color: C.textLow, marginTop: 4 }}>{m.sub}</div>
                  </div>
                ))}
              </div>

              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18 }}>
                <SectionLabel>REQUEST RATE OVER RECENT SCANS</SectionLabel>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={trendData}>
                    <XAxis dataKey="i" stroke={C.textLow} tick={{ fontSize: 10 }}/>
                    <YAxis stroke={C.textLow} tick={{ fontSize: 10 }}/>
                    <Tooltip contentStyle={tooltipStyle}/>
                    <Line type="monotone" dataKey="risk" stroke={C.indigo} strokeWidth={2} dot={false}/>
                    <Line type="monotone" dataKey="sev"  stroke={C.red}    strokeWidth={2} dot={false} strokeDasharray="4 2"/>
                  </LineChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", gap: 16, fontSize: 11, marginTop: 8, justifyContent: "center" }}>
                  <span style={{ color: C.indigo }}>─ AI Risk Score</span>
                  <span style={{ color: C.red }}>-- Severity Level</span>
                </div>
              </div>

              <div style={{ marginTop: 14, background: C.card, border: `1px solid ${C.border}`,
                            borderRadius: 12, padding: 18 }}>
                <SectionLabel>RAW PROMETHEUS ENDPOINT</SectionLabel>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <code style={{ fontFamily: C.mono, fontSize: 12, color: C.indigo,
                                  background: C.surface, padding: "6px 12px", borderRadius: 6,
                                  border: `1px solid ${C.border}` }}>
                    GET {API}/metrics
                  </code>
                  <a href={`${API}/metrics`} target="_blank" rel="noreferrer" style={{
                    fontSize: 11, color: C.slate, display: "flex", alignItems: "center", gap: 4,
                    textDecoration: "none",
                  }}>
                    <ExternalLink size={11}/> Open
                  </a>
                </div>
                <div style={{ fontSize: 11, color: C.textLow, marginTop: 8 }}>
                  Prometheus scrapes this endpoint every 15s · Grafana reads from Prometheus
                </div>
              </div>
            </>
          )}

          {/* ══ GRAFANA TAB ══ */}
          {tab === "grafana" && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>Grafana Metrics Dashboard</div>
                  <div style={{ fontSize: 12, color: C.textLow }}>
                    Live charts powered by Prometheus · auto-refreshes every 10s
                  </div>
                </div>
                <a href={GRAFANA} target="_blank" rel="noreferrer" style={{
                  display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: C.indigo,
                  background: C.indigoLo, border: `1px solid ${C.indigo}`, borderRadius: 8,
                  padding: "7px 14px", textDecoration: "none", fontWeight: 600,
                }}>
                  <ExternalLink size={12}/> Open Grafana
                </a>
              </div>

              <div style={{ background: C.card, border: `1px solid ${C.border}`,
                            borderRadius: 12, overflow: "hidden" }}>
                <iframe
                  src={`${GRAFANA}?orgId=1&refresh=10s&theme=dark&kiosk=tv`}
                  width="100%" height="600"
                  style={{ border: "none", display: "block" }}
                  title="Grafana Dashboard"
                />
              </div>

              <div style={{ marginTop: 12, fontSize: 11, color: C.textLow, textAlign: "center" }}>
                If you see a login screen, ensure <code style={{ fontFamily: C.mono }}>GF_AUTH_ANONYMOUS_ENABLED=true</code> is
                set in your docker-compose.yml · currently configured in your setup ✓
              </div>
            </>
          )}

        </div>
      </main>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
      `}</style>
    </div>
  );
}
