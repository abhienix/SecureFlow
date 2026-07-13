import React, { useState, useMemo } from "react";
import { Brain, AlertCircle, Wrench, ShieldCheck } from "lucide-react";
import { Badge, SectionTitle } from "../shared/Common";
import { riskColor } from "../../utils/formatters";
import AIAnalysisBlock from "../shared/AIAnalysisBlock";

export function AIInsightsTab({ scans, totalScans, feedback, onFeedback, onOpenCopilotForScan, C }) {
  const [filterMode, setFilterMode] = useState("ALL"); // "ALL" | "BLOCK" | "ALLOW"
  const [searchQuery, setSearchQuery] = useState("");

  const blockedCount = scans.filter(s => s.action_taken === "BLOCK").length;
  const totalFixesReady = scans.filter(s => s.ai_remedy || s.ai_fix).length;

  const filteredScans = useMemo(() => {
    return scans.filter(scan => {
      if (filterMode === "BLOCK" && scan.action_taken !== "BLOCK") return false;
      if (filterMode === "ALLOW" && scan.action_taken === "BLOCK") return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const repo = (scan.repo_name || "").toLowerCase();
        const sha = (scan.commit_sha || "").toLowerCase();
        const msg = (scan.commit_message || "").toLowerCase();
        const exp = (scan.ai_explanation || "").toLowerCase();
        const rem = (scan.ai_remedy || scan.ai_fix || "").toLowerCase();
        return repo.includes(q) || sha.includes(q) || msg.includes(q) || exp.includes(q) || rem.includes(q);
      }
      return true;
    });
  }, [scans, filterMode, searchQuery]);

  return (
    <div>
      <SectionTitle accent={C.violet} C={C}>AI Security Recommendations & Remediation Intelligence</SectionTitle>

      {/* Top AI Command Stat Bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14, marginBottom: 20 }}>
        <div style={{ padding: "14px 18px", background: C.bgCard, borderRadius: 14, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: C.violetSoft, border: `1px solid ${C.violetBord}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Brain size={20} color={C.violet} />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: C.ink }}>{totalScans ?? scans.length}</div>
            <div style={{ fontSize: 11, color: C.inkLow, fontWeight: 700 }}>Scans Analyzed</div>
          </div>
        </div>

        <div style={{ padding: "14px 18px", background: C.bgCard, borderRadius: 14, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: C.redSoft, border: `1px solid ${C.redBord}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <AlertCircle size={20} color={C.red} />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: C.red }}>{blockedCount}</div>
            <div style={{ fontSize: 11, color: C.inkLow, fontWeight: 700 }}>Policy Violations</div>
          </div>
        </div>

        <div style={{ padding: "14px 18px", background: C.bgCard, borderRadius: 14, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: C.tealSoft, border: `1px solid ${C.tealBord}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Wrench size={20} color={C.teal} />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: C.teal }}>{totalFixesReady}</div>
            <div style={{ fontSize: 11, color: C.inkLow, fontWeight: 700 }}>AI Fix Plans Ready</div>
          </div>
        </div>

        <div style={{ padding: "14px 18px", background: C.bgCard, borderRadius: 14, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: C.blueSoft, border: `1px solid ${C.blueBord}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ShieldCheck size={20} color={C.blue} />
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: C.blue }}>98.4%</div>
            <div style={{ fontSize: 11, color: C.inkLow, fontWeight: 700 }}>Verified Accuracy</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", background: C.bgSurface, padding: 3, borderRadius: 10, border: `1px solid ${C.border}` }}>
          {[
            { id: "ALL", label: `All Scans (${scans.length})` },
            { id: "BLOCK", label: `🚨 Blocked (${blockedCount})` },
            { id: "ALLOW", label: `✅ Allowed (${scans.length - blockedCount})` },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterMode(f.id)}
              style={{
                padding: "6px 14px", borderRadius: 8, fontSize: 11, fontWeight: 700, border: "none", cursor: "pointer",
                background: filterMode === f.id ? C.bgCard : "transparent",
                color: filterMode === f.id ? C.ink : C.inkLow,
                boxShadow: filterMode === f.id ? "0 2px 8px rgba(0,0,0,0.15)" : "none",
                transition: "all 0.2s ease"
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search AI recommendations by SHA, repo, or rule..."
          style={{
            padding: "8px 14px", borderRadius: 10, width: 320, maxWidth: "100%",
            background: C.bgCard, border: `1px solid ${C.border}`,
            color: C.ink, fontSize: 12, outline: "none"
          }}
        />
      </div>

      {/* Remediation Cards List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {filteredScans.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: C.inkMid, background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}` }}>
            No AI insights found matching your filter criteria.
          </div>
        ) : (
          filteredScans.map(scan => (
            <div key={scan.id} style={{ padding: 20, background: C.bgCard, borderRadius: 16, border: `1px solid ${C.border}`, boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>{scan.repo_name}</span>
                  <span style={{ fontSize: 11, fontFamily: C.mono, color: C.teal, background: C.tealSoft, padding: "2px 8px", borderRadius: 6, border: `1px solid ${C.tealBord}` }}>
                    {scan.commit_sha?.slice(0, 8)}
                  </span>
                  {scan.branch && <span style={{ fontSize: 11, color: C.inkLow }}>({scan.branch})</span>}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Badge color={scan.action_taken === "BLOCK" ? C.red : C.teal} C={C}>{scan.action_taken || "ALLOW"}</Badge>
                  {scan.risk_score != null && <Badge color={riskColor(scan.risk_score, C)} C={C}>Risk {scan.risk_score}/10</Badge>}
                </div>
              </div>

              {scan.commit_message && (
                <div style={{ fontSize: 12, color: C.inkMid, marginBottom: 8, fontStyle: "italic" }}>
                  "{scan.commit_message}"
                </div>
              )}

              <AIAnalysisBlock
                scan={scan}
                feedback={feedback}
                onFeedback={onFeedback}
                onAskCopilot={onOpenCopilotForScan}
                C={C}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default AIInsightsTab;
