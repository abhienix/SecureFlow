import React, { useState } from "react";
import { Search, X, Sparkles, ChevronRight } from "lucide-react";
import SeverityBadge from "../ui/SeverityBadge";
import { getScannerMeta } from "../../utils/scannersRegistry";

export default function FindingsPage({ findings = [], C }) {
  const [selectedScanner, setSelectedScanner] = useState("all");
  const [selectedSeverity, setSelectedSeverity] = useState("all");
  const [search, setSearch] = useState("");
  const [activeFinding, setActiveFinding] = useState(null);

  const filtered = findings.filter((f) => {
    if (selectedScanner !== "all" && f.scanner !== selectedScanner) return false;
    if (selectedSeverity !== "all" && f.severity?.toUpperCase() !== selectedSeverity) return false;
    if (search && !(
      (f.title || "").toLowerCase().includes(search.toLowerCase()) ||
      (f.repo_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (f.cve_cwe || "").toLowerCase().includes(search.toLowerCase())
    )) return false;
    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: C?.textPrimary || "#F1F5F9" }}>
          Unified Security Findings
        </h1>
        <span style={{ fontSize: 13, color: C?.textMuted || "#475569" }}>
          Aggregated vulnerability findings across Gitleaks (Secrets), Semgrep (SAST), Trivy (Container), and OWASP ZAP (DAST)
        </span>
      </div>

      {/* Filter Bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
        background: C?.bgCard || "#13151A", border: `1px solid ${C?.borderDefault || "rgba(255,255,255,0.10)"}`,
        borderRadius: 8, padding: "12px 16px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
          <Search size={16} color={C?.textMuted} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search findings by title, file, CVE, CWE..."
            style={{ background: "transparent", border: "none", outline: "none", color: C?.textPrimary, fontSize: 13, width: "100%" }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <select
            value={selectedScanner}
            onChange={(e) => setSelectedScanner(e.target.value)}
            style={{ background: C?.bgSecondary || "#0F1117", border: `1px solid ${C?.borderDefault}`, color: C?.textPrimary, padding: "6px 10px", borderRadius: 6, fontSize: 12 }}
          >
            <option value="all">All Scanners</option>
            <option value="gitleaks">Gitleaks Secrets</option>
            <option value="semgrep">Semgrep SAST</option>
            <option value="trivy">Trivy Container</option>
            <option value="zap">OWASP ZAP DAST</option>
          </select>

          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            style={{ background: C?.bgSecondary || "#0F1117", border: `1px solid ${C?.borderDefault}`, color: C?.textPrimary, padding: "6px 10px", borderRadius: 6, fontSize: 12 }}
          >
            <option value="all">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Main Table & Slide-out Drawer */}
      <div style={{ display: "grid", gridTemplateColumns: activeFinding ? "1fr 1fr" : "1fr", gap: 20 }}>
        <div style={{
          background: C?.bgCard || "#13151A", border: `1px solid ${C?.borderDefault}`, borderRadius: 8, overflow: "hidden"
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: C?.bgSecondary || "#0F1117", borderBottom: `1px solid ${C?.borderSubtle}`, textTransform: "uppercase", fontSize: 11, color: C?.textMuted }}>
                <th style={{ padding: "12px 16px", textAlign: "left" }}>Scanner</th>
                <th style={{ padding: "12px 16px", textAlign: "left" }}>Severity</th>
                <th style={{ padding: "12px 16px", textAlign: "left" }}>Vulnerability</th>
                <th style={{ padding: "12px 16px", textAlign: "left" }}>Repository</th>
                <th style={{ padding: "12px 16px", textAlign: "left" }}>CVE / CWE</th>
                <th style={{ padding: "12px 16px", textAlign: "right" }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, idx) => {
                const meta = getScannerMeta(item.scanner);
                return (
                  <tr
                    key={item.id || idx}
                    onClick={() => setActiveFinding(item)}
                    style={{
                      borderBottom: `1px solid ${C?.borderSubtle || "rgba(255,255,255,0.06)"}`,
                      cursor: "pointer",
                      background: activeFinding?.id === item.id ? "rgba(99,102,241,0.08)" : "transparent"
                    }}
                  >
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ padding: "4px 8px", borderRadius: 4, background: meta.bgColor, color: meta.color, fontSize: 11, fontWeight: 700 }}>
                        {meta.name}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <SeverityBadge severity={item.severity} label={item.severity} C={C} />
                    </td>
                    <td style={{ padding: "12px 16px", fontWeight: 700, color: C?.textPrimary }}>
                      {item.title}
                    </td>
                    <td style={{ padding: "12px 16px", color: "#6366F1", fontWeight: 600 }}>
                      {item.repo_name}
                    </td>
                    <td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: 12, color: C?.textMuted }}>
                      {item.cve_cwe}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <ChevronRight size={16} color={C?.textMuted} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Finding Detail Slide-Out Drawer */}
        {activeFinding && (
          <div style={{
            background: C?.bgCard || "#13151A", border: `1px solid ${C?.borderDefault}`, borderRadius: 8, padding: 20,
            display: "flex", flexDirection: "column", gap: 16
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <SeverityBadge severity={activeFinding.severity} label={activeFinding.severity} C={C} />
              <button onClick={() => setActiveFinding(null)} style={{ background: "none", border: "none", color: C?.textMuted, cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>

            <h3 style={{ fontSize: 16, fontWeight: 800, color: C?.textPrimary }}>{activeFinding.title}</h3>

            <div style={{ background: C?.bgSecondary, padding: 12, borderRadius: 6, fontSize: 12, color: C?.textMuted, display: "flex", flexDirection: "column", gap: 6 }}>
              <div><strong>Scanner:</strong> {activeFinding.scanner}</div>
              <div><strong>File:</strong> {activeFinding.file}:{activeFinding.line}</div>
              <div><strong>CWE / OWASP:</strong> {activeFinding.cve_cwe} | {activeFinding.owasp}</div>
            </div>

            <div style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.20)", padding: 16, borderRadius: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#6366F1", fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
                <Sparkles size={16} />
                <span>AI Technical Explanation</span>
              </div>
              <p style={{ fontSize: 13, color: C?.textSecondary, lineHeight: 1.5 }}>
                {activeFinding.ai_explanation}
              </p>
            </div>

            <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.20)", padding: 16, borderRadius: 6 }}>
              <div style={{ color: "#22C55E", fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
                Recommended Patch / Remediation
              </div>
              <p style={{ fontSize: 13, color: C?.textSecondary, lineHeight: 1.5 }}>
                {activeFinding.ai_fix}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
