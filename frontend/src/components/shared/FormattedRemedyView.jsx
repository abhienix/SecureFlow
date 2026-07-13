import React from "react";

export function FormattedRemedyView({ text, C }) {
  if (!text) return null;

  const stepRegex = /(\d+\.\s+[^\d]+(?=\d+\.|$))/g;
  const steps = text.match(stepRegex);

  if (steps && steps.length > 1) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
        {steps.map((st, idx) => {
          const cleanText = st.replace(/^\d+\.\s*/, "").trim();
          return (
            <div
              key={idx}
              style={{
                display: "flex", gap: 12, alignItems: "flex-start",
                padding: "12px 14px", borderRadius: 10,
                background: C.isDark ? "#1E293B" : "#F8FAFC",
                border: `1px solid ${C.isDark ? "#334155" : "#E2E8F0"}`,
                boxShadow: "0 2px 6px rgba(0,0,0,0.06)"
              }}
            >
              <div style={{
                width: 24, height: 24, borderRadius: 8,
                background: "linear-gradient(135deg, #0284C7 0%, #00F2FE 100%)",
                color: "#FFFFFF", fontSize: 12, fontWeight: 900,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, boxShadow: "0 2px 6px rgba(0,242,254,0.3)"
              }}>
                {idx + 1}
              </div>
              <div style={{ flex: 1, fontSize: 12, color: C.isDark ? "#F8FAFC" : "#0F172A", lineHeight: 1.6, fontWeight: 500 }}>
                {cleanText}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div style={{
      fontSize: 12, color: C.isDark ? "#F8FAFC" : "#0F172A",
      fontFamily: C.mono, whiteSpace: "pre-wrap", lineHeight: 1.6, marginTop: 8,
      background: C.isDark ? "#1E293B" : "#F8FAFC",
      padding: 12, borderRadius: 10, border: `1px solid ${C.isDark ? "#334155" : "#E2E8F0"}`
    }}>
      {text}
    </div>
  );
}

export default FormattedRemedyView;
