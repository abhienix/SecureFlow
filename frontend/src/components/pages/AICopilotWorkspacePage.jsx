import React, { useState } from "react";
import { Send, Bot, Code2 } from "lucide-react";
import FormattedCopilotMessage from "../shared/FormattedCopilotMessage";
import FormattedRemedyView from "../shared/FormattedRemedyView";
import VoidCoreIcon from "../shared/VoidCoreIcon";
import { BACKEND } from "../../contexts/AppContext";

export default function AICopilotWorkspacePage({ scans = [], C }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hello! I am Void — SecureFlow's Autonomous DevSecOps Core AI. I have complete RAG context over your pipeline runs, policy.yaml rules, Gitleaks secrets, Semgrep SAST findings, Trivy container CVEs, and OWASP ZAP DAST probes."
    }
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [focusScanId, setFocusScanId] = useState(scans[0]?.id || null);

  const activeScan = scans.find(s => s.id === focusScanId) || scans[0] || {};

  const handleSend = async (q) => {
    const question = q || input.trim();
    if (!question || sending) return;
    setInput("");

    setMessages(prev => [...prev, { role: "user", text: question }]);
    setSending(true);

    try {
      const res = await fetch(`${BACKEND}/api/copilot/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, scan_id: focusScanId })
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", text: data?.answer || "Analysis complete." }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", text: "Unable to reach Void AI API." }]);
    } finally {
      setSending(false);
    }
  };

  const QUICK_PROMPTS = [
    "🛡️ List critical vulnerabilities in this repo",
    "⚡ How to fix Gitleaks hardcoded secret?",
    "🔒 Explain policy gate decision for this commit",
    "🐳 Provide Dockerfile hardening code patch",
    "🌐 Summarize OWASP ZAP DAST alert findings"
  ];

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 16, height: "calc(100vh - 120px)" }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: C?.ink || "#f8fafc", margin: "0 0 4px 0" }}>
          Void Security Core AI Workspace
        </h1>
        <span style={{ fontSize: 13, color: C?.inkLow || "#64748b" }}>
          Contextual RAG AI Security Engine analyzing live pipeline telemetry, scanner findings, and code patches
        </span>
      </div>

      {/* 3-Panel Layout Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.2fr 1fr", gap: 16, flex: 1, minHeight: 0 }}>
        
        {/* Left Panel: Chat Thread & Input */}
        <div style={{
          background: C?.bgCard || "#0f172a", border: `1px solid ${C?.border || "#1e293b"}`, borderRadius: 12,
          padding: 16, display: "flex", flexDirection: "column", gap: 12
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${C?.border || "#1e293b"}`, paddingBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <VoidCoreIcon />
              <h3 style={{ fontSize: 15, fontWeight: 800, color: C?.ink || "#f8fafc", margin: 0 }}>Void AI Conversation</h3>
            </div>
            <span style={{ fontSize: 11, color: C?.green || "#10b981", fontWeight: 700 }}>RAG Active</span>
          </div>

          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, paddingRight: 4 }}>
            {messages.map((m, idx) => (
              <div key={idx} style={{ display: "flex", gap: 10, justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                {m.role === "assistant" && <Bot size={20} color="#6366F1" />}
                <div style={{
                  padding: "10px 14px", borderRadius: 8, fontSize: 13, lineHeight: 1.5,
                  background: m.role === "user" ? (C?.accent || "#6366F1") : (C?.bgSurface || "#111827"),
                  color: m.role === "user" ? "#ffffff" : (C?.ink || "#f8fafc"),
                  border: m.role === "assistant" ? `1px solid ${C?.border || "#1e293b"}` : "none",
                  maxWidth: "85%"
                }}>
                  <FormattedCopilotMessage text={m.text} C={C} />
                </div>
              </div>
            ))}
          </div>

          {/* Quick Prompts */}
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
            {QUICK_PROMPTS.map((qp, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(qp)}
                style={{
                  fontSize: 10, padding: "4px 8px", borderRadius: 12, background: "rgba(99,102,241,0.10)",
                  border: "1px solid rgba(99,102,241,0.20)", color: "#6366F1", cursor: "pointer", whiteSpace: "nowrap"
                }}
              >
                {qp}
              </button>
            ))}
          </div>

          {/* Input Field */}
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask AI about vulnerabilities, fixes, or policy rules..."
              style={{
                flex: 1, padding: "8px 12px", background: C?.bgSecondary, border: `1px solid ${C?.borderDefault}`,
                borderRadius: 6, color: C?.textPrimary, fontSize: 13, outline: "none"
              }}
            />
            <button onClick={() => handleSend()} className="btn-primary" style={{ padding: "8px 14px" }}>
              <Send size={14} />
            </button>
          </div>
        </div>

        {/* Middle Panel: Current Scan Context & Remedy View */}
        <div style={{
          background: C?.bgCard || "#13151A", border: `1px solid ${C?.borderDefault}`, borderRadius: 8,
          padding: 16, display: "flex", flexDirection: "column", gap: 12, overflowY: "auto"
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${C?.borderSubtle}`, paddingBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Code2 size={18} color="#22C55E" />
              <h3 style={{ fontSize: 14, fontWeight: 800, color: C?.textPrimary }}>Code Fix & Remedy Diff</h3>
            </div>
          </div>

          {/* Focus Scan Picker */}
          <div>
            <label style={{ fontSize: 11, color: C?.textMuted, fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: 4 }}>Select Context Scan Run</label>
            <select
              value={focusScanId || ""}
              onChange={(e) => setFocusScanId(Number(e.target.value))}
              style={{ width: "100%", padding: "6px", background: C?.bgSecondary, border: `1px solid ${C?.borderDefault}`, color: C?.textPrimary, borderRadius: 6, fontSize: 12 }}
            >
              {scans.map(s => (
                <option key={s.id} value={s.id}>#{s.id} · {s.repo_name} ({(s.commit_sha || '').substring(0,8)}) · {s.action_taken}</option>
              ))}
            </select>
          </div>

          <FormattedRemedyView scan={activeScan} C={C} />
        </div>

        {/* Right Panel: Linked Context & RAG Metadata */}
        <div style={{
          background: C?.bgCard || "#13151A", border: `1px solid ${C?.borderDefault}`, borderRadius: 8,
          padding: 16, display: "flex", flexDirection: "column", gap: 14
        }}>
          <div style={{ borderBottom: `1px solid ${C?.borderSubtle}`, paddingBottom: 10 }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: C?.textPrimary }}>RAG Context & Telemetry</h3>
          </div>

          <div style={{ background: C?.bgSecondary, padding: 12, borderRadius: 6, fontSize: 12, color: C?.textMuted, display: "flex", flexDirection: "column", gap: 6 }}>
            <div><strong>Repository:</strong> {activeScan.repo_name || "abhienix/SecureFlow"}</div>
            <div><strong>Commit SHA:</strong> {(activeScan.commit_sha || "7ddbbe8f").substring(0, 8)}</div>
            <div><strong>Policy Decision:</strong> {activeScan.action_taken || "ALLOW"}</div>
            <div><strong>DAST Status:</strong> {activeScan.dast_status || "completed"}</div>
          </div>

          <div style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.20)", padding: 12, borderRadius: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#6366F1", textTransform: "uppercase" }}>Active Scanners Vectorized</span>
            <div style={{ fontSize: 12, color: C?.textSecondary, marginTop: 6 }}>
              • Gitleaks Secrets Engine<br />
              • Semgrep SAST Ruleset<br />
              • Trivy Container CVE Database<br />
              • OWASP ZAP DAST Probe
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
