import React from "react";

export default function ScanStatusDot({ status, C }) {
  const st = (status || "complete").toLowerCase();
  
  let color = "#22C55E";
  let text = "Completed";

  if (st.includes("running")) {
    color = "#3B82F6";
    text = "Running";
  } else if (st.includes("queue") && !st.includes("fail")) {
    color = "#F59E0B";
    text = "Queued";
  } else if (st.includes("fail")) {
    color = "#EF4444";
    text = "Failed";
  }

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: C?.textPrimary }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block" }} />
      <span>{text}</span>
    </div>
  );
}
