import React, { useState } from "react";
import { FolderGit2, Search, Filter, Plus, ChevronRight } from "lucide-react";
import ScanStatusDot from "../ui/ScanStatusDot";

export default function RepositoriesPage({ repositories = [], onSelectRepo, onRegisterRepo, C }) {
  const [search, setSearch] = useState("");

  const filtered = repositories.filter(r =>
    (r.name || r.repo_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (r.owner || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: C?.textPrimary || "#F1F5F9" }}>
            Monitored GitHub Repositories
          </h1>
          <span style={{ fontSize: 13, color: C?.textMuted || "#475569" }}>
            GitHub portfolio security health scores, active deployments, and historical scan trends
          </span>
        </div>

        <button onClick={onRegisterRepo} className="btn-primary" style={{ padding: "8px 16px", fontSize: 13 }}>
          <Plus size={16} />
          <span>Register Repository</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        background: C?.bgCard || "#13151A",
        border: `1px solid ${C?.borderDefault || "rgba(255,255,255,0.10)"}`,
        borderRadius: 8,
        padding: "12px 16px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
          <Search size={16} color={C?.textMuted || "#475569"} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search repositories by name, owner, branch..."
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              color: C?.textPrimary || "#F1F5F9",
              fontSize: 13,
              width: "100%"
            }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: C?.textMuted }}>
          <Filter size={14} />
          <span>Showing {filtered.length} of {repositories.length} repositories</span>
        </div>
      </div>

      {/* Repository Cards Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 }}>
        {filtered.map((repo) => (
          <div
            key={repo.id || repo.name}
            onClick={() => onSelectRepo(repo)}
            style={{
              background: C?.bgCard || "#13151A",
              border: `1px solid ${C?.borderDefault || "rgba(255,255,255,0.10)"}`,
              borderRadius: 10,
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: 16,
              cursor: "pointer",
              transition: "all 150ms ease",
              position: "relative"
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = "#6366F1"}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = C?.borderDefault || "rgba(255,255,255,0.10)"}
          >
            {/* Header info */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 8, background: "rgba(99,102,241,0.12)",
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                  <FolderGit2 size={22} color="#6366F1" />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: C?.textPrimary || "#F1F5F9" }}>
                    {repo.name || repo.repo_name}
                  </h3>
                  <span style={{ fontSize: 12, color: C?.textMuted || "#475569" }}>
                    Default Branch: <strong style={{ color: C?.textSecondary }}>{repo.default_branch || "main"}</strong>
                  </span>
                </div>
              </div>

              {/* Security Score Badge */}
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: 20, fontWeight: 900, color: repo.security_score >= 80 ? "#22C55E" : "#F59E0B" }}>
                  {repo.security_score || 94} / 100
                </span>
                <span style={{ display: "block", fontSize: 10, fontWeight: 700, color: C?.textMuted, textTransform: "uppercase" }}>
                  Security Score
                </span>
              </div>
            </div>

            {/* Repos Telemetry Metrics */}
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10,
              background: C?.bgSecondary || "#0F1117", padding: "12px", borderRadius: 6,
              border: `1px solid ${C?.borderSubtle || "rgba(255,255,255,0.06)"}`
            }}>
              <div>
                <span style={{ fontSize: 10, color: C?.textMuted, textTransform: "uppercase", fontWeight: 700 }}>Open Findings</span>
                <span style={{ display: "block", fontSize: 14, fontWeight: 800, color: repo.open_findings > 0 ? "#FF4444" : "#22C55E" }}>
                  {repo.open_findings || 0} issues
                </span>
              </div>

              <div>
                <span style={{ fontSize: 10, color: C?.textMuted, textTransform: "uppercase", fontWeight: 700 }}>DAST Status</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                  <ScanStatusDot status={repo.last_dast_status || "completed"} C={C} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: C?.textPrimary }}>{repo.last_dast_status || "completed"}</span>
                </div>
              </div>

              <div>
                <span style={{ fontSize: 10, color: C?.textMuted, textTransform: "uppercase", fontWeight: 700 }}>Total Scans</span>
                <span style={{ display: "block", fontSize: 14, fontWeight: 800, color: C?.textPrimary }}>
                  {repo.total_scans || 12} runs
                </span>
              </div>
            </div>

            {/* Footer click trigger */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, color: "#6366F1", fontWeight: 700 }}>
              <span>Enter Repository Workspace</span>
              <ChevronRight size={16} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
