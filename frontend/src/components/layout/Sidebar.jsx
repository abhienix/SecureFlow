import React from "react";
import {
  ShieldCheck, FolderGit2, GitPullRequest, Rocket, ShieldAlert, FileText, Activity,
  Download, Sparkles, Settings
} from "lucide-react";

export default function Sidebar({ activeTab, onTabChange, scansCount = 0, openFindingsCount = 0, C }) {
  const NAV_SECTIONS = [
    {
      section: "OVERVIEW",
      items: [
        { id: "dashboard", label: "Dashboard", Icon: ShieldCheck, badge: "Live" },
        { id: "repositories", label: "Repositories", Icon: FolderGit2 }
      ]
    },
    {
      section: "SECURITY PIPELINES",
      items: [
        { id: "pipelines", label: "Pipelines", Icon: GitPullRequest, count: scansCount },
        { id: "deployments", label: "Deployments", Icon: Rocket },
        { id: "findings", label: "Unified Findings", Icon: ShieldAlert, count: openFindingsCount, color: "#FF4444" },
        { id: "policies", label: "Policies", Icon: FileText }
      ]
    },
    {
      section: "OBSERVABILITY & AI",
      items: [
        { id: "observability", label: "Observability", Icon: Activity },
        { id: "reports", label: "Reports & Audit", Icon: Download },
        { id: "copilot", label: "AI Workspace", Icon: Sparkles, badge: "AI", color: "#6366F1" }
      ]
    },
    {
      section: "ADMIN",
      items: [
        { id: "settings", label: "Settings", Icon: Settings }
      ]
    }
  ];

  return (
    <aside style={{
      width: 240,
      background: C?.bgSurface || "#0F1117",
      borderRight: `1px solid ${C?.borderDefault || "rgba(255,255,255,0.10)"}`,
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      padding: "16px 12px",
      gap: 20,
      userSelect: "none"
    }}>
      {/* Brand Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 8px" }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 16px rgba(99,102,241,0.4)"
        }}>
          <ShieldCheck size={20} color="#FFFFFF" />
        </div>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 900, color: C?.textPrimary || "#F1F5F9", letterSpacing: "-0.5px" }}>
            SecureFlow
          </h2>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#6366F1", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            DevSecOps Platform
          </span>
        </div>
      </div>

      {/* Navigation Sections */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1, overflowY: "auto" }}>
        {NAV_SECTIONS.map((sec, idx) => (
          <div key={idx} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: C?.textMuted || "#475569", padding: "0 8px", textTransform: "uppercase" }}>
              {sec.section}
            </span>

            {sec.items.map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.Icon;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 10px",
                    borderRadius: 6,
                    border: "none",
                    background: isActive ? "rgba(99,102,241,0.12)" : "transparent",
                    color: isActive ? "#F1F5F9" : (C?.textSecondary || "#94A3B8"),
                    fontSize: 13,
                    fontWeight: isActive ? 700 : 500,
                    cursor: "pointer",
                    transition: "all 150ms ease"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Icon size={16} color={isActive ? "#6366F1" : (C?.textMuted || "#475569")} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge && (
                    <span style={{
                      fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 10,
                      background: "rgba(99,102,241,0.20)", color: "#6366F1"
                    }}>
                      {item.badge}
                    </span>
                  )}

                  {item.count !== undefined && item.count > 0 && (
                    <span style={{
                      fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 10,
                      background: item.color ? "rgba(255,68,68,0.20)" : "rgba(255,255,255,0.10)",
                      color: item.color || C?.textPrimary
                    }}>
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </aside>
  );
}
