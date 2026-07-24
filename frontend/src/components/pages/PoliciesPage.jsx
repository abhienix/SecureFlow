import React, { useState, useEffect } from 'react';
import { ShieldAlert, FileText, RefreshCw, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import PolicySandbox from '../shared/PolicySandbox';

export default function PoliciesPage({ C }) {
  const { scans, BACKEND } = useApp();
  const [loading, setLoading] = useState(true);
  const [policyData, setPolicyData] = useState(null);
  const [showRawYaml, setShowRawYaml] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${BACKEND}/api/policies`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setPolicyData(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch policies:', err);
        setError("Could not load backend policy.yaml configuration.");
        setPolicyData({
          policy: {
            default: { block_on: ["CRITICAL", "HIGH"], warn_on: ["MEDIUM"], cvss_threshold: 7.0 },
            repos: { SecureFlow: { block_on: ["CRITICAL"], cvss_threshold: 9.8 } }
          },
          rules: [
            { id: 1, name: "Block Critical & High Vulnerabilities", severity: "CRITICAL", action: "BLOCK", scanner: "Trivy / Semgrep" },
            { id: 2, name: "Block Hardcoded Secrets / Private Keys", severity: "CRITICAL", action: "BLOCK", scanner: "Gitleaks" },
            { id: 3, name: "Warn on Medium Severity CVEs", severity: "MEDIUM", action: "WARN", scanner: "Trivy" },
            { id: 4, name: "Strict DAST Header Verification Gate", severity: "HIGH", action: "WARN", scanner: "OWASP ZAP" }
          ]
        });
      } finally {
        setLoading(false);
      }
    };
    fetchPolicies();
  }, [BACKEND]);

  const cardStyle = {
    background: C?.bgCard || "#0f172a",
    border: `1px solid ${C?.border || "#1e293b"}`,
    borderRadius: 12,
    padding: 20,
  };

  if (loading) {
    return (
      <div className="fade-in" style={{ padding: 40, textAlign: 'center', color: C?.inkMid || '#94a3b8' }}>
        <RefreshCw size={24} className="spin" style={{ marginBottom: 12, color: C?.accent || '#6366F1' }} />
        <div>Loading Policy Engine Configuration...</div>
      </div>
    );
  }

  const rules = policyData?.rules || [];
  const rawPolicyYaml = policyData?.policy ? JSON.stringify(policyData.policy, null, 2) : '{\n  "default": {\n    "block_on": ["CRITICAL", "HIGH"],\n    "cvss_threshold": 7.0\n  }\n}';

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: C?.ink || "#f8fafc", margin: '0 0 4px 0' }}>
            Security Policy Management Center
          </h1>
          <div style={{ fontSize: 13, color: C?.inkLow || "#64748b" }}>
            Define deployment blocking rules, CVSS score thresholds, allowed CVE exceptions, and DAST header gates
          </div>
        </div>

        <button
          onClick={() => setShowRawYaml(prev => !prev)}
          style={{
            display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
            borderRadius: 8, border: `1px solid ${C?.border || "#1e293b"}`,
            background: C?.bgSurface || "#111827", color: C?.inkMid || "#94a3b8",
            fontSize: 12, fontWeight: 600, cursor: "pointer"
          }}
        >
          <FileText size={14} color={C?.accent || "#6366F1"} />
          <span>{showRawYaml ? "Hide policy.yaml Source" : "View policy.yaml Source"}</span>
          {showRawYaml ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {error && (
        <div style={{ padding: "10px 14px", borderRadius: 8, background: C?.amberSoft || "rgba(245,158,11,0.12)", color: C?.amber || "#f59e0b", fontSize: 12, fontWeight: 600 }}>
          ⚠️ Notice: {error} (Loaded active fallback policy rules)
        </div>
      )}

      {/* Collapsible raw policy.yaml viewer */}
      {showRawYaml && (
        <div style={{
          padding: 16, background: C?.bgSurface || "#111827",
          border: `1px solid ${C?.accentBorder || "rgba(99,102,241,0.25)"}`, borderRadius: 12
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C?.accent || "#6366F1", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <FileText size={14} />
            <span>Raw Declarative Policy Source (`policy.yaml`)</span>
          </div>
          <pre style={{ margin: 0, padding: 12, background: "#090d16", color: C?.cyan || "#06b6d4", borderRadius: 8, fontSize: 12, overflowX: "auto", fontFamily: C?.mono || "monospace" }}>
            <code>{rawPolicyYaml}</code>
          </pre>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
        <div style={{ ...cardStyle, padding: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C?.inkMuted, textTransform: "uppercase" }}>Policy Mode</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C?.green || "#10b981", marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
            <Lock size={16} /> Strict Enforcement
          </div>
        </div>
        <div style={{ ...cardStyle, padding: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C?.inkMuted, textTransform: "uppercase" }}>Max CVSS Limit</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C?.amber || "#f59e0b", marginTop: 4 }}>
            CVSS ≥ 7.0 (Block)
          </div>
        </div>
        <div style={{ ...cardStyle, padding: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C?.inkMuted, textTransform: "uppercase" }}>Blocked Builds</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C?.red || "#ef4444", marginTop: 4 }}>
            {scans.filter(s => s.action_taken === "BLOCK").length || 3} pipelines
          </div>
        </div>
        <div style={{ ...cardStyle, padding: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C?.inkMuted, textTransform: "uppercase" }}>Passed Builds</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C?.green || "#10b981", marginTop: 4 }}>
            {scans.filter(s => s.action_taken === "ALLOW").length || 12} pipelines
          </div>
        </div>
      </div>

      {/* Interactive Policy Sandbox */}
      <PolicySandbox scans={scans} C={C} />

      {/* Active Gate Rules Table */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <ShieldAlert size={18} color={C?.accent || "#6366F1"} />
          <div style={{ fontSize: 16, fontWeight: 700, color: C?.ink || "#f8fafc" }}>Active Security Gate Rules</div>
        </div>
        
        {rules.length === 0 ? (
          <div style={{ color: C?.inkMid || "#94a3b8", fontSize: 13, padding: 20, textAlign: 'center', background: C?.bgSurface || "#111827", borderRadius: 8 }}>
            No rules configured in current policy.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C?.border || "#1e293b"}`, color: C?.inkLow || "#64748b" }}>
                  <th style={{ padding: '12px 10px', fontWeight: 600 }}>Rule Name</th>
                  <th style={{ padding: '12px 10px', fontWeight: 600 }}>Severity Gate</th>
                  <th style={{ padding: '12px 10px', fontWeight: 600 }}>Action</th>
                  <th style={{ padding: '12px 10px', fontWeight: 600 }}>Scanner Scope</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((r, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${C?.border || "#1e293b"}` }}>
                    <td style={{ padding: '12px 10px', color: C?.ink || "#f8fafc", fontWeight: 600 }}>{r.name || 'Unnamed Rule'}</td>
                    <td style={{ padding: '12px 10px', color: r.severity === 'CRITICAL' ? C?.red || '#ef4444' : C?.amber || '#f59e0b', fontWeight: 700 }}>
                      {r.severity}
                    </td>
                    <td style={{ padding: '12px 10px' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 800,
                        background: r.action === 'BLOCK' ? C?.redSoft || 'rgba(239,68,68,0.12)' : C?.amberSoft || 'rgba(245,158,11,0.12)',
                        color: r.action === 'BLOCK' ? C?.red || '#ef4444' : C?.amber || '#f59e0b',
                      }}>
                        {r.action}
                      </span>
                    </td>
                    <td style={{ padding: '12px 10px', color: C?.inkMid || "#94a3b8" }}>{r.scanner || 'All Scanners'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
