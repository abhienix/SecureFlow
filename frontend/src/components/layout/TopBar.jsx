import React from "react";
import { Search, RefreshCw, Download, Sparkles, FolderGit2, GitBranch, Globe } from "lucide-react";

export default function TopBar({
  repositories = [],
  selectedRepo,
  onSelectRepo,
  selectedBranch,
  onSelectBranch,
  onOpenCommandPalette,
  onRegisterRepo,
  onRescan,
  onExport,
  onAskAI,
  wsConnected,
  C
}) {
  return (
    <header style={{
      height: 56,
      background: C?.bgSurface || "#0F1117",
      borderBottom: `1px solid ${C?.borderDefault || "rgba(255,255,255,0.10)"}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 20px",
      gap: 16
    }}>
      {/* Left Selectors */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Repo Picker */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: C?.bgCard, border: `1px solid ${C?.borderDefault}`, padding: "4px 10px", borderRadius: 6 }}>
          <FolderGit2 size={14} color="#6366F1" />
          <select
            value={selectedRepo || ""}
            onChange={(e) => onSelectRepo(e.target.value)}
            style={{ background: "transparent", border: "none", color: C?.textPrimary, fontSize: 12, fontWeight: 700, outline: "none", cursor: "pointer" }}
          >
            <option value="all">All Repositories ({repositories.length || 6})</option>
            {repositories.map((r) => (
              <option key={r.id || r.name} value={r.name || r.repo_name}>
                {r.name || r.repo_name}
              </option>
            ))}
          </select>
        </div>

        {/* Branch Picker */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: C?.bgCard, border: `1px solid ${C?.borderDefault}`, padding: "4px 10px", borderRadius: 6 }}>
          <GitBranch size={14} color={C?.textMuted} />
          <select
            value={selectedBranch}
            onChange={(e) => onSelectBranch(e.target.value)}
            style={{ background: "transparent", border: "none", color: C?.textPrimary, fontSize: 12, outline: "none", cursor: "pointer" }}
          >
            <option value="main">main</option>
            <option value="develop">develop</option>
            <option value="staging">staging</option>
          </select>
        </div>

        {/* Environment Picker */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: C?.bgCard, border: `1px solid ${C?.borderDefault}`, padding: "4px 10px", borderRadius: 6 }}>
          <Globe size={14} color="#22C55E" />
          <span style={{ fontSize: 12, fontWeight: 700, color: C?.textPrimary }}>production (Cloud Run)</span>
        </div>
      </div>

      {/* Center Command Palette Search Bar */}
      <div
        onClick={onOpenCommandPalette}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: C?.bgCard || "#13151A",
          border: `1px solid ${C?.borderDefault || "rgba(255,255,255,0.10)"}`,
          borderRadius: 6,
          padding: "6px 14px",
          width: 340,
          cursor: "pointer",
          color: C?.textMuted
        }}
      >
        <Search size={14} />
        <span style={{ fontSize: 12, flex: 1 }}>Search repositories, scans, findings...</span>
        <kbd style={{ fontSize: 10, fontWeight: 800, padding: "2px 6px", background: C?.bgSecondary, borderRadius: 4, color: C?.textMuted, border: `1px solid ${C?.borderSubtle}` }}>
          ⌘K
        </kbd>
      </div>

      {/* Right Actions & Status */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* Live WebSocket Status Pill */}
        <div style={{
          display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 12,
          background: wsConnected ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
          border: `1px solid ${wsConnected ? "rgba(34,197,94,0.20)" : "rgba(239,68,68,0.20)"}`,
          fontSize: 11, fontWeight: 800, color: wsConnected ? "#22C55E" : "#EF4444"
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: wsConnected ? "#22C55E" : "#EF4444" }} />
          <span>{wsConnected ? "WebSocket Live" : "Disconnected"}</span>
        </div>

        {/* Quick Action Buttons */}
        <button onClick={onRescan} className="btn-ghost" title="Rescan Pipeline" style={{ padding: "6px 10px", fontSize: 12 }}>
          <RefreshCw size={14} />
          <span>Rescan</span>
        </button>

        <button onClick={onExport} className="btn-ghost" title="Export Report" style={{ padding: "6px 10px", fontSize: 12 }}>
          <Download size={14} />
          <span>Export</span>
        </button>

        <button onClick={onAskAI} className="btn-primary" style={{ padding: "6px 12px", fontSize: 12 }}>
          <Sparkles size={14} />
          <span>Ask AI</span>
        </button>
      </div>
    </header>
  );
}
