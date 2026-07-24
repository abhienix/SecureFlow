import React, { useState } from "react";
import { FolderGit2, Search, Filter, Plus, ChevronRight, X, CheckCircle } from "lucide-react";
import ScanStatusDot from "../ui/ScanStatusDot";
import { useApp } from "../../contexts/AppContext";

export default function RepositoriesPage({ repositories = [], onSelectRepo, C }) {
  const { fetchAllData, BACKEND } = useApp();
  const [search, setSearch] = useState("");
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [repoName, setRepoName] = useState("");
  const [owner, setOwner] = useState("abhienix");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const filtered = repositories.filter(r =>
    (r.name || r.repo_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (r.owner || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!repoName.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch(`${BACKEND}/api/repositories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo_name: repoName,
          owner: owner || "abhienix",
          default_branch: "main",
        })
      });
      const data = await res.json();
      setSuccessMsg(`Registered repository ${data.repository?.name || repoName}`);
      fetchAllData();
      setTimeout(() => {
        setIsRegisterOpen(false);
        setSuccessMsg("");
        setRepoName("");
      }, 1500);
    } catch (e) {
      console.error("Failed to register repo:", e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: C?.ink || "#F1F5F9" }}>
            Monitored GitHub Repositories
          </h1>
          <span style={{ fontSize: 13, color: C?.inkLow || "#475569" }}>
            GitHub portfolio security health scores, active deployments, and historical scan trends
          </span>
        </div>

        <button
          onClick={() => setIsRegisterOpen(true)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 16px", borderRadius: 8, border: "none",
            background: C?.accent || "#6366F1", color: "#ffffff",
            fontSize: 13, fontWeight: 600, cursor: "pointer"
          }}
        >
          <Plus size={16} />
          <span>Register Repository</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
        background: C?.bgCard || "#0f172a", border: `1px solid ${C?.border || "#1e293b"}`,
        borderRadius: 8, padding: "12px 16px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
          <Search size={16} color={C?.inkLow || "#475569"} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search repositories by name, owner, branch..."
            style={{
              background: "transparent", border: "none", outline: "none",
              color: C?.ink || "#F1F5F9", fontSize: 13, width: "100%"
            }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: C?.inkLow }}>
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
              background: C?.bgCard || "#0f172a",
              border: `1px solid ${C?.border || "#1e293b"}`,
              borderRadius: 12, padding: "20px", display: "flex",
              flexDirection: "column", gap: 16, cursor: "pointer",
              transition: "all 150ms ease",
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = C?.accent || "#6366F1"}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = C?.border || "#1e293b"}
          >
            {/* Header info */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10, background: C?.accentSoft || "rgba(99,102,241,0.12)",
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                  <FolderGit2 size={22} color={C?.accent || "#6366F1"} />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: C?.ink || "#F1F5F9" }}>
                    {repo.name || repo.repo_name}
                  </h3>
                  <span style={{ fontSize: 12, color: C?.inkLow || "#475569" }}>
                    Default Branch: <strong style={{ color: C?.inkMid }}>{repo.default_branch || "main"}</strong>
                  </span>
                </div>
              </div>

              {/* Security Score Badge */}
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: 20, fontWeight: 900, color: repo.security_score >= 80 ? C?.green || "#22C55E" : C?.amber || "#F59E0B" }}>
                  {repo.security_score || 94} / 100
                </span>
                <span style={{ display: "block", fontSize: 10, fontWeight: 700, color: C?.inkMuted, textTransform: "uppercase" }}>
                  Security Score
                </span>
              </div>
            </div>

            {/* Repos Telemetry Metrics */}
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10,
              background: C?.bgSurface || "#111827", padding: "12px", borderRadius: 8,
              border: `1px solid ${C?.border || "#1e293b"}`
            }}>
              <div>
                <span style={{ fontSize: 10, color: C?.inkMuted, textTransform: "uppercase", fontWeight: 700 }}>Open Findings</span>
                <span style={{ display: "block", fontSize: 14, fontWeight: 800, color: repo.open_findings > 0 ? C?.red || "#ef4444" : C?.green || "#22C55E" }}>
                  {repo.open_findings || 0} issues
                </span>
              </div>

              <div>
                <span style={{ fontSize: 10, color: C?.inkMuted, textTransform: "uppercase", fontWeight: 700 }}>DAST Status</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                  <ScanStatusDot status={repo.last_dast_status || "completed"} C={C} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: C?.ink }}>{repo.last_dast_status || "completed"}</span>
                </div>
              </div>

              <div>
                <span style={{ fontSize: 10, color: C?.inkMuted, textTransform: "uppercase", fontWeight: 700 }}>Total Scans</span>
                <span style={{ display: "block", fontSize: 14, fontWeight: 800, color: C?.ink }}>
                  {repo.total_scans || 12} runs
                </span>
              </div>
            </div>

            {/* Footer click trigger */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12, color: C?.accent || "#6366F1", fontWeight: 700 }}>
              <span>Enter Repository Workspace</span>
              <ChevronRight size={16} />
            </div>
          </div>
        ))}
      </div>

      {/* Register Repository Modal */}
      {isRegisterOpen && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)", zIndex: 9999,
          display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div style={{
            width: 440, background: C?.bgCard || "#0f172a",
            border: `1px solid ${C?.border || "#1e293b"}`, borderRadius: 16,
            padding: 24, display: "flex", flexDirection: "column", gap: 16,
            boxShadow: C?.shadowLg
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: C?.ink }}>Register New Repository</h3>
              <button onClick={() => setIsRegisterOpen(false)} style={{ background: "none", border: "none", color: C?.inkLow, cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>

            {successMsg ? (
              <div style={{ padding: 16, borderRadius: 8, background: C?.greenSoft, color: C?.green, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                <CheckCircle size={16} /> {successMsg}
              </div>
            ) : (
              <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C?.inkLow, marginBottom: 6 }}>
                    Owner / Org Name
                  </label>
                  <input
                    type="text"
                    value={owner}
                    onChange={e => setOwner(e.target.value)}
                    placeholder="e.g. abhienix"
                    style={{
                      width: "100%", padding: "10px 14px", borderRadius: 8,
                      background: C?.bg, border: `1px solid ${C?.border}`,
                      color: C?.ink, fontSize: 13, outline: "none"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: C?.inkLow, marginBottom: 6 }}>
                    Repository Name
                  </label>
                  <input
                    type="text"
                    value={repoName}
                    onChange={e => setRepoName(e.target.value)}
                    placeholder="e.g. secureflow-microservice"
                    required
                    style={{
                      width: "100%", padding: "10px 14px", borderRadius: 8,
                      background: C?.bg, border: `1px solid ${C?.border}`,
                      color: C?.ink, fontSize: 13, outline: "none"
                    }}
                  />
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                  <button type="button" onClick={() => setIsRegisterOpen(false)} style={{
                    padding: "8px 16px", borderRadius: 8, border: `1px solid ${C?.border}`,
                    background: "transparent", color: C?.inkLow, fontSize: 13, fontWeight: 600, cursor: "pointer"
                  }}>Cancel</button>

                  <button type="submit" disabled={submitting} style={{
                    padding: "8px 18px", borderRadius: 8, border: "none",
                    background: C?.accent, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer"
                  }}>
                    {submitting ? "Registering..." : "Connect Repository"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
