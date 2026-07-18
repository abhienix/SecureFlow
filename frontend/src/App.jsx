import React, {
  useState, useEffect, useCallback, useRef, useMemo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, GitPullRequest, Loader2, X, Download, Sun, Moon, Bell, ShieldCheck, Brain, BarChart2
} from "lucide-react";

import { THEMES, BACKEND } from "./theme";
import { normaliseScan, relTime } from "./utils/formatters";

import LoginGate from "./components/LoginGate";
import WhyBlockedModal from "./components/modals/WhyBlockedModal";
import ExportReportModal from "./components/modals/ExportReportModal";
import ScanDetailModal from "./components/modals/ScanDetailModal";
import AICopilot from "./components/AICopilot";
import VoidCoreIcon from "./components/shared/VoidCoreIcon";

import OverviewTab from "./components/tabs/OverviewTab";
import PipelineTab from "./components/tabs/PipelineTab";
import AIInsightsTab from "./components/tabs/AIInsightsTab";
import MetricsTab from "./components/tabs/MetricsTab";

export default function App() {
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem("sf_theme") || "dark");
  const C = THEMES[themeMode] || THEMES.dark;

  const [scans, setScans] = useState([]);
  const [totalScans, setTotalScans] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedScan, setSelectedScan] = useState(null);
  const [whyBlockedScan, setWhyBlockedScan] = useState(null);
  const [showCopilot, setShowCopilot] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [feedback, setFeedback] = useState({});
  const [activeAlert, setActiveAlert] = useState(null);
  const lastScanIdRef = useRef(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [wsStatus, setWsStatus] = useState("connecting");
  const [isAuthenticated, setIsAuthenticated] = useState(() => sessionStorage.getItem("sf_auth") === "true");

  // Sync theme selection to root document attribute for CSS variables toggle
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", themeMode);
  }, [themeMode]);

  const toggleTheme = () => {
    const next = themeMode === "dark" ? "light" : "dark";
    setThemeMode(next);
    localStorage.setItem("sf_theme", next);
  };

  const fetchScans = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND}/api/scan-results`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const rows = Array.isArray(data) ? data : (data.scans || []);
      setTotalScans(Array.isArray(data) ? rows.length : (data.total ?? rows.length));
      const normalized = rows.map(normaliseScan);
      
      if (normalized.length > 0) {
        const latestScan = normalized[0];
        if (lastScanIdRef.current !== null && lastScanIdRef.current !== latestScan.id) {
          setActiveAlert(latestScan);
        }
        lastScanIdRef.current = latestScan.id;
      }

      setScans(normalized);
      setLastUpdated(new Date());
      setWsStatus("connected");
    } catch (err) {
      setWsStatus("reconnecting");
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScans();
    const timer = setInterval(fetchScans, 8000);
    return () => clearInterval(timer);
  }, [fetchScans]);

  const submitFeedback = useCallback(async (scanId, type) => {
    setFeedback(prev => ({ ...prev, [scanId]: type }));
    try {
      await fetch(`${BACKEND}/api/scan-results/${scanId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: type === "accept" ? "accurate" : "incorrect" }),
      });
    } catch {}
  }, []);

  const running = useMemo(() => {
    const runningScans = scans.filter(s => s.status === "running");
    const latestPerBranch = new Map();
    runningScans.forEach(s => {
      const key = `${s.repo_name || "default"}:${s.branch || "main"}`;
      if (!latestPerBranch.has(key) || s.id > latestPerBranch.get(key).id) {
        latestPerBranch.set(key, s);
      }
    });
    return Array.from(latestPerBranch.values());
  }, [scans]);

  const completed = useMemo(() => scans.filter(s => s.status !== "running"), [scans]);
  const blocked   = useMemo(() => completed.filter(s => s.action_taken === "BLOCK"), [completed]);
  const allowed   = useMemo(() => completed.filter(s => s.action_taken === "ALLOW"), [completed]);

  const avgRisk = completed.length
    ? (completed.reduce((a, s) => a + (s.risk_score || 0), 0) / completed.length).toFixed(1) : "0";

  const healthScore = Math.max(0, Math.min(100,
    Math.round(100 - (blocked.length / (completed.length || 1)) * 40 - parseFloat(avgRisk) * 6)
  ));

  const TABS = [
    { id: "overview",   label: "Security Command Center", Icon: ShieldCheck  },
    { id: "pipeline",   label: "Pipeline Execution",      Icon: GitPullRequest },
    { id: "ai-insights",label: "AI Insights",             Icon: Brain         },
    { id: "metrics",    label: "Metrics & Policy",        Icon: BarChart2     },
  ];

  if (!isAuthenticated) {
    return (
      <LoginGate onAuthenticate={() => {
        setIsAuthenticated(true);
        sessionStorage.setItem("sf_auth", "true");
      }} C={C} />
    );
  }

  return (
    <>
      <AnimatePresence>
        {whyBlockedScan && (
          <WhyBlockedModal scan={whyBlockedScan} onClose={() => setWhyBlockedScan(null)} feedback={feedback} onFeedback={submitFeedback} C={C} />
        )}
        {showExportModal && (
          <ExportReportModal scans={scans} healthScore={healthScore} avgRisk={avgRisk} onClose={() => setShowExportModal(false)} C={C} />
        )}
      </AnimatePresence>

      <div style={{ minHeight: "100vh", background: C.bg, color: C.ink, fontFamily: C.sans, position: "relative" }}>
        <header className="sf-header" style={{
          position: "sticky", top: 0, zIndex: 200,
          background: `${C.bgCard}f0`, backdropFilter: "blur(16px)",
          borderBottom: `1px solid ${C.border}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: `linear-gradient(135deg, ${C.teal}30, ${C.blue}20)`,
              border: `1px solid ${C.tealBord}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Shield size={18} color={C.teal} />
            </div>
            <span className="brand-name" style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em" }}>
              Secure<span style={{ color: C.teal }}>Flow</span>
            </span>
          </div>

          <nav className="sf-nav" style={{ marginLeft: 16 }}>
            {TABS.map(({ id, label, Icon }) => (
              <button key={id} className={`sf-tab ${activeTab === id ? "active" : ""}`} onClick={() => setActiveTab(id)}>
                <Icon size={14} /> <span className="tab-label">{label}</span>
              </button>
            ))}
          </nav>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: wsStatus === "connected" ? C.teal : C.amber, fontWeight: 600 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: wsStatus === "connected" ? C.teal : C.amber, display: "inline-block" }} />
              <span className="hide-mobile">{wsStatus === "connected" ? "Live" : "Polling"}</span>
            </div>
            {lastUpdated && (
              <span className="hide-mobile" style={{ fontSize: 11, color: C.inkLow, fontWeight: 500 }}>
                {relTime(lastUpdated)}
              </span>
            )}

            <button
              onClick={() => setShowExportModal(true)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 12px", borderRadius: 8,
                background: C.bgSurface, border: `1px solid ${C.border}`,
                color: C.ink, fontSize: 12, fontWeight: 600,
              }}
            >
              <Download size={14} /> <span className="hide-mobile">Export Audit</span>
            </button>

            <button
              onClick={toggleTheme}
              title="Toggle Dark / Light Theme"
              style={{
                padding: 6, background: C.bgCard, border: `1px solid ${C.border}`,
                borderRadius: 8, color: C.ink, display: "flex", alignItems: "center",
              }}
            >
              {themeMode === "dark" ? <Sun size={16} color={C.amber} /> : <Moon size={16} color={C.violet} />}
            </button>

            <button
              onClick={() => setShowCopilot(v => !v)}
              className="copilot-btn-glow"
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "6px 16px", borderRadius: 10,
                background: "linear-gradient(135deg, #0f172a 0%, #090d16 100%)",
                border: "1px solid rgba(0, 242, 254, 0.4)",
                color: "#FFFFFF", fontSize: 12, fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 0 16px rgba(121, 40, 202, 0.5)",
                transition: "all 0.2s ease",
              }}
            >
              <div style={{ position: "relative", display: "flex", alignItems: "center", transform: "scale(0.75)", margin: "-4px 0" }}>
                <VoidCoreIcon />
                <span style={{
                  position: "absolute", top: -2, right: -2, width: 6, height: 6,
                  borderRadius: "50%", background: "#00FF66",
                  boxShadow: "0 0 6px #00FF66"
                }} className="pulse-dot" />
              </div>
              <span className="void-text-cyber" style={{ fontSize: 11, fontWeight: 900 }}>Void</span>
            </button>
          </div>
        </header>

        <main className="sf-main">
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", gap: 16 }}>
              <Loader2 size={36} className="spin" color={C.teal} />
              <div style={{ color: C.inkMid, fontSize: 14 }}>Connecting to SecureFlow Gate...</div>
            </div>
          ) : (
            <>
              {activeTab === "overview" && (
                <OverviewTab
                  scans={scans} totalScans={totalScans} healthScore={healthScore} avgRisk={avgRisk}
                  blocked={blocked} allowed={allowed} running={running} completed={completed}
                  feedback={feedback} onFeedback={submitFeedback}
                  onOpenWhyBlocked={setWhyBlockedScan} onOpenDetail={setSelectedScan} C={C}
                />
              )}
              {activeTab === "pipeline" && (
                <PipelineTab scans={scans} onOpenWhyBlocked={setWhyBlockedScan} onOpenDetail={setSelectedScan} C={C} />
              )}
              {activeTab === "ai-insights" && (
                <AIInsightsTab
                  scans={scans}
                  totalScans={totalScans}
                  feedback={feedback}
                  onFeedback={submitFeedback}
                  onOpenCopilotForScan={(scan) => {
                    setShowCopilot(true);
                  }}
                  C={C}
                />
              )}
              {activeTab === "metrics" && <MetricsTab scans={scans} totalScans={totalScans} onTriggerTestAlert={(alert) => setActiveAlert(alert)} C={C} />}
            </>
          )}
        </main>
      </div>

      <AnimatePresence>
        {selectedScan && (
          <ScanDetailModal scan={selectedScan} onClose={() => setSelectedScan(null)} feedback={feedback} onFeedback={submitFeedback} onWhyBlocked={setWhyBlockedScan} C={C} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCopilot && <AICopilot scans={scans} onClose={() => setShowCopilot(false)} C={C} />}
      </AnimatePresence>

      {/* Floating Slack Alert Toast with Ringing Bell */}
      <AnimatePresence>
        {activeAlert && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            style={{
              position: "fixed", bottom: 90, right: 24, zIndex: 600,
              width: 380, maxWidth: "calc(100vw - 48px)", background: C.bgCard, border: `1px solid ${C.isDark ? "rgba(0, 242, 254, 0.4)" : C.border}`,
              borderRadius: 16, boxShadow: "0 12px 48px rgba(0,0,0,0.4)",
              overflow: "hidden", display: "flex", flexDirection: "column",
              backdropFilter: "blur(12px)"
            }}
          >
            {/* Header / Bell bar */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 14px", background: "linear-gradient(135deg, #4A154B 0%, #120013 100%)",
              color: "#FFFFFF"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div className="bell-wiggle" style={{ display: "flex", alignItems: "center" }}>
                  <Bell size={16} color="#00F2FE" fill="#00F2FE" />
                </div>
                <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.06em", textTransform: "uppercase" }}>Slack Event Dispatched</span>
              </div>
              <button
                onClick={() => setActiveAlert(null)}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", padding: 4, cursor: "pointer", display: "flex", alignItems: "center" }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Content preview block (styled exactly like Slack message block kit card!) */}
            <div style={{ padding: 16, display: "flex", gap: 12 }}>
              {/* Slack Avatar */}
              <div style={{
                width: 36, height: 36, borderRadius: 8, background: "#E2E8F0", flexShrink: 0,
                backgroundImage: "url('https://cdn.brandfolder.io/5H442O3W/at/pl546j-7le8go-6v5tbv/Slack_Mark.svg')",
                backgroundSize: "22px", backgroundPosition: "center", backgroundRepeat: "no-repeat"
              }} />

              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Channel & Author */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 900, color: C.ink }}>SecureFlow Bot</span>
                  <span style={{ fontSize: 10, color: C.inkLow }}>just now</span>
                </div>

                <div style={{ fontSize: 11, color: C.inkLow, marginBottom: 8, display: "flex", alignItems: "center", gap: 4 }}>
                  <span>Posted to</span>
                  <code style={{ color: C.teal, background: C.tealSoft, padding: "1px 5px", borderRadius: 4, fontSize: 10 }}>#devsecops-alerts</code>
                </div>

                {/* Event attachment card */}
                <div style={{
                  borderLeft: `4px solid ${activeAlert.action_taken === "BLOCK" ? C.red : C.teal}`,
                  paddingLeft: 10, margin: "6px 0", display: "flex", flexDirection: "column", gap: 4
                }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: C.ink }}>
                    {activeAlert.action_taken === "BLOCK" ? "🚫 Pipeline Blocked" : "✅ Pipeline Allowed"}
                  </div>
                  <div style={{ fontSize: 11, color: C.inkMid }}>
                    <strong>Repo:</strong> {activeAlert.repo_name}
                  </div>
                  <div style={{ fontSize: 11, color: C.inkMid, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    <strong>Commit:</strong> "{activeAlert.commit_message || 'No msg'}"
                  </div>
                  <div style={{ fontSize: 11, color: C.inkMid, fontFamily: C.mono }}>
                    <strong>SHA:</strong> {activeAlert.commit_sha?.slice(0, 8)}
                  </div>
                </div>

                {/* Dismiss Action Button */}
                <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
                  <button
                    onClick={() => setActiveAlert(null)}
                    style={{
                      padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                      background: C.bgSurface, border: `1px solid ${C.border}`, color: C.inkMid,
                      cursor: "pointer", transition: "all 0.15s ease"
                    }}
                  >
                    Dismiss Alert
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
