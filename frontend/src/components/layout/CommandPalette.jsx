import React, { useState, useEffect, useRef } from "react";
import {
  Search, FolderGit2, GitPullRequest, Rocket, ShieldAlert,
  FileText, Activity, Download, Sparkles, Settings, Radar
} from "lucide-react";

const COMMANDS = [
  { id: "mission-control", label: "Mission Control", path: "/mission-control", Icon: Radar, section: "Navigation" },
  { id: "repositories", label: "Repositories", path: "/repositories", Icon: FolderGit2, section: "Navigation" },
  { id: "pipelines", label: "Pipelines", path: "/pipelines", Icon: GitPullRequest, section: "Navigation" },
  { id: "deployments", label: "Deployments", path: "/deployments", Icon: Rocket, section: "Navigation" },
  { id: "findings", label: "Unified Findings", path: "/findings", Icon: ShieldAlert, section: "Navigation" },
  { id: "policies", label: "Policies", path: "/policies", Icon: FileText, section: "Navigation" },
  { id: "observability", label: "Observability", path: "/observability", Icon: Activity, section: "Navigation" },
  { id: "reports", label: "Reports", path: "/reports", Icon: Download, section: "Navigation" },
  { id: "copilot", label: "AI Copilot", path: "/copilot", Icon: Sparkles, section: "Navigation" },
  { id: "settings", label: "Settings", path: "/settings", Icon: Settings, section: "Navigation" },
];

export default function CommandPalette({ isOpen, onClose, onNavigate, C }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filtered = COMMANDS.filter(cmd =>
    cmd.label.toLowerCase().includes(query.toLowerCase())
  );

  const grouped = filtered.reduce((acc, cmd) => {
    if (!acc[cmd.section]) acc[cmd.section] = [];
    acc[cmd.section].push(cmd);
    return acc;
  }, {});

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
      backdropFilter: "blur(4px)", zIndex: 9999,
      display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "15vh",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 520, maxHeight: "60vh", borderRadius: 16,
        background: C?.bgCard || "#0f172a", border: `1px solid ${C?.border || "#1e293b"}`,
        boxShadow: C?.shadowLg || "0 8px 32px rgba(0,0,0,0.5)",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* Search Input */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10, padding: "14px 16px",
          borderBottom: `1px solid ${C?.border || "#1e293b"}`,
        }}>
          <Search size={18} color={C?.inkMid || "#94a3b8"} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search pages, commands..."
            style={{
              flex: 1, background: "none", border: "none", outline: "none",
              color: C?.ink || "#f8fafc", fontSize: 15, fontWeight: 500,
              fontFamily: C?.sans,
            }}
          />
          <button onClick={onClose} style={{
            background: C?.bgElevated || "#1e293b", border: "none", borderRadius: 6,
            padding: "3px 8px", color: C?.inkMuted || "#475569", fontSize: 11,
            fontWeight: 600, cursor: "pointer",
          }}>ESC</button>
        </div>

        {/* Results */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
          {Object.entries(grouped).map(([section, items]) => (
            <div key={section}>
              <div style={{
                fontSize: 10, fontWeight: 700, color: C?.inkMuted || "#475569",
                padding: "8px 8px 4px", textTransform: "uppercase", letterSpacing: "0.5px",
              }}>{section}</div>
              {items.map(cmd => {
                const Icon = cmd.Icon;
                return (
                  <button key={cmd.id} onClick={() => onNavigate(cmd.path)} style={{
                    display: "flex", alignItems: "center", gap: 10, width: "100%",
                    padding: "10px 12px", borderRadius: 8, border: "none",
                    background: "transparent", color: C?.ink || "#f8fafc",
                    fontSize: 14, fontWeight: 500, cursor: "pointer",
                    transition: "background 100ms",
                    textAlign: "left",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = C?.bgHover || "#1e293b"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <Icon size={16} color={C?.accent || "#6366F1"} />
                    <span>{cmd.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: 20, textAlign: "center", color: C?.inkMuted || "#475569", fontSize: 13 }}>
              No results for "{query}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
