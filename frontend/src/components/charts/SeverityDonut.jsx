import React from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

export default function SeverityDonut({ C, data: propData }) {
  const data = propData && propData.length > 0 ? propData : [
    { name: "Critical", value: 0, color: "#EF4444" },
    { name: "High", value: 0, color: "#F97316" },
    { name: "Medium", value: 0, color: "#F59E0B" },
    { name: "Low", value: 0, color: "#3B82F6" }
  ];

  return (
    <div style={{ width: "100%", height: 260, display: "flex", alignItems: "center" }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="value">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ background: C?.bgCard || "#13151A", border: `1px solid ${C?.borderDefault}`, borderRadius: 6 }} />
        </PieChart>
      </ResponsiveContainer>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingRight: 20 }}>
        {data.map((item, idx) => (
          <div key={idx} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: item.color }} />
            <span style={{ color: C?.textPrimary, fontWeight: 600 }}>{item.name}:</span>
            <span style={{ fontWeight: 800, color: item.color }}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
