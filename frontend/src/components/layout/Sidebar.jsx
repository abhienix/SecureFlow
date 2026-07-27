import React, { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";
import { useScans, useFindings } from "../../hooks/useApi";
import { useUIStore } from "../../stores/uiStore";
import {
  ShieldCheck, GitPullRequest, ShieldAlert, FileText,
  Settings, Sun, Moon, Monitor, PanelLeftClose, PanelLeft, Radar
} from "lucide-react";

const NAV_SECTIONS = [
  {
    section: "MAIN",
    items: [
      { path: "/overview", label: "Overview", Icon: Radar },
      { path: "/pipelines", label: "Pipelines", Icon: GitPullRequest, countKey: "scansCount" },
      { path: "/security-center", label: "Security Center", Icon: ShieldAlert, countKey: "openFindingsCount", color: "#ef4444" },
      { path: "/policies", label: "Policies", Icon: FileText },
    ],
  },
  {
    section: "SYSTEM",
    items: [
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

  // Live counts from TanStack Query (auto-updates on WS events)
  const { data: scans } = useScans(200);
  const { data: findings } = useFindings();
  const scansCount = scans?.length || 0;
  const openFindingsCount = findings?.length || 0;
  const counts = { scansCount, openFindingsCount };
  const ThemeIcon = THEME_ICONS[mode];
  const sidebarWidth = collapsed ? 64 : 240;

  return (
    <>
      {/* Mobile overlay backdrop */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            zIndex: 999, display: 'none',
          }}
          className="mobile-hamburger"
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
      {/* Brand Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: collapsed ? "0 4px" : "0 8px", minHeight: 40 }}>
        <div style={{
          width: 32, height: 32, minWidth: 32, borderRadius: 8,
          background: "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 16px rgba(99,102,241,0.3)",
        }}>
          <ShieldCheck size={18} color="#FFFFFF" />
        </div>
        {!collapsed && (
          <div style={{ overflow: "hidden" }}>
            <h2 style={{ fontSize: 15, fontWeight: 800, color: C.ink, letterSpacing: "-0.3px", whiteSpace: "nowrap" }}>
              SecureFlow
            </h2>
            <span style={{ fontSize: 9, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              DevSecOps Platform
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
                  style={{
                    display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "space-between",
                    padding: collapsed ? "10px" : "7px 10px", borderRadius: 8, textDecoration: "none",
                    background: isActive ? C.accentSoft : "transparent",
                    color: isActive ? C.ink : C.inkMid,
                    fontSize: 13, fontWeight: isActive ? 600 : 500, cursor: "pointer",
                    transition: "all 150ms ease", position: "relative",
                    borderLeft: isActive ? `2px solid ${C.accent}` : "2px solid transparent",
                  }}
                  title={collapsed ? item.label : undefined}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Icon size={16} color={isActive ? C.accent : C.inkLow} />
                    {!collapsed && <span>{item.label}</span>}
                  </div>

                  {!collapsed && item.badge && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 10,
                      background: C.accentSoft, color: C.accent,
                    }}>{item.badge}</span>
                  )}

                  {!collapsed && count > 0 && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 10,
                      background: item.path === "/pipelines"
                        ? C.bgElevated
                        : openFindingsCount > 0
                        ? "#dc2626"
                        : C.bgElevated,
                      color: item.path === "/pipelines"
                        ? C.inkMid
                        : openFindingsCount > 0
                        ? "#ffffff"
                        : C.inkMid,
                      minWidth: 20, textAlign: "center",
                    }}>{count}</span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

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
