import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useUIStore } from "../../stores/uiStore";
import { useScans } from "../../hooks/useApi";
import {
  Search, Bell, RefreshCw, Sparkles, Wifi, WifiOff, ChevronRight, Menu
} from "lucide-react";

const ROUTE_LABELS: Record<string, string> = {
  "/": "Overview",
  "/overview": "Overview",
  "/pipelines": "DevSecOps Pipelines",
  "/security-center": "Security Center",
  "/policies": "Policy Engine",
  "/settings": "Settings & Platform",
};

export default function TopBar({ C }: { C: any }) {
  const location = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { notifications, wsConnected, lastApiResponse, toggleCmdPalette, toggleCopilot, toggleNotification } = useUIStore();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const unreadCount = notifications.filter(n => !n.read).length || notifications.length;

  const { data: scansData = [] } = useScans(50);
  const activeScansCount = scansData.filter((s: any) => s.status?.toLowerCase() === 'running').length;

  const currentLabel = ROUTE_LABELS[location.pathname] || "SecureFlow";
  const parentPath = location.pathname.split("/").slice(0, -1).join("/");
  const parentLabel = ROUTE_LABELS[parentPath];
  const { toggleMobileSidebar } = useUIStore();

  return (
    <header style={{
      height: 52, minHeight: 52, display: "flex", alignItems: "center",
      justifyContent: "space-between", padding: "0 20px",
      background: C.bgSurface, borderBottom: `1px solid ${C.border}`,
      gap: 16,
    }}>
      {/* Left: Hamburger + Breadcrumbs */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button onClick={toggleMobileSidebar} style={{
          display: "none", background: "none", border: "none", color: C.inkLow,
          cursor: "pointer", padding: 4, marginRight: 4,
        }} className="mobile-hamburger" title="Toggle sidebar">
          <Menu size={18} />
        </button>
        <button onClick={() => navigate("/overview")} style={{
          background: "none", border: "none", color: C.inkMuted,
          fontSize: 12, fontWeight: 500, cursor: "pointer", padding: 0,
        }}>SecureFlow</button>

        {parentLabel && (
          <>
            <ChevronRight size={12} color={C.inkMuted} />
            <span style={{ fontSize: 12, fontWeight: 500, color: C.inkMuted }}>{parentLabel}</span>
          </>
        )}

        <ChevronRight size={12} color={C.inkMuted} />
        <span style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{currentLabel}</span>
      </div>

      {/* Center/Right Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>

        {/* ⚡ Live Pipeline Running Animation Indicator */}
        {activeScansCount > 0 && (
          <div
            onClick={() => navigate("/pipelines")}
            style={{
              display: "flex", alignItems: "center", gap: 7, padding: "5px 12px",
              borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: "pointer",
              background: "linear-gradient(135deg, rgba(6,182,212,0.15), rgba(99,102,241,0.15))",
              color: "#06b6d4",
              border: "1px solid rgba(6,182,212,0.4)",
              boxShadow: "0 0 12px rgba(6,182,212,0.25)",
              animation: "sfActiveBarGlow 2s infinite ease-in-out",
            }}
            title={`${activeScansCount} pipeline(s) executing — click to view`}
          >
            <span style={{
              width: 8, height: 8, borderRadius: "50%",
              background: "#06b6d4",
              boxShadow: "0 0 10px #06b6d4",
              animation: "sfDotPulse 1.2s infinite ease-in-out"
            }} />
            <span style={{ textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {activeScansCount} {activeScansCount === 1 ? "Pipeline Executing" : "Pipelines Executing"}
            </span>
            <RefreshCw size={11} className="sf-spin-slow" />
          </div>
        )}

        {/* Command Palette Trigger */}
        <button onClick={toggleCmdPalette} style={{
          display: "flex", alignItems: "center", gap: 8, padding: "5px 10px",
          borderRadius: 8, border: `1px solid ${C.border}`, background: C.bgElevated,
          color: C.inkMuted, fontSize: 12, cursor: "pointer", transition: "all 150ms",
        }} title="Search resources & navigation (Ctrl+K)">
          <Search size={13} />
          <span>Search...</span>
          <kbd style={{
            fontSize: 10, padding: "1px 5px", borderRadius: 4,
            background: C.bgSurface, border: `1px solid ${C.border}`,
            color: C.inkMuted, fontFamily: "monospace",
          }}>⌘K</kbd>
        </button>

        {/* Quick Refresh Button */}
        <button onClick={() => qc.invalidateQueries()} style={{
          width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.border}`,
          background: C.bgElevated, color: C.inkLow, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 150ms",
        }} title="Force reload data feeds">
          <RefreshCw size={14} />
        </button>

        {/* Notifications */}
        <button onClick={toggleNotification} style={{
          width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.border}`,
          background: C.bgElevated, color: C.inkLow, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          position: "relative", transition: "all 150ms",
        }} title="Notification Center">
          <Bell size={14} />
          {unreadCount > 0 && (
            <span style={{
              position: "absolute", top: 2, right: 2, minWidth: 14, height: 14,
              borderRadius: 7, background: C.red, color: "#fff", fontSize: 9,
              fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center",
              padding: "0 2px",
            }}>{unreadCount}</span>
          )}
        </button>

        {/* Void AI Drawer Trigger */}
        <button onClick={toggleCopilot} style={{
          display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
          borderRadius: 8, border: `1px solid ${C.accentBorder}`,
          background: C.accentSoft, color: C.accent, fontSize: 12,
          fontWeight: 700, cursor: "pointer", transition: "all 150ms",
        }} title="Open Void Autonomous AI Engine">
          <Sparkles size={13} />
          <span>Void AI</span>
        </button>

        {/* Connection Status Pill (#14) */}
        <div style={{
          display: "flex", alignItems: "center", gap: 6, padding: "5px 11px",
          borderRadius: 20, fontSize: 11, fontWeight: 700,
          background: wsConnected
            ? "rgba(16, 185, 129, 0.12)"
            : (lastApiResponse ? "rgba(245, 158, 11, 0.12)" : "rgba(239, 68, 68, 0.12)"),
          color: wsConnected ? "#10b981" : (lastApiResponse ? "#f59e0b" : "#ef4444"),
          border: `1px solid ${wsConnected ? "rgba(16, 185, 129, 0.35)" : (lastApiResponse ? "rgba(245, 158, 11, 0.35)" : "rgba(239, 68, 68, 0.35)")}`,
          boxShadow: wsConnected ? "0 0 10px rgba(16, 185, 129, 0.2)" : "none",
        }} title={wsConnected ? "Real-time WebSocket feed active" : "Attempting WebSocket connection / HTTP polling fallback"}>
          <span style={{
            width: 7, height: 7, borderRadius: "50%",
            background: wsConnected ? "#10b981" : (lastApiResponse ? "#f59e0b" : "#ef4444"),
            boxShadow: wsConnected ? "0 0 8px #10b981" : "none",
            animation: wsConnected ? "sfDotPulse 1.5s infinite ease-in-out" : "none",
          }} />
          {wsConnected ? <Wifi size={12} /> : (lastApiResponse ? <RefreshCw size={12} className="sf-spin-slow" /> : <WifiOff size={12} />)}
          <span>
            {wsConnected ? "Connected 🟢" : lastApiResponse ? "Reconnecting 🟠" : "Disconnected 🔴"}
          </span>
        </div>
      </div>

      <style>{`
        @keyframes sfDotPulse {
          0% { transform: scale(0.8); opacity: 0.7; box-shadow: 0 0 2px #06b6d4; }
          50% { transform: scale(1.3); opacity: 1; box-shadow: 0 0 10px #06b6d4, 0 0 15px #06b6d4; }
          100% { transform: scale(0.8); opacity: 0.7; box-shadow: 0 0 2px #06b6d4; }
        }
        @keyframes sfActiveBarGlow {
          0%, 100% { border-color: rgba(6,182,212,0.4); box-shadow: 0 0 8px rgba(6,182,212,0.2); }
          50% { border-color: rgba(6,182,212,0.85); box-shadow: 0 0 16px rgba(6,182,212,0.5); }
        }
        .sf-spin-slow {
          animation: sfSpin 2s linear infinite;
        }
        @keyframes sfSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </header>
  );
}
