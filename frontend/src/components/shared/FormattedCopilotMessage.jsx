import React from "react";

export function renderFormattedInline(str, C, onCveClick) {
  if (!str) return null;
  const parts = str.split(/(\bCVE-\d{4}-\d+\b|\*\*.*?\*\*|`.*?`)/gi);
  return parts.map((part, idx) => {
    if (/^CVE-\d{4}-\d+$/i.test(part)) {
      return (
        <span
          key={idx}
          onClick={() => onCveClick?.(`How to fix ${part} in code?`)}
          title={`Click to ask Void how to fix ${part}`}
          style={{
            display: "inline-flex", alignItems: "center", gap: 3,
            background: C?.redSoft || "rgba(239,68,68,0.12)",
            color: C?.red || "#ef4444",
            border: `1px solid ${C?.redBorder || "rgba(239,68,68,0.25)"}`,
            padding: "1px 6px", borderRadius: 6, fontSize: 11, fontWeight: 800,
            fontFamily: C?.mono || "monospace", cursor: "pointer", margin: "0 2px",
            wordBreak: "break-word"
          }}
        >
          🚨 {part}
        </span>
      );
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={idx} style={{ color: C?.ink || "#f8fafc", fontWeight: 700, wordBreak: "break-word" }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={idx} style={{
          background: C?.isDark ? "rgba(99,102,241,0.1)" : "rgba(79,70,229,0.08)",
          color: C?.isDark ? "#6366F1" : "#4F46E5", padding: "1px 6px", borderRadius: 4,
          fontSize: 12, fontFamily: C?.mono || "monospace", fontWeight: 600,
          wordBreak: "break-all"
        }}>
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

export function FormattedCopilotMessage({ text, C, onCveClick }) {
  if (!text) return null;

  // Split text by code blocks ```
  const codeBlockRegex = /```([a-zA-Z]*)\n([\s\S]*?)```/g;
  const elements = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(text)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      const textBefore = text.substring(lastIndex, match.index);
      elements.push(
        <RenderTextLines key={`text-${lastIndex}`} text={textBefore} C={C} onCveClick={onCveClick} />
      );
    }

    const lang = match[1] || "code";
    const codeContent = match[2];

    elements.push(
      <div key={`code-${match.index}`} style={{
        margin: "10px 0", borderRadius: 8, overflow: "hidden",
        border: `1px solid ${C?.isDark ? "#1e293b" : "#E2E8F0"}`,
        background: C?.isDark ? "#090d16" : "#F8FAFC", boxShadow: C?.shadow || "0 2px 8px rgba(0,0,0,0.2)",
        maxWidth: "100%", boxSizing: "border-box"
      }}>
        <div style={{
          padding: "6px 12px", background: C?.isDark ? "#111827" : "#F1F5F9", borderBottom: `1px solid ${C?.isDark ? "#1e293b" : "#E2E8F0"}`,
          fontSize: 10, fontWeight: 700, color: C?.isDark ? "#64748b" : "#94A3B8", textTransform: "uppercase",
          fontFamily: C?.mono || "monospace", display: "flex", justifyContent: "space-between"
        }}>
          <span>{lang}</span>
          <span>Void Code Snippet</span>
        </div>
        <pre style={{
          margin: 0, padding: 12, overflowX: "auto", maxWidth: "100%",
          fontSize: 12, lineHeight: 1.5, color: C?.isDark ? "#38bdf8" : "#0F172A",
          fontFamily: C?.mono || "monospace", background: "transparent",
          whiteSpace: "pre-wrap", wordBreak: "break-all", boxSizing: "border-box"
        }}>
          <code>{codeContent}</code>
        </pre>
      </div>
    );

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    const textAfter = text.substring(lastIndex);
    elements.push(
      <RenderTextLines key={`text-${lastIndex}`} text={textAfter} C={C} onCveClick={onCveClick} />
    );
  }

  return <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%", overflowX: "hidden" }}>{elements}</div>;
}

function RenderTextLines({ text, C, onCveClick }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} style={{ height: 4 }} />;

        if (trimmed.startsWith("#")) {
          const title = trimmed.replace(/^#+\s*/, "");
          return (
            <div key={i} style={{ fontWeight: 800, fontSize: 14, color: C?.accent || "#6366F1", marginTop: 8, marginBottom: 4, wordBreak: "break-word", overflowWrap: "anywhere" }}>
              {title}
            </div>
          );
        }

        if (trimmed.startsWith("* ") || trimmed.startsWith("- ") || trimmed.startsWith("+ ") || /^\d+\.\s/.test(trimmed)) {
          const isPlus = trimmed.startsWith("+ ");
          const content = trimmed.replace(/^(\*|-|\+|\d+\.)\s*/, "");
          return (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", paddingLeft: 4, width: "100%", minWidth: 0 }}>
              <span style={{ color: isPlus ? (C?.amber || "#f59e0b") : (C?.accent || "#6366F1"), fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                {isPlus ? "⚡" : "•"}
              </span>
              <span style={{ flex: 1, minWidth: 0, lineHeight: 1.5, wordBreak: "break-word", overflowWrap: "anywhere" }}>
                {renderFormattedInline(content, C, onCveClick)}
              </span>
            </div>
          );
        }

        return (
          <div key={i} style={{ lineHeight: 1.5, wordBreak: "break-word", overflowWrap: "anywhere", width: "100%" }}>
            {renderFormattedInline(trimmed, C, onCveClick)}
          </div>
        );
      })}
    </>
  );
}

export default FormattedCopilotMessage;
