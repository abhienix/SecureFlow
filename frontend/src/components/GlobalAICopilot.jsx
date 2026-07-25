import React, { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { X, Send, Bot, User, Terminal, RefreshCw } from "lucide-react";
import { useFindings, useScans } from "../hooks/useApi";
import { api } from "../lib/api";
import { useUIStore } from "../stores/uiStore";
import FormattedCopilotMessage from "./shared/FormattedCopilotMessage";
import VoidCoreIcon from "./shared/VoidCoreIcon";

export default function GlobalAICopilot({ C, isOpen, onClose }) {
  const location = useLocation();
  const { data: scans = [] } = useScans();
  const { data: findings = [] } = useFindings();
  const { activeVoidContext, setVoidContext } = useUIStore();
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "ai",
      text: "Hello! I am **Void** — SecureFlow's Autonomous DevSecOps Core AI. I have complete real-time RAG context over your pipeline runs, policy.yaml rules, Gitleaks secrets, Semgrep SAST findings, Trivy container CVEs, and OWASP ZAP DAST probes. How can I assist you?",
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

  const currentRouteName = location.pathname.split("/")[1] || "overview";
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
      const payloadContext = {
        route: location.pathname,
        repo: activeScan.repo_name || "abhienix/SecureFlow",
        commit: activeScan.commit_sha || "HEAD",
        active_findings_count: findings.length,
        ...(activeVoidContext || {}),
      };

      const data = await api.getCopilotAnswer(queryText, activeScan.id, payloadContext);
      const aiReply = data.answer;

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
        position: "absolute", top: 0, right: 0, bottom: 0, width: 500, maxWidth: "94vw",
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
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <VoidCoreIcon />
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 900, color: C?.ink || "#f8fafc", margin: 0, letterSpacing: "-0.3px" }}>
                Void Security Core AI
              </h3>
              <span style={{ fontSize: 11, color: C?.cyan || "#00f2fe", fontWeight: 700 }}>
                Context RAG: {currentRouteName.toUpperCase()}
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
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, fontSize: 11, color: C.accent, fontWeight: 600
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            <Terminal size={13} />
            {activeVoidContext ? (
              <span>Context: {String(activeVoidContext.stage || activeVoidContext.scanner || activeVoidContext.cve || activeVoidContext.title || "Active Resource")} ({String(activeVoidContext.repo || activeScan.repo_name || "SecureFlow")})</span>
            ) : (
              <span>Active Repo: {activeScan.repo_name || "SecureFlow"} | SHA: {(activeScan.commit_sha || "HEAD").substring(0, 7)}</span>
            )}
          </div>
          {activeVoidContext && (
            <button
              onClick={() => setVoidContext(null)}
              style={{ background: "transparent", border: "none", color: C.accent, cursor: "pointer", fontSize: 10, fontWeight: 700 }}
            >
              Clear Context
            </button>
          )}
        </div>

        {/* Messages Body */}
        <div style={{ flex: 1, padding: 16, overflowY: "auto", overflowX: "hidden", display: "flex", flexDirection: "column", gap: 14 }}>
          {messages.map(msg => (
            <div key={msg.id} style={{
              display: "flex", gap: 10,
              alignSelf: msg.sender === "user" ? "flex-end" : "flex-start",
              maxWidth: "92%", minWidth: 0,
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
                minWidth: 0, maxWidth: "100%", wordBreak: "break-word", overflowWrap: "anywhere",
                boxSizing: "border-box"
              }}>
                {msg.sender === "user" ? msg.text : <FormattedCopilotMessage text={msg.text} C={C} />}
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
