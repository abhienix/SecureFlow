import React, { useState, useEffect, useRef } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";
import { useScans, useFindings } from "../../hooks/useApi";
import { useUIStore } from "../../stores/uiStore";
import {
  ShieldCheck, GitPullRequest, GitBranch, ShieldAlert, FileText,
  Settings, Sun, Moon, Monitor, PanelLeftClose, PanelLeft, Radar, Bell,
  CheckCircle2, XCircle, Loader2
} from "lucide-react";

const NAV_SECTIONS = [
  {
    section: "MAIN",
    items: [
      { path: "/overview", label: "Overview", Icon: Radar },
      { path: "/repositories", label: "Repositories", Icon: GitBranch },
      { path: "/pipelines", label: "Pipelines", Icon: GitPullRequest, countKey: "scansCount" },
      { path: "/security-center", label: "Security Center", Icon: ShieldAlert, countKey: "openFindingsCount", color: "#ef4444" },
      { path: "/deployments", label: "Deployments", Icon: ShieldCheck },
      { path: "/observability", label: "Observability", Icon: Radar },
      { path: "/policies", label: "Policies", Icon: FileText },
    ],
  },
  {
    section: "SYSTEM",
    items: [
      { path: "/notifications", label: "Notifications", Icon: Bell },
      { path: "/settings", label: "Settings", Icon: Settings },
    ],
  },
];

const THEME_ICONS = { dark: Moon, light: Sun, system: Monitor };

export default function Sidebar({ C }) {
  const { mode, cycleTheme } = useTheme();
  const { mobileSidebarOpen, setMobileSidebarOpen } = useUIStore();
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // ── Animated pipeline toast state ──────────────────────────────────
  const [pipelineToast, setPipelineToast] = useState(null);
  // { repo, sha, status: 'running' | 'passed' | 'blocked', visible }
  const toastTimer = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      const data = e.detail;
      if (!data) return;

      if (data.type === 'scan_started') {
        clearTimeout(toastTimer.current);
        setPipelineToast({
          repo: data.repo_name || data.repository || 'Pipeline',
          sha: (data.commit_sha || '').substring(0, 7),
          status: 'running',
          visible: true,
        });
        // auto-dismiss after 6s if no completion event
        toastTimer.current = setTimeout(() => setPipelineToast(null), 6000);
      }

      if (data.type === 'scan_complete') {
        clearTimeout(toastTimer.current);
        const isBlocked = data.action_taken === 'BLOCK';
        setPipelineToast({
          repo: data.repo_name || data.repository || 'Pipeline',
          sha: (data.commit_sha || '').substring(0, 7),
          status: isBlocked ? 'blocked' : 'passed',
          visible: true,
        });
        toastTimer.current = setTimeout(() => setPipelineToast(null), 5000);
      }
    };

    window.addEventListener('sf_ws_event', handler);
    return () => {
      window.removeEventListener('sf_ws_event', handler);
      clearTimeout(toastTimer.current);
    };
  }, []);

  // Live counts from TanStack Query (auto-updates on WS events)
  const { data: scans } = useScans(200);
  const { data: findings } = useFindings();
  const scansCount = scans?.filter(s => s.status?.toLowerCase() === 'running')?.length || 0;
  const openFindingsCount = findings?.length || 0;
  const counts = { scansCount, openFindingsCount };
  const ThemeIcon = THEME_ICONS[mode];
  const sidebarWidth = collapsed ? 60 : 195;

  return (
    <>
      {/* Mobile overlay backdrop */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="mobile-sidebar-backdrop"
        />
      )}
      <aside
        className={mobileSidebarOpen ? 'mobile-sidebar-open' : ''}
        style={{
          width: sidebarWidth, minWidth: sidebarWidth,
          background: C.bgSurface, borderRight: `1px solid ${C.border}`,
          display: "flex", flexDirection: "column", height: "100vh",
          padding: collapsed ? "16px 8px" : "16px 12px", gap: 16,
          transition: "width 200ms ease, min-width 200ms ease, padding 200ms ease, transform 200ms ease",
          userSelect: "none", overflow: "hidden",
        }}
      >
      {/* Brand Header with Real Animated Cyber Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: collapsed ? "0 2px" : "0 4px", minHeight: 38 }}>
        <div style={{ position: "relative", width: 30, height: 30, minWidth: 30, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {/* Outer Animated Spinning Gradient Ring */}
          <div style={{
            position: "absolute", inset: -2, borderRadius: 9,
            background: "conic-gradient(from 0deg, #6366F1 0%, #8B5CF6 30%, #06B6D4 60%, #EC4899 85%, #6366F1 100%)",
            animation: "sf-logo-spin 3s linear infinite",
            filter: "drop-shadow(0 0 8px rgba(99,102,241,0.55))",
          }} />
          {/* Inner Core Shield Badge */}
          <div style={{
            position: "relative", zIndex: 2, width: 28, height: 28, borderRadius: 7,
            background: "linear-gradient(135deg, #1E1B4B 0%, #0F172A 100%)",
            border: "1px solid rgba(99, 102, 241, 0.6)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <ShieldCheck size={16} color="#38BDF8" style={{ animation: "sf-core-pulse 2s ease-in-out infinite" }} />
          </div>
        </div>
        {!collapsed && (
          <div style={{ overflow: "hidden" }}>
            <h2 style={{ fontSize: 14, fontWeight: 800, color: C.ink, letterSpacing: "-0.3px", whiteSpace: "nowrap", margin: 0, lineHeight: 1.1 }}>
              SecureFlow
            </h2>
            <span style={{ fontSize: 8, fontWeight: 800, color: C.accent, textTransform: "uppercase", letterSpacing: "0.8px", opacity: 0.9 }}>
              CI/CD Security Intelligence
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        {NAV_SECTIONS.map((sec, idx) => (
          <div key={idx} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {!collapsed && (
              <span style={{
                fontSize: 10, fontWeight: 700, color: C.inkMuted, padding: "4px 8px",
                textTransform: "uppercase", letterSpacing: "0.8px",
              }}>
                {sec.section}
              </span>
            )}
            {sec.items.map((item) => {
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + "/");
              const Icon = item.Icon;
              const count = item.countKey ? counts[item.countKey] : undefined;

              return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileSidebarOpen(false)}
                    className="sf-sidebar-nav-link"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: collapsed ? "center" : "space-between",
                      padding: collapsed ? "8px" : "6px 8px",
                      borderRadius: 6,
                      position: "relative",
                    }}
                    title={collapsed ? item.label : undefined}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Icon size={15} color={isActive ? "#6366F1" : C.inkLow} style={{ transition: "all 150ms ease" }} />
                      {!collapsed && <span style={{ fontSize: 12 }}>{item.label}</span>}
                    </div>

                  {!collapsed && item.badge && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 10,
                      background: C.accentSoft, color: C.accent,
                    }}>{item.badge}</span>
                  )}

                  {!collapsed && count > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      {item.path === "/pipelines" && scansCount > 0 && (
                        <span style={{
                          width: 6, height: 6, borderRadius: "50%",
                          background: "#06b6d4",
                          boxShadow: "0 0 8px #06b6d4",
                          animation: "sfDotPulse 1.2s infinite ease-in-out"
                        }} title="Pipeline active in real-time" />
                      )}
                      <span style={{
                        fontSize: 10, fontWeight: 800, padding: "2px 7px", borderRadius: 10,
                        background: item.path === "/pipelines" && scansCount > 0
                          ? "linear-gradient(135deg, rgba(6,182,212,0.25), rgba(99,102,241,0.25))"
                          : item.path === "/pipelines"
                          ? C.bgElevated
                          : openFindingsCount > 0
                          ? "#dc2626"
                          : C.bgElevated,
                        color: item.path === "/pipelines" && scansCount > 0
                          ? "#06b6d4"
                          : item.path === "/pipelines"
                          ? C.inkMid
                          : openFindingsCount > 0
                          ? "#ffffff"
                          : C.inkMid,
                        border: item.path === "/pipelines" && scansCount > 0
                          ? "1px solid rgba(6,182,212,0.45)"
                          : "none",
                        boxShadow: item.path === "/pipelines" && scansCount > 0
                          ? "0 0 10px rgba(6,182,212,0.35)"
                          : "none",
                        minWidth: 20, textAlign: "center",
                      }}>{count}</span>
                    </div>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      <style>{`
        @keyframes sf-logo-spin {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes sf-core-pulse {
          0%, 100% { opacity: 1; transform: scale(1); filter: drop-shadow(0 0 4px #38BDF8); }
          50%      { opacity: 0.8; transform: scale(0.92); filter: drop-shadow(0 0 1px #38BDF8); }
        }
        .sf-sidebar-nav-link {
          display: flex;
          align-items: center;
          text-decoration: none;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 120ms ease, color 120ms ease;
          border-left: 3px solid transparent;
          color: ${C.inkMid};
          background-color: transparent;
        }
        .sf-sidebar-nav-link:hover {
          background-color: ${C.isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC'};
          color: ${C.ink};
        }
        .sf-sidebar-nav-link.active {
          background-color: ${C.isDark ? 'rgba(99,102,241,0.14)' : '#EEF2FF'} !important;
          color: #6366F1 !important;
          border-left: 3px solid #6366F1 !important;
          font-weight: 700;
        }
      `}</style>

      {/* ── Animated Pipeline Toast ─────────────────────────────── */}
      {pipelineToast && (
        <div
          onClick={() => navigate('/pipelines')}
          style={{
            cursor: 'pointer',
            borderRadius: 10,
            padding: collapsed ? '10px 6px' : '10px 12px',
            background: pipelineToast.status === 'running'
              ? 'rgba(99,102,241,0.12)'
              : pipelineToast.status === 'blocked'
              ? 'rgba(244,63,94,0.12)'
              : 'rgba(16,185,129,0.12)',
            border: `1px solid ${
              pipelineToast.status === 'running'
                ? 'rgba(99,102,241,0.35)'
                : pipelineToast.status === 'blocked'
                ? 'rgba(244,63,94,0.35)'
                : 'rgba(16,185,129,0.35)'
            }`,
            animation: 'sf-toast-slide 0.35s cubic-bezier(0.22,1,0.36,1)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            overflow: 'hidden',
          }}
        >
          {/* Status icon */}
          <div style={{
            minWidth: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: '50%',
            background: pipelineToast.status === 'running'
              ? 'rgba(99,102,241,0.2)'
              : pipelineToast.status === 'blocked'
              ? 'rgba(244,63,94,0.2)'
              : 'rgba(16,185,129,0.2)',
          }}>
            {pipelineToast.status === 'running' && (
              <Loader2
                size={13}
                color="#818CF8"
                style={{ animation: 'sf-spin 1s linear infinite' }}
              />
            )}
            {pipelineToast.status === 'passed' && <CheckCircle2 size={13} color="#10B981" />}
            {pipelineToast.status === 'blocked' && <XCircle size={13} color="#F43F5E" />}
          </div>

          {/* Text — only show when not collapsed */}
          {!collapsed && (
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{
                fontSize: 10, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase',
                color: pipelineToast.status === 'running'
                  ? '#818CF8'
                  : pipelineToast.status === 'blocked'
                  ? '#F43F5E'
                  : '#10B981',
                marginBottom: 1,
              }}>
                {pipelineToast.status === 'running' ? 'Pipeline Running' :
                 pipelineToast.status === 'blocked' ? 'Build Blocked' : 'Build Passed'}
              </div>
              <div style={{
                fontSize: 10, color: C.inkMuted, whiteSpace: 'nowrap',
                overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {pipelineToast.repo}
                {pipelineToast.sha ? ` · ${pipelineToast.sha}` : ''}
              </div>
            </div>
          )}

          {/* Running pulse dot (collapsed mode) */}
          {collapsed && pipelineToast.status === 'running' && (
            <div style={{
              width: 6, height: 6, borderRadius: '50%', background: '#818CF8',
              animation: 'sf-pulse 1.2s ease-in-out infinite',
            }} />
          )}
        </div>
      )}

      <style>{`
        @keyframes sf-toast-slide {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes sf-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes sf-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.75); }
        }
      `}</style>

      {/* Bottom Controls */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
        {/* Theme Toggle */}
        <button onClick={cycleTheme} style={{
          display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start",
          gap: 10, padding: "7px 10px", borderRadius: 8, border: "none",
          background: "transparent", color: C.inkMid, fontSize: 12, fontWeight: 500,
          cursor: "pointer", transition: "all 150ms ease", width: "100%",
        }} title={`Theme: ${mode}`}>
          <ThemeIcon size={16} />
          {!collapsed && <span style={{ textTransform: "capitalize" }}>{mode} Theme</span>}
        </button>

        {/* Collapse Toggle */}
        <button onClick={() => setCollapsed(!collapsed)} style={{
          display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start",
          gap: 10, padding: "7px 10px", borderRadius: 8, border: "none",
          background: "transparent", color: C.inkMuted, fontSize: 12, fontWeight: 500,
          cursor: "pointer", transition: "all 150ms ease", width: "100%",
        }} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
          {collapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
    </>
  );
}
