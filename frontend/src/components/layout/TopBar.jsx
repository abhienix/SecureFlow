import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useUIStore } from "../../stores/uiStore";
import {
  Search, Bell, RefreshCw, Sparkles, Wifi, WifiOff, ChevronRight
} from "lucide-react";

const ROUTE_LABELS = {
  "/mission-control": "Mission Control",
  "/dashboard": "Dashboard",
  "/repositories": "Repositories",
  "/repositories/workspace": "Repository Workspace",
  "/pipelines": "Pipelines",
  "/deployments": "Deployments",
  "/findings": "Unified Findings",
  "/policies": "Policies",
  "/observability": "Observability",
  "/reports": "Reports",
  "/copilot": "AI Copilot Workspace",
  "/settings": "Settings",
};

export default function TopBar({ C }) {
  const location = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { notifications, wsConnected, toggleCmdPalette, toggleCopilot } = useUIStore();
  const unreadCount = notifications.length;

  const currentLabel = ROUTE_LABELS[location.pathname] || "SecureFlow";
  const parentPath = location.pathname.split("/").slice(0, -1).join("/");
  const parentLabel = ROUTE_LABELS[parentPath];

  return (
    <header style={{
      height: 52, minHeight: 52, display: "flex", alignItems: "center",
      justifyContent: "space-between", padding: "0 20px",
      background: C.bgSurface, borderBottom: `1px solid ${C.border}`,
      gap: 16,
    }}>
      {/* Left: Breadcrumbs */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button onClick={() => navigate("/mission-control")} style={{
          background: "none", border: "none", color: C.inkLow, fontSize: 13,
          fontWeight: 500, cursor: "pointer", padding: 0,
        }}>SecureFlow</button>

        {parentLabel && (
          <>
            <ChevronRight size={12} color={C.inkMuted} />
            <button onClick={() => navigate(parentPath)} style={{
              background: "none", border: "none", color: C.inkLow, fontSize: 13,
              fontWeight: 500, cursor: "pointer", padding: 0,
            }}>{parentLabel}</button>
          </>
        )}

        <ChevronRight size={12} color={C.inkMuted} />
        <span style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>{currentLabel}</span>
      </div>

      {/* Right: Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {/* Command Palette Trigger */}
        <button onClick={toggleCmdPalette} style={{
          display: "flex", alignItems: "center", gap: 8, padding: "6px 12px",
          borderRadius: 8, border: `1px solid ${C.border}`, background: C.bg,
          color: C.inkLow, fontSize: 12, cursor: "pointer", transition: "all 150ms",
        }}>
          <Search size={13} />
          <span>Search...</span>
          <span style={{
            fontSize: 10, padding: "1px 6px", borderRadius: 4,
            background: C.bgElevated, color: C.inkMuted, fontWeight: 600,
            fontFamily: C.mono,
          }}>⌘K</span>
        </button>

        {/* Refresh */}
        <button onClick={() => qc.invalidateQueries()} style={{
          width: 34, height: 34, borderRadius: 8, border: `1px solid ${C.border}`,
          background: "transparent", color: C.inkLow, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 150ms",
        }} title="Refresh data">
          <RefreshCw size={14} />
        </button>

        {/* Notifications */}
        <button style={{
          width: 34, height: 34, borderRadius: 8, border: `1px solid ${C.border}`,
          background: "transparent", color: C.inkLow, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          position: "relative", transition: "all 150ms",
        }} title="Notifications">
          <Bell size={14} />
          {unreadCount > 0 && (
            <span style={{
              position: "absolute", top: 4, right: 4, width: 8, height: 8,
              borderRadius: "50%", background: C.red, border: `2px solid ${C.bgSurface}`,
            }} />
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

        {/* WebSocket Status */}
        <div style={{
          display: "flex", alignItems: "center", gap: 5, padding: "5px 10px",
          borderRadius: 8, fontSize: 11, fontWeight: 600,
          background: wsConnected ? C.greenSoft : C.redSoft,
          color: wsConnected ? C.green : C.red,
          border: `1px solid ${wsConnected ? C.greenBorder : C.redBorder}`,
        }}>
          {wsConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
          <span>{wsConnected ? "Live" : "Offline"}</span>
        </div>
      </div>
    </header>
  );
}
