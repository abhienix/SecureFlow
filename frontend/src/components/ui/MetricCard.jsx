import React from "react";

export default function MetricCard({ title, value, change, isPositive = true, Icon, C }) {
  const textColor = C?.textPrimary || C?.ink || "#f8fafc";
  const mutedColor = C?.textMuted || C?.inkLow || "#64748b";
  const cardBg = C?.bgCard || "#0f172a";
  const borderColor = C?.borderDefault || C?.border || "#1e293b";
  const accentColor = C?.accent || "#6366F1";
  const accentSoft = C?.accentSoft || "rgba(99,102,241,0.12)";

  return (
    <div style={{
      background: cardBg,
      border: `1px solid ${borderColor}`,
      borderRadius: 12,
      padding: "16px 18px",
      display: "flex",
      flexDirection: "column",
      gap: 10,
      boxShadow: C?.shadow || "0 1px 3px rgba(0,0,0,0.1)",
      transition: "transform 150ms ease, box-shadow 150ms ease",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: mutedColor, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          {title}
        </span>
        {Icon && (
          <div style={{
            width: 32, height: 32, borderRadius: 8, background: accentSoft,
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <Icon size={16} color={accentColor} />
          </div>
        )}
      </div>

      <div style={{ fontSize: 24, fontWeight: 900, color: textColor, fontFamily: C?.mono || "monospace" }}>
        {value}
      </div>

      {change && (
        <span style={{ fontSize: 11, fontWeight: 700, color: isPositive ? (C?.green || "#10b981") : (C?.red || "#ef4444") }}>
          {change}
        </span>
      )}
    </div>
  );
}
