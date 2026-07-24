import React from "react";

export default function MetricCard({ title, value, change, isPositive = true, Icon, C }) {
  return (
    <div style={{
      background: C?.bgCard || "#13151A",
      border: `1px solid ${C?.borderDefault || "rgba(255,255,255,0.10)"}`,
      borderRadius: 8,
      padding: "16px",
      display: "flex",
      flexDirection: "column",
      gap: 10
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C?.textMuted || "#475569", textTransform: "uppercase" }}>
          {title}
        </span>
        {Icon && (
          <div style={{
            width: 32, height: 32, borderRadius: 6, background: "rgba(99,102,241,0.12)",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <Icon size={16} color="#6366F1" />
          </div>
        )}
      </div>

      <div style={{ fontSize: 24, fontWeight: 900, color: C?.textPrimary || "#F1F5F9" }}>
        {value}
      </div>

      {change && (
        <span style={{ fontSize: 11, fontWeight: 600, color: isPositive ? "#22C55E" : "#EF4444" }}>
          {change}
        </span>
      )}
    </div>
  );
}
