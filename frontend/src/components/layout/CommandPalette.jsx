import React, { useState, useEffect, useRef } from "react";
import { Search, ShieldAlert, FileText, Settings, Radar, GitPullRequest, Zap } from "lucide-react";
import { useGlobalSearch } from "../../hooks/useApi";

const COMMANDS = [
  { id: "overview", label: "Overview", path: "/overview", Icon: Radar, section: "Navigation" },
  { id: "pipelines", label: "Pipelines", path: "/pipelines", Icon: GitPullRequest, section: "Navigation" },
  { id: "security-center", label: "Security Center (Findings & Reports)", path: "/security-center", Icon: ShieldAlert, section: "Navigation" },
  { id: "policies", label: "Policy Engine", path: "/policies", Icon: FileText, section: "Navigation" },
  { id: "settings", label: "Settings & System Health", path: "/settings", Icon: Settings, section: "Navigation" },
];

export default function CommandPalette({ isOpen, onClose, onNavigate, C }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);
  const { data: searchData } = useGlobalSearch(query);

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

  const filteredNav = COMMANDS.filter(cmd =>
    cmd.label.toLowerCase().includes(query.toLowerCase())
  );

  const backendResults = searchData?.results || [];

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
      backdropFilter: "blur(4px)", zIndex: 9999,
      display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: "15vh",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 540, maxHeight: "65vh", borderRadius: 16,
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
            placeholder="Search pipelines, CVEs, findings, commits, files..."
            style={{
              flex: 1, background: "none", border: "none", outline: "none",
              color: C?.ink || "#f8fafc", fontSize: 14, fontWeight: 500,
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
          {/* Backend Live Resource Search Results */}
          {backendResults.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{
                fontSize: 10, fontWeight: 700, color: C?.accent || "#6366F1",
                padding: "8px 8px 4px", textTransform: "uppercase", letterSpacing: "0.5px",
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <Zap size={12} /> Backend Search Results ({backendResults.length})
              </div>
              {backendResults.map((res: any) => (
                <button
                  key={res.id}
                  onClick={() => onNavigate(res.path)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    width: "100%", padding: "10px 12px", borderRadius: 8, border: "none",
                    background: "transparent", color: C?.ink || "#f8fafc",
                    fontSize: 13, cursor: "pointer", textAlign: "left",
                    transition: "background 100ms",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = C?.bgHover || "#1e293b"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: C?.ink || "#f8fafc" }}>{res.title}</div>
                    <div style={{ fontSize: 11, color: C?.inkMuted || "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{res.subtitle}</div>
                  </div>
                  {res.badge && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 6, background: C?.accentSoft || "rgba(99,102,241,0.15)", color: C?.accent || "#6366F1" }}>
                      {res.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Navigation Links */}
          <div>
            <div style={{
              fontSize: 10, fontWeight: 700, color: C?.inkMuted || "#475569",
              padding: "8px 8px 4px", textTransform: "uppercase", letterSpacing: "0.5px",
            }}>Navigation</div>
            {filteredNav.map(cmd => {
              const Icon = cmd.Icon;
              return (
                <button key={cmd.id} onClick={() => onNavigate(cmd.path)} style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%",
                  padding: "10px 12px", borderRadius: 8, border: "none",
                  background: "transparent", color: C?.ink || "#f8fafc",
                  fontSize: 13, fontWeight: 500, cursor: "pointer",
                  transition: "background 100ms", textAlign: "left",
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

          {filteredNav.length === 0 && backendResults.length === 0 && (
            <div style={{ padding: 20, textAlign: "center", color: C?.inkMuted || "#475569", fontSize: 13 }}>
              No results for "{query}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
