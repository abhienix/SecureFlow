import React, { useState, useEffect, useRef } from "react";
import { X, Minimize2, Send, Wrench, Copy, Loader2 } from "lucide-react";
import { BACKEND } from "../theme";
import VoidCoreIcon from "./shared/VoidCoreIcon";
import FormattedCopilotMessage from "./shared/FormattedCopilotMessage";

export function AICopilot({ scans, onClose, C }) {
  const [messages, setMessages] = useState([{
    role: "assistant",
    text: "Void security companion online. Ask me about live pipeline scans, policy rules, OWASP Top 10 vulnerabilities, or CVE remediation.",
  }]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [minimised, setMinimised] = useState(false);
  const [focusScanId, setFocusScanId] = useState(scans[0]?.id || null);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (q) => {
    const question = q || input.trim();
    if (!question || sending) return;
    setInput("");
    const nextMessages = [...messages, { role: "user", text: question }];
    setMessages(nextMessages);
    setSending(true);

    try {
      const res = await fetch(`${BACKEND}/api/copilot/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, scan_id: focusScanId }),
      });
      const data = await res.json();
      setMessages(m => [...m, { role: "assistant", text: data?.answer || "AI response generated successfully." }]);
    } catch {
      setMessages(m => [...m, { role: "assistant", text: "Unable to contact Void backend." }]);
    } finally {
      setSending(false);
    }
  };

  const QUICK_PROMPTS = [
    "🛡️ List OWASP Top 10 risks",
    "⚡ How to remediate active CVEs?",
    "🔒 Explain Policy Gate rules",
    "🐳 Docker Container Hardening Tips",
    "🔑 How to fix Gitleaks secrets?",
  ];

  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 500 }}>
      {minimised ? (
        <button
          onClick={() => setMinimised(false)}
          className="copilot-btn-glow"
          style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "8px 18px", borderRadius: 999,
            background: "linear-gradient(135deg, #0f172a 0%, #090d16 100%)",
            border: "1px solid rgba(0, 242, 254, 0.4)",
            color: "#FFFFFF", fontSize: 13, fontWeight: 800,
            cursor: "pointer",
            boxShadow: "0 8px 32px rgba(121, 40, 202, 0.4)",
          }}
        >
          <div style={{ transform: "scale(0.85)", margin: "-4px 0" }}>
            <VoidCoreIcon />
          </div>
          <span className="void-text-cyber" style={{ fontSize: 12, fontWeight: 900 }}>Void</span>
        </button>
      ) : (
        <div style={{
          background: C.bgCard, border: `1px solid ${C.isDark ? "rgba(0, 242, 254, 0.3)" : C.border}`,
          borderRadius: 20, width: 420, maxWidth: "94vw",
          height: 580, display: "flex", flexDirection: "column",
          boxShadow: "0 24px 64px rgba(0,0,0,.5)", overflow: "hidden",
          backdropFilter: "blur(12px)"
        }}>
          {/* Animated Header */}
          <div style={{
            padding: "14px 18px", borderBottom: `1px solid ${C.border}`,
            background: "linear-gradient(135deg, #18192A 0%, #0D0E1A 100%)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <VoidCoreIcon />
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span className="void-text-cyber" style={{ fontSize: 15, fontWeight: 900, color: "#FFFFFF" }}>Void</span>
                  <span style={{ fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 8, background: "rgba(0,223,216,0.2)", color: "#00DFD8", border: "1px solid rgba(0,223,216,0.4)" }}>
                    ACTIVE
                  </span>
                </div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)" }}>Vulnerability Analytics & Remediation Gate</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <button onClick={() => setMinimised(true)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", padding: 4, cursor: "pointer" }}><Minimize2 size={15} /></button>
              <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", padding: 4, cursor: "pointer" }}><X size={15} /></button>
            </div>
          </div>

          {/* Focus Scan Picker */}
          <div style={{ padding: "6px 14px", background: C.bgSurface, borderBottom: `1px solid ${C.border}` }}>
            <label style={{ fontSize: 10, color: C.inkLow, fontWeight: 700, textTransform: "uppercase", display: "block", marginBottom: 2 }}>Focus Scan Context</label>
            <select
              value={focusScanId || ""}
              onChange={e => setFocusScanId(Number(e.target.value) || null)}
              style={{ width: "100%", padding: "5px 8px", borderRadius: 6, background: C.bgCard, border: `1px solid ${C.border}`, color: C.ink, fontSize: 11, fontFamily: C.mono, outline: "none" }}
            >
              {scans.slice(0, 15).map(s => (
                <option key={s.id} value={s.id}>#{s.id} · {s.repo_name} ({s.commit_sha?.slice(0, 8)}) · {s.action_taken}</option>
              ))}
            </select>
          </div>

          {/* Messages Body */}
          <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
            {messages.map((m, idx) => (
              <div key={idx} style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "88%", display: "flex", flexDirection: "column", gap: 4
              }}>
                <div style={{
                  padding: "10px 14px", borderRadius: 12,
                  background: m.role === "user" ? "linear-gradient(135deg, #0077B6 0%, #0096C7 100%)" : C.bgSurface,
                  border: `1px solid ${m.role === "user" ? "#00B4D8" : C.border}`,
                  color: m.role === "user" ? "#FFFFFF" : C.ink, fontSize: 12, lineHeight: 1.5,
                  boxShadow: m.role === "user" ? "0 4px 12px rgba(0,180,216,0.2)" : "none"
                }}>
                  {m.role === "user" ? m.text : <FormattedCopilotMessage text={m.text} C={C} onCveClick={(prompt) => send(prompt)} />}
                </div>

                {/* Per-message Interactive Quick Action Buttons */}
                {m.role === "assistant" && idx > 0 && (
                  <div style={{ display: "flex", gap: 6, alignItems: "center", paddingLeft: 4 }}>
                    <button
                      onClick={() => send("How to fix top CVEs in code step-by-step?")}
                      style={{
                        padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700,
                        background: C.tealSoft, border: `1px solid ${C.tealBorder}`, color: C.teal,
                        cursor: "pointer", display: "flex", alignItems: "center", gap: 3
                      }}
                    >
                      <Wrench size={10} /> How to Fix
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(m.text);
                      }}
                      style={{
                        padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600,
                        background: C.bgCard, border: `1px solid ${C.border}`, color: C.inkMid,
                        cursor: "pointer", display: "flex", alignItems: "center", gap: 3
                      }}
                    >
                      <Copy size={10} /> Copy
                    </button>
                  </div>
                )}
              </div>
            ))}
            {sending && (
              <div style={{ alignSelf: "flex-start", color: C.teal, fontSize: 12, display: "flex", alignItems: "center", gap: 6, background: C.bgSurface, padding: "8px 12px", borderRadius: 10, border: `1px solid ${C.border}` }}>
                <Loader2 size={14} className="spin" color={C.cyan} /> Interrogating Void security core...
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Footer & Quick Prompts */}
          <div style={{ padding: 12, borderTop: `1px solid ${C.border}`, background: C.bgSurface }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 10, overflowX: "auto", paddingBottom: 4 }}>
              {QUICK_PROMPTS.map((p, i) => (
                <button
                  key={i} onClick={() => send(p.replace(/^[^\s]+\s*/, ""))}
                  style={{
                    padding: "5px 10px", borderRadius: 999, whiteSpace: "nowrap",
                    background: C.bgCard, border: `1px solid ${C.border}`,
                    color: C.inkMid, fontSize: 10, fontWeight: 700, cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                >
                  {p}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && send()}
                placeholder="Ask Void..."
                style={{
                  flex: 1, padding: "9px 14px", borderRadius: 10,
                  background: C.bgCard, border: `1px solid ${C.border}`,
                  color: C.ink, fontSize: 12, outline: "none",
                }}
              />
              <button
                onClick={() => send()}
                disabled={sending || !input.trim()}
                style={{
                  padding: "9px 16px", borderRadius: 10,
                  background: "linear-gradient(135deg, #7928CA 0%, #00DFD8 100%)",
                  border: "none", color: "#FFF", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}
              >
                <Send size={15} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AICopilot;
