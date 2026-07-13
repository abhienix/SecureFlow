import React from "react";

export function renderFormattedInline(str, C, onCveClick) {
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
            background: C.isDark ? "rgba(239, 68, 68, 0.2)" : "#FEE2E2",
            color: C.isDark ? "#F87171" : "#DC2626",
            border: `1px solid ${C.isDark ? "rgba(239, 68, 68, 0.4)" : "#FCA5A5"}`,
            padding: "1px 6px", borderRadius: 6, fontSize: 11, fontWeight: 800,
            fontFamily: C.mono, cursor: "pointer", margin: "0 2px"
          }}
        >
          🚨 {part}
        </span>
      );
    }
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={idx} style={{ color: C.isDark ? "#F8FAFC" : "#0F172A", fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={idx} style={{
          background: C.isDark ? "rgba(0,242,254,0.12)" : "rgba(0,0,0,0.06)",
          color: C.cyan, padding: "1px 5px", borderRadius: 4, fontSize: 11, fontFamily: C.mono
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
  const lines = text.split("\n");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} style={{ height: 4 }} />;

        if (trimmed.startsWith("#")) {
          const title = trimmed.replace(/^#+\s*/, "");
          return (
            <div key={i} style={{ fontWeight: 800, fontSize: 13, color: C.cyan, marginTop: 4, marginBottom: 2 }}>
              {title}
            </div>
          );
        }

        if (trimmed.startsWith("* ") || trimmed.startsWith("- ") || trimmed.startsWith("+ ") || /^\d+\.\s/.test(trimmed)) {
          const isPlus = trimmed.startsWith("+ ");
          const content = trimmed.replace(/^(\*|-|\+|\d+\.)\s*/, "");
          return (
            <div key={i} style={{ display: "flex", gap: 6, alignItems: "flex-start", paddingLeft: 4 }}>
              <span style={{ color: isPlus ? C.amber : C.teal, fontWeight: 800, fontSize: 12 }}>
                {isPlus ? "⚡" : "•"}
              </span>
              <span style={{ flex: 1 }}>{renderFormattedInline(content, C, onCveClick)}</span>
            </div>
          );
        }

        return <div key={i}>{renderFormattedInline(trimmed, C, onCveClick)}</div>;
      })}
    </div>
  );
}

export default FormattedCopilotMessage;
