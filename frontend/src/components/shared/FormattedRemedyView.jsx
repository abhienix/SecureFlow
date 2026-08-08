import React from "react";
import { CheckCircle, AlertTriangle, Code, Terminal, Shield } from "lucide-react";

export function FormattedRemedyView({ text, C }) {
  if (!text) return null;

  // Try to detect numbered steps (e.g. "1. ...", "2. ...")
  const stepRegex = /(\d+\.\s+[^\d]+(?=\d+\.|$))/g;
  const steps = text.match(stepRegex);

  // Render inline formatting: bold, code, CVE IDs
  const renderInline = (str) => {
    if (!str) return null;
    const parts = str.split(/(\*\*.*?\*\*|`[^`]+`|CVE-\d{4}-\d+)/gi);
    return parts.map((part, idx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={idx} style={{ color: C.isDark ? "#F1F5F9" : "#0F172A", fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code key={idx} style={{
            background: C.isDark ? "rgba(99,102,241,0.12)" : "rgba(79,70,229,0.08)",
            color: C.isDark ? "#818CF8" : "#4F46E5",
            padding: "1px 6px", borderRadius: 4, fontSize: 11,
            fontFamily: C.mono || "monospace", fontWeight: 600
          }}>{part.slice(1, -1)}</code>
        );
      }
      if (/^CVE-\d{4}-\d+$/i.test(part)) {
        return (
          <span key={idx} style={{
            background: C.isDark ? "rgba(239,68,68,0.12)" : "rgba(220,38,38,0.08)",
            color: C.red, border: `1px solid ${C.redBorder}`,
            padding: "1px 6px", borderRadius: 6, fontSize: 10, fontWeight: 800,
            fontFamily: C.mono || "monospace"
          }}>🚨 {part}</span>
        );
      }
      return part;
    });
  };

  // Detect code blocks within step text
  const renderStepContent = (cleanText) => {
    const codeBlockRegex = /```([a-zA-Z]*)\n?([\s\S]*?)```/g;
    const segments = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(cleanText)) !== null) {
      if (match.index > lastIndex) {
        segments.push({ type: "text", content: cleanText.substring(lastIndex, match.index) });
      }
      segments.push({ type: "code", lang: match[1] || "bash", content: match[2] });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < cleanText.length) {
      segments.push({ type: "text", content: cleanText.substring(lastIndex) });
    }

    return segments.map((seg, idx) => {
      if (seg.type === "code") {
        return (
          <div key={idx} style={{
            marginTop: 8, borderRadius: 8, overflow: "hidden",
            border: `1px solid ${C.isDark ? "#334155" : "#E2E8F0"}`,
            background: C.isDark ? "#090D16" : "#F8FAFC"
          }}>
            <div style={{
              padding: "4px 10px", fontSize: 9, fontWeight: 700,
              color: C.isDark ? "#64748B" : "#94A3B8",
              background: C.isDark ? "#111827" : "#F1F5F9",
              borderBottom: `1px solid ${C.isDark ? "#1E293B" : "#E2E8F0"}`,
              textTransform: "uppercase", fontFamily: C.mono || "monospace",
              display: "flex", alignItems: "center", gap: 4
            }}>
              <Code size={10} /> {seg.lang}
            </div>
            <pre style={{
              margin: 0, padding: 10, fontSize: 11, lineHeight: 1.5,
              color: C.isDark ? "#38BDF8" : "#0F172A",
              fontFamily: C.mono || "monospace", background: "transparent",
              whiteSpace: "pre-wrap", wordBreak: "break-all", overflowX: "auto"
            }}>
              <code>{seg.content}</code>
            </pre>
          </div>
        );
      }
      // Text with sub-bullets
      const lines = seg.content.split("\n").filter(l => l.trim());
      return (
        <div key={idx} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {lines.map((line, li) => {
            const trimmed = line.trim();
            if (trimmed.startsWith("- ") || trimmed.startsWith("• ") || trimmed.startsWith("* ")) {
              return (
                <div key={li} style={{ display: "flex", gap: 6, alignItems: "flex-start", paddingLeft: 4 }}>
                  <span style={{ color: C.accent, fontWeight: 800, fontSize: 11, flexShrink: 0, marginTop: 2 }}>•</span>
                  <span style={{ fontSize: 12, color: C.isDark ? "#CBD5E1" : "#334155", lineHeight: 1.5 }}>
                    {renderInline(trimmed.replace(/^[-•*]\s*/, ""))}
                  </span>
                </div>
              );
            }
            return (
              <div key={li} style={{ fontSize: 12, color: C.isDark ? "#CBD5E1" : "#334155", lineHeight: 1.6 }}>
                {renderInline(trimmed)}
              </div>
            );
          })}
        </div>
      );
    });
  };

  if (steps && steps.length > 1) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
        {steps.map((st, idx) => {
          const cleanText = st.replace(/^\d+\.\s*/, "").trim();
          const stepIcons = [Shield, AlertTriangle, Code, Terminal, CheckCircle];
          const StepIcon = stepIcons[idx % stepIcons.length];
          return (
            <div
              key={idx}
              style={{
                display: "flex", gap: 12, alignItems: "flex-start",
                padding: "12px 14px", borderRadius: 10,
                background: C.isDark ? "#1E293B" : "#F8FAFC",
                border: `1px solid ${C.isDark ? "#334155" : "#E2E8F0"}`,
                boxShadow: C.isDark ? "0 2px 6px rgba(0,0,0,0.15)" : "0 1px 4px rgba(0,0,0,0.04)"
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: "linear-gradient(135deg, #0284C7 0%, #00F2FE 100%)",
                color: "#FFFFFF", fontSize: 12, fontWeight: 900,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, boxShadow: "0 2px 6px rgba(0,242,254,0.3)"
              }}>
                {idx + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {renderStepContent(cleanText)}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Fallback: render as formatted text with code blocks
  return (
    <div style={{
      fontSize: 12, color: C.isDark ? "#F8FAFC" : "#0F172A",
      lineHeight: 1.6, marginTop: 8
    }}>
      {renderStepContent(text)}
    </div>
  );
}

export default FormattedRemedyView;
