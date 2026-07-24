import React, { useState, useEffect } from "react";
import { Search, X, ShieldCheck, FolderGit2, GitPullRequest, Rocket, ShieldAlert, FileText, Activity, Download, Sparkles, Settings } from "lucide-react";

export default function CommandPalette({ isOpen, onClose, onNavigate, C }) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const COMMANDS = [
    { id: "dashboard", label: "Go to Executive Dashboard", icon: ShieldCheck, category: "Navigation" },
    { id: "repositories", label: "Go to Repositories Portfolio", icon: FolderGit2, category: "Navigation" },
    { id: "pipelines", label: "Go to Security Pipeline Execution Center", icon: GitPullRequest, category: "Navigation" },
    { id: "deployments", label: "Go to Google Cloud Run Deployments", icon: Rocket, category: "Navigation" },
    { id: "findings", label: "Go to Unified Security Findings", icon: ShieldAlert, category: "Navigation" },
    { id: "policies", label: "Go to Security Policy Engine (policy.yaml)", icon: FileText, category: "Navigation" },
    { id: "observability", label: "Go to Prometheus Observability & Workers", icon: Activity, category: "Navigation" },
    { id: "reports", label: "Go to Reports & Compliance Audit Exporter", icon: Download, category: "Navigation" },
    { id: "copilot", label: "Open Contextual AI Security Workspace", icon: Sparkles, category: "Navigation" },
    { id: "settings", label: "Go to Platform Settings & Keys", icon: Settings, category: "Navigation" }
  ];

  const filtered = COMMANDS.filter(c => c.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.70)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "12vh"
    }}>
      <div style={{
        width: 600, maxWidth: "90vw", background: C?.bgCard || "#13151A", border: `1px solid ${C?.borderDefault || "rgba(255,255,255,0.10)"}`,
        borderRadius: 10, overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.8)"
      }}>
        {/* Input */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderBottom: `1px solid ${C?.borderSubtle}` }}>
          <Search size={18} color={C?.textMuted} />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search workspace..."
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: C?.textPrimary, fontSize: 14 }}
          />
          <button onClick={onClose} style={{ background: "none", border: "none", color: C?.textMuted, cursor: "pointer" }}>
            <X size={18} />
          </button>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 360, overflowY: "auto", padding: "8px" }}>
          {filtered.map((cmd) => {
            const Icon = cmd.icon;
            return (
              <div
                key={cmd.id}
                onClick={() => {
                  onNavigate(cmd.id);
                  onClose();
                }}
                style={{
                  display: "flex", alignItems: "center", justifyBetween: "space-between", padding: "10px 14px",
                  borderRadius: 6, cursor: "pointer", gap: 12, color: C?.textPrimary
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(99,102,241,0.12)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Icon size={16} color="#6366F1" />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{cmd.label}</span>
                </div>
                <span style={{ fontSize: 10, color: C?.textMuted, textTransform: "uppercase" }}>{cmd.category}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
