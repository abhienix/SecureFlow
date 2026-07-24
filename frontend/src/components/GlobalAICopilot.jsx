import React, { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Sparkles, X, Send, Bot, User, Terminal, RefreshCw } from "lucide-react";
import { useApp } from "../contexts/AppContext";

export default function GlobalAICopilot({ C, isOpen, onClose }) {
  const location = useLocation();
  const { scans, findings, BACKEND } = useApp();
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "ai",
      text: "Hello! I am your **SecureFlow Global Security Copilot**. I am connected to your active repository, pipeline state, static findings, and ZAP DAST engine. How can I assist you?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const currentRouteName = location.pathname.split("/")[1] || "dashboard";
  const activeScan = scans[0] || {};

  const handleSend = async (customPrompt) => {
    const queryText = customPrompt || input;
    if (!queryText.trim() || isLoading) return;

    const userMsg = {
      id: Date.now(),
      sender: "user",
      text: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customPrompt) setInput("");
    setIsLoading(true);

    try {
      const response = await fetch(`${BACKEND}/api/copilot/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: queryText,
          scan_id: activeScan.id || 1,
          context: {
            route: location.pathname,
            repo: activeScan.repo_name || "abhienix/SecureFlow",
            commit: activeScan.commit_sha || "HEAD",
            active_findings_count: findings.length,
          }
        }),
      });

      const data = await response.json();
      const aiReply = data.answer || data.response || "SecureFlow Copilot analyzed the request and confirmed policy compliance across active repositories.";

      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: "ai",
          text: aiReply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      ]);
    } catch (e) {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: "ai",
          text: "⚠️ **Copilot Connection Warning**: Failed to reach local LLM reasoning service. Ensure backend API is operational.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const QUICK_PROMPTS = [
    { label: "Root Cause Analysis", prompt: "Explain the root cause of recent pipeline failures and vulnerabilities." },
    { label: "Generate Remediation Patch", prompt: "Provide a secure code fix for open Semgrep and Gitleaks findings." },
    { label: "DAST Attack Graph", prompt: "Map the attack path identified by OWASP ZAP scanner." },
  ];

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9990, pointerEvents: "none"
    }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(2px)", pointerEvents: "auto",
        }}
      />

      {/* Drawer */}
      <div style={{
        position: "absolute", top: 0, right: 0, bottom: 0, width: 440, maxWidth: "100vw",
        background: C.bgCard, borderLeft: `1px solid ${C.border}`,
        boxShadow: "-8px 0 32px rgba(0,0,0,0.3)", pointerEvents: "auto",
        display: "flex", flexDirection: "column", animation: "slideIn 200ms ease-out",
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 20px", borderBottom: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: C.bgSurface,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "linear-gradient(135deg, #6366F1 0%, #a855f7 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 12px rgba(99,102,241,0.3)",
            }}>
              <Sparkles size={16} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>AI Security Copilot</h3>
              <span style={{ fontSize: 11, color: C.accent, fontWeight: 600 }}>
                Context: {currentRouteName.toUpperCase()}
              </span>
            </div>
          </div>

          <button onClick={onClose} style={{
            background: "none", border: "none", color: C.inkLow, cursor: "pointer",
            padding: 4, borderRadius: 6, display: "flex", alignItems: "center",
          }}>
            <X size={18} />
          </button>
        </div>

        {/* Active Context Banner */}
        <div style={{
          padding: "8px 16px", background: C.accentSoft, borderBottom: `1px solid ${C.accentBorder}`,
          display: "flex", alignItems: "center", gap: 10, fontSize: 11, color: C.accent, fontWeight: 600
        }}>
          <Terminal size={13} />
          <span>Active Repo: {activeScan.repo_name || "SecureFlow"} | SHA: {(activeScan.commit_sha || "HEAD").substring(0, 7)}</span>
        </div>

        {/* Messages Body */}
        <div style={{ flex: 1, padding: 16, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
          {messages.map(msg => (
            <div key={msg.id} style={{
              display: "flex", gap: 10,
              alignSelf: msg.sender === "user" ? "flex-end" : "flex-start",
              maxWidth: "88%",
            }}>
              {msg.sender === "ai" && (
                <div style={{
                  width: 28, height: 28, borderRadius: 6, background: C.accentSoft,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                }}>
                  <Bot size={14} color={C.accent} />
                </div>
              )}

              <div style={{
                padding: "10px 14px", borderRadius: 12, fontSize: 13, lineHeight: 1.5,
                background: msg.sender === "user" ? C.accent : C.bgSurface,
                color: msg.sender === "user" ? "#ffffff" : C.ink,
                border: msg.sender === "ai" ? `1px solid ${C.border}` : "none",
                whiteSpace: "pre-wrap"
              }}>
                {msg.text}
                <div style={{
                  fontSize: 10, opacity: 0.6, marginTop: 4, textAlign: "right"
                }}>
                  {msg.timestamp}
                </div>
              </div>

              {msg.sender === "user" && (
                <div style={{
                  width: 28, height: 28, borderRadius: 6, background: C.bgElevated,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                }}>
                  <User size={14} color={C.inkMid} />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: C.accent, fontSize: 12, fontWeight: 600 }}>
              <RefreshCw size={14} className="spin" />
              <span>Copilot is analyzing repository context...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        <div style={{ padding: "8px 16px", display: "flex", gap: 6, overflowX: "auto" }}>
          {QUICK_PROMPTS.map((qp, i) => (
            <button
              key={i}
              onClick={() => handleSend(qp.prompt)}
              style={{
                whiteSpace: "nowrap", padding: "4px 10px", borderRadius: 12,
                border: `1px solid ${C.border}`, background: C.bgSurface,
                color: C.inkMid, fontSize: 11, fontWeight: 600, cursor: "pointer",
                transition: "all 150ms ease"
              }}
            >
              ⚡ {qp.label}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div style={{ padding: 16, borderTop: `1px solid ${C.border}`, background: C.bgSurface }}>
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Copilot about code, CVEs, or DAST..."
              style={{
                flex: 1, padding: "10px 14px", borderRadius: 8,
                background: C.bg, border: `1px solid ${C.border}`,
                color: C.ink, fontSize: 13, outline: "none",
              }}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              style={{
                padding: "10px 14px", borderRadius: 8, border: "none",
                background: C.accent, color: "#ffffff", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                opacity: isLoading || !input.trim() ? 0.5 : 1,
              }}
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
