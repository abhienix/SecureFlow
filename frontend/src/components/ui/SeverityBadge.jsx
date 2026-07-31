import React from "react";

export default function SeverityBadge({ severity, label, C }) {
  const sev = (severity || label || "medium").toLowerCase();
  
  let bg = "rgba(148,163,184,0.12)";
  let border = "rgba(148,163,184,0.20)";
  let color = "#94A3B8";

  if (sev.includes("critical") || sev.includes("block")) {
    bg = "rgba(239,68,68,0.12)";
    border = "rgba(239,68,68,0.25)";
    color = "#EF4444";
  } else if (sev.includes("high")) {
    bg = "rgba(249,115,22,0.12)";
    border = "rgba(249,115,22,0.25)";
    color = "#F97316";
  } else if (sev.includes("medium")) {
    bg = "rgba(245,158,11,0.12)";
    border = "rgba(245,158,11,0.25)";
    color = "#F59E0B";
  } else if (sev.includes("pass") || sev.includes("allow")) {
    bg = "rgba(34,197,94,0.12)";
    border = "rgba(34,197,94,0.25)";
    color = "#22C55E";
  }

  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      padding: "3px 8px",
      borderRadius: 4,
      background: bg,
      border: `1px solid ${border}`,
      color: color,
      fontSize: 11,
      fontWeight: 800,
      textTransform: "uppercase"
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: color }} />
      {label || severity}
    </span>
  );
}
