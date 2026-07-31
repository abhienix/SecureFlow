import React from "react";

export default function DataTable({ columns = [], data = [], C }) {
  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: C?.bgSecondary || "#0F1117", borderBottom: `1px solid ${C?.borderSubtle || "rgba(255,255,255,0.06)"}`, color: C?.textMuted || "#475569", textTransform: "uppercase", fontSize: 11 }}>
            {columns.map((col, idx) => (
              <th key={idx} style={{ padding: "10px 14px", textAlign: col.align || "left" }}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rIdx) => (
            <tr key={rIdx} style={{ borderBottom: `1px solid ${C?.borderSubtle || "rgba(255,255,255,0.06)"}` }}>
              {columns.map((col, cIdx) => (
                <td key={cIdx} style={{ padding: "12px 14px", textAlign: col.align || "left", color: C?.textPrimary }}>
                  {col.render ? col.render(row) : row[col.accessor]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
