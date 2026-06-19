import { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer
} from "recharts";
import { Shield, AlertTriangle, CheckCircle, XCircle,
         Activity, Lock, Cpu, GitBranch } from "lucide-react";

const API = "http://localhost:8000";

const COLORS = {
  bg: "#030712",
  surface: "#0d1117",
  card: "#111827",
  border: "#1f2937",
  cyan: "#06b6d4",
  red: "#ef4444",
  green: "#22c55e",
  yellow: "#f59e0b",
  purple: "#a855f7",
  text: "#f9fafb",
  muted: "#6b7280",
};

export default function App() {
  const [scans, setScans] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pulse, setPulse] = useState(false);
  const [feedback, setFeedback] = useState({});
  const canvasRef = useRef(null);

  useEffect(() => {
    fetchScans();
    const interval = setInterval(() => {
      fetchScans();
      setPulse(p => !p);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.5,
    }));

    let animId;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(6,182,212,0.4)";
        ctx.fill();
      });
      particles.forEach((a, i) => {
        particles.slice(i + 1).forEach(b => {
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 120) {
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(6,182,212,${0.15 * (1 - d / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animId);
  }, []);

  const fetchScans = async () => {
    try {
      const res = await axios.get(`${API}/api/scan-results`);
      setScans(res.data);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  };

  const submitFeedback = async (scanId, type) => {
    try {
      await axios.post(`${API}/api/scan-results/${scanId}/feedback`, {
        feedback: type
      });
      setFeedback(prev => ({ ...prev, [scanId]: type }));
    } catch (err) {
      console.error("feedback error:", err);
    }
  };

  const stats = {
    total: scans.length,
    blocked: scans.filter(s => s.action_taken === "BLOCK").length,
    allowed: scans.filter(s => s.action_taken === "ALLOW").length,
    critical: scans.filter(s => s.severity === "CRITICAL").length,
    avgRisk: scans.length
      ? Math.round(scans.reduce((a, s) => a + (s.risk_score || 0), 0) / scans.length)
      : 0,
    acceptRate: scans.length
      ? Math.round(Object.values(feedback).filter(f => f === "accept").length / scans.length * 100)
      : 0,
  };

  const pieData = [
    { name: "BLOCK", value: stats.blocked },
    { name: "ALLOW", value: stats.allowed },
  ];

  const trendData = scans.slice(-10).reverse().map((s, i) => ({
    name: `#${i + 1}`,
    risk: s.risk_score || 0,
    severity: s.severity === "CRITICAL" ? 10 : s.severity === "HIGH" ? 7 : 4,
  }));

  const severityData = [
    { name: "CRITICAL", count: scans.filter(s => s.severity === "CRITICAL").length },
    { name: "HIGH", count: scans.filter(s => s.severity === "HIGH").length },
    { name: "MEDIUM", count: scans.filter(s => s.severity === "MEDIUM").length },
    { name: "LOW", count: scans.filter(s => s.severity === "LOW").length },
  ];

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, color: COLORS.text,
                  fontFamily: "'Segoe UI', monospace", position: "relative", overflow: "hidden" }}>

      <canvas ref={canvasRef} style={{ position: "fixed", top: 0, left: 0,
                                        zIndex: 0, opacity: 0.6 }} />

      <div style={{ position: "relative", zIndex: 1, padding: "20px 28px" }}>

        {/* HEADER */}
        <div style={{ display: "flex", justifyContent: "space-between",
                      alignItems: "center", marginBottom: 24,
                      borderBottom: `1px solid ${COLORS.border}`, paddingBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ background: "linear-gradient(135deg, #06b6d4, #a855f7)",
                          borderRadius: 10, padding: 8, display: "flex" }}>
              <Shield size={22} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 1 }}>
                SECURE<span style={{ color: COLORS.cyan }}>FLOW</span>
              </div>
              <div style={{ fontSize: 11, color: COLORS.muted, letterSpacing: 2 }}>
                AI-POWERED SECURITY GATE FOR CI/CD
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8,
                        background: COLORS.card, border: `1px solid ${COLORS.border}`,
                        borderRadius: 20, padding: "6px 14px", fontSize: 12 }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%",
                          background: COLORS.green,
                          boxShadow: `0 0 8px ${COLORS.green}` }} />
            LIVE MONITORING
          </div>
        </div>

        {/* STAT CARDS */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)",
                      gap: 12, marginBottom: 20 }}>
          {[
            { icon: <Activity size={16}/>, label: "Total Scans", value: stats.total, color: COLORS.cyan },
            { icon: <XCircle size={16}/>, label: "Blocked", value: stats.blocked, color: COLORS.red },
            { icon: <CheckCircle size={16}/>, label: "Allowed", value: stats.allowed, color: COLORS.green },
            { icon: <AlertTriangle size={16}/>, label: "Critical CVEs", value: stats.critical, color: COLORS.yellow },
            { icon: <Cpu size={16}/>, label: "Avg Risk Score", value: `${stats.avgRisk}/10`, color: COLORS.purple },
            { icon: <CheckCircle size={16}/>, label: "AI Accept Rate", value: `${stats.acceptRate}%`, color: COLORS.cyan },
          ].map((s, i) => (
            <div key={i} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`,
                                  borderRadius: 10, padding: "14px 16px",
                                  borderTop: `2px solid ${s.color}`,
                                  transition: "transform 0.2s" }}
                 onMouseEnter={e => e.currentTarget.style.transform = "translateY(-3px)"}
                 onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}>
              <div style={{ display: "flex", justifyContent: "space-between",
                            alignItems: "center", marginBottom: 8 }}>
                <span style={{ color: COLORS.muted, fontSize: 10, letterSpacing: 1 }}>
                  {s.label.toUpperCase()}
                </span>
                <span style={{ color: s.color }}>{s.icon}</span>
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, color: s.color,
                            textShadow: `0 0 20px ${s.color}40` }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* CHARTS ROW */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr",
                      gap: 12, marginBottom: 20 }}>

          <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`,
                        borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 12, color: COLORS.muted, letterSpacing: 1,
                          marginBottom: 12 }}>RISK TREND — LAST 10 SCANS</div>
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.cyan} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={COLORS.cyan} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke={COLORS.muted} tick={{ fontSize: 10 }}/>
                <YAxis stroke={COLORS.muted} tick={{ fontSize: 10 }} domain={[0, 10]}/>
                <Tooltip contentStyle={{ background: COLORS.surface,
                                         border: `1px solid ${COLORS.border}`,
                                         borderRadius: 6, fontSize: 11 }}/>
                <Area type="monotone" dataKey="risk" stroke={COLORS.cyan}
                      strokeWidth={2} fill="url(#riskGrad)"/>
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`,
                        borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 12, color: COLORS.muted, letterSpacing: 1,
                          marginBottom: 12 }}>BLOCK vs ALLOW</div>
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={35}
                     outerRadius={55} dataKey="value" strokeWidth={0}>
                  <Cell fill={COLORS.red}/>
                  <Cell fill={COLORS.green}/>
                </Pie>
                <Tooltip contentStyle={{ background: COLORS.surface,
                                         border: `1px solid ${COLORS.border}`,
                                         fontSize: 11 }}/>
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", justifyContent: "center", gap: 16, fontSize: 11 }}>
              <span style={{ color: COLORS.red }}>● BLOCK {stats.blocked}</span>
              <span style={{ color: COLORS.green }}>● ALLOW {stats.allowed}</span>
            </div>
          </div>

          <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`,
                        borderRadius: 10, padding: 16 }}>
            <div style={{ fontSize: 12, color: COLORS.muted, letterSpacing: 1,
                          marginBottom: 12 }}>SEVERITY BREAKDOWN</div>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={severityData} barSize={16}>
                <XAxis dataKey="name" stroke={COLORS.muted} tick={{ fontSize: 9 }}/>
                <YAxis stroke={COLORS.muted} tick={{ fontSize: 9 }}/>
                <Tooltip contentStyle={{ background: COLORS.surface,
                                         border: `1px solid ${COLORS.border}`,
                                         fontSize: 11 }}/>
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {severityData.map((_, i) => (
                    <Cell key={i} fill={
                      i === 0 ? COLORS.red : i === 1 ? COLORS.yellow :
                      i === 2 ? COLORS.cyan : COLORS.green}/>
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* MAIN */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 12 }}>

          {/* scan list */}
          <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`,
                        borderRadius: 10, padding: 16, maxHeight: 420, overflowY: "auto" }}>
            <div style={{ fontSize: 12, color: COLORS.muted, letterSpacing: 1,
                          marginBottom: 12 }}>SCAN HISTORY</div>
            {loading && <div style={{ color: COLORS.muted }}>Loading...</div>}
            {scans.map(scan => (
              <div key={scan.id}
                   onClick={() => setSelected(scan)}
                   style={{ padding: "10px 12px", borderRadius: 7, marginBottom: 6,
                            cursor: "pointer", border: `1px solid ${COLORS.border}`,
                            borderLeft: `3px solid ${scan.action_taken === "BLOCK" ? COLORS.red : COLORS.green}`,
                            background: selected?.id === scan.id
                              ? "rgba(6,182,212,0.08)" : "transparent",
                            transition: "all 0.15s" }}
                   onMouseEnter={e => e.currentTarget.style.background = "rgba(6,182,212,0.05)"}
                   onMouseLeave={e => e.currentTarget.style.background =
                     selected?.id === scan.id ? "rgba(6,182,212,0.08)" : "transparent"}>
                <div style={{ display: "flex", justifyContent: "space-between",
                              alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontFamily: "monospace", fontSize: 12, color: COLORS.cyan }}>
                    <GitBranch size={10} style={{ marginRight: 4 }}/>
                    {scan.commit_sha?.slice(0, 10) || "unknown"}
                  </span>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {feedback[scan.id] && (
                      <span style={{ fontSize: 9, color: COLORS.muted }}>
                        {feedback[scan.id] === "accept" ? "✓" :
                         feedback[scan.id] === "reject" ? "✗" : "✎"}
                      </span>
                    )}
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px",
                                   borderRadius: 4,
                                   background: scan.action_taken === "BLOCK"
                                     ? "rgba(239,68,68,0.15)" : "rgba(34,197,94,0.15)",
                                   color: scan.action_taken === "BLOCK" ? COLORS.red : COLORS.green,
                                   border: `1px solid ${scan.action_taken === "BLOCK" ? COLORS.red : COLORS.green}` }}>
                      {scan.action_taken}
                    </span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, fontSize: 11, color: COLORS.muted }}>
                  <span>{scan.repo_name}</span>
                  <span style={{ color: scan.severity === "CRITICAL" ? COLORS.red : COLORS.yellow }}>
                    {scan.severity}
                  </span>
                  <span>{scan.created_at ? new Date(scan.created_at).toLocaleDateString() : ""}</span>
                </div>
              </div>
            ))}
          </div>

          {/* detail panel */}
          <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`,
                        borderRadius: 10, padding: 16, maxHeight: 420, overflowY: "auto" }}>
            {!selected ? (
              <div style={{ height: "100%", display: "flex", flexDirection: "column",
                            justifyContent: "center", alignItems: "center", color: COLORS.muted }}>
                <Lock size={32} style={{ marginBottom: 12, opacity: 0.3 }}/>
                <div style={{ fontSize: 13 }}>Select a scan to view details</div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 12, color: COLORS.muted, letterSpacing: 1,
                              marginBottom: 14 }}>SCAN DETAILS</div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr",
                              gap: 8, marginBottom: 14 }}>
                  {[
                    { label: "Commit", value: selected.commit_sha?.slice(0, 12) },
                    { label: "Branch", value: selected.branch },
                    { label: "Severity", value: selected.severity,
                      color: selected.severity === "CRITICAL" ? COLORS.red : COLORS.yellow },
                    { label: "Action", value: selected.action_taken,
                      color: selected.action_taken === "BLOCK" ? COLORS.red : COLORS.green },
                    { label: "Risk Score", value: `${selected.risk_score || 0}/10`,
                      color: COLORS.purple },
                    { label: "Scan Type", value: selected.scan_type },
                  ].map((item, i) => (
                    <div key={i} style={{ background: COLORS.surface, borderRadius: 6,
                                          padding: "8px 10px",
                                          border: `1px solid ${COLORS.border}` }}>
                      <div style={{ fontSize: 10, color: COLORS.muted, marginBottom: 2 }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600,
                                    color: item.color || COLORS.text }}>
                        {item.value || "—"}
                      </div>
                    </div>
                  ))}
                </div>

                {selected.ai_explanation && (
                  <div style={{ background: "rgba(6,182,212,0.06)",
                                border: `1px solid rgba(6,182,212,0.2)`,
                                borderRadius: 8, padding: 12, marginBottom: 10 }}>
                    <div style={{ fontSize: 11, color: COLORS.cyan, marginBottom: 6,
                                  letterSpacing: 1 }}>🤖 AI EXPLANATION</div>
                    <div style={{ fontSize: 12, lineHeight: 1.7, color: COLORS.text }}>
                      {selected.ai_explanation}
                    </div>
                  </div>
                )}

                {selected.ai_fix && (
                  <div style={{ background: "rgba(34,197,94,0.06)",
                                border: `1px solid rgba(34,197,94,0.2)`,
                                borderRadius: 8, padding: 12, marginBottom: 10 }}>
                    <div style={{ fontSize: 11, color: COLORS.green, marginBottom: 6,
                                  letterSpacing: 1 }}>🔧 SUGGESTED FIX</div>
                    <div style={{ fontSize: 12, lineHeight: 1.7,
                                  fontFamily: "monospace", color: COLORS.text }}>
                      {selected.ai_fix}
                    </div>
                  </div>
                )}

                {/* feedback buttons */}
                <div style={{ background: "rgba(168,85,247,0.06)",
                              border: `1px solid rgba(168,85,247,0.2)`,
                              borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 11, color: COLORS.purple, marginBottom: 10,
                                letterSpacing: 1 }}>WAS THIS AI SUGGESTION HELPFUL?</div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    {[
                      { type: "accept", label: "✓ Accept", color: COLORS.green },
                      { type: "reject", label: "✗ Reject", color: COLORS.red },
                      { type: "edit", label: "✎ Needs Edit", color: COLORS.yellow },
                    ].map(({ type, label, color }) => (
                      <button
                        key={type}
                        onClick={() => submitFeedback(selected.id, type)}
                        style={{
                          padding: "6px 14px",
                          borderRadius: 6,
                          border: `1px solid ${color}`,
                          background: feedback[selected.id] === type
                            ? `${color}25` : "transparent",
                          color: color,
                          cursor: "pointer",
                          fontSize: 11,
                          fontWeight: 600,
                          letterSpacing: 1,
                          transition: "all 0.15s",
                          transform: feedback[selected.id] === type ? "scale(1.05)" : "scale(1)"
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {feedback[selected.id] && (
                    <div style={{ fontSize: 11, color: COLORS.muted }}>
                      feedback saved —
                      <span style={{ color:
                        feedback[selected.id] === "accept" ? COLORS.green :
                        feedback[selected.id] === "reject" ? COLORS.red : COLORS.yellow,
                        marginLeft: 4 }}>
                        {feedback[selected.id]}
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1f2937; border-radius: 2px; }
      `}</style>
    </div>
  );
}