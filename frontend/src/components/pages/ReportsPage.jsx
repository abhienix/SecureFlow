import React, { useState } from "react";
import { Download, FileText, ShieldCheck, FileSpreadsheet, Lock } from "lucide-react";

export default function ReportsPage({ C }) {
  const [downloading, setDownloading] = useState(null);

  const handleExport = async (type, format) => {
    setDownloading(`${type}-${format}`);
    try {
      const res = await fetch("/api/reports/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report_type: type, format })
      });
      const data = await res.json();
      
      const blob = new Blob([typeof data.content === "string" ? data.content : JSON.stringify(data.data, null, 2)], { type: data.mime || "application/json" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename || `secureflow_${type}_report.${format}`;
      a.click();
    } catch (e) {
      console.error(e);
    } finally {
      setDownloading(null);
    }
  };

  const REPORT_CARDS = [
    { id: "executive", title: "Executive CISO Summary Report", desc: "High-level security posture, SOC2 readiness matrix, and portfolio health trend.", icon: ShieldCheck },
    { id: "developer", title: "Developer Remediation Patch Report", desc: "Actionable code fixes, Semgrep line numbers, and Trivy package upgrade recommendations.", icon: FileText },
    { id: "compliance", title: "Compliance Readiness Report (SOC2 / ISO27001)", desc: "Formal audit proof of automated security gates, policy enforcement, and pipeline blocks.", icon: Lock }
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: C?.textPrimary || "#F1F5F9" }}>
          Enterprise Security Reports & Audit Exporter
        </h1>
        <span style={{ fontSize: 13, color: C?.textMuted || "#475569" }}>
          Generate one-click auditor compliance reports, developer patch manifests, and CISO executive summaries
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
        {REPORT_CARDS.map((card) => (
          <div
            key={card.id}
            style={{
              background: C?.bgCard || "#13151A",
              border: `1px solid ${C?.borderDefault || "rgba(255,255,255,0.10)"}`,
              borderRadius: 10,
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: 16
            }}
          >
            <div style={{
              width: 48, height: 48, borderRadius: 8, background: "rgba(99,102,241,0.12)",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <card.icon size={24} color="#6366F1" />
            </div>

            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: C?.textPrimary || "#F1F5F9" }}>{card.title}</h3>
              <p style={{ fontSize: 13, color: C?.textMuted || "#475569", marginTop: 6, lineHeight: 1.5 }}>
                {card.desc}
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: "auto" }}>
              <button
                onClick={() => handleExport(card.id, "json")}
                disabled={downloading === `${card.id}-json`}
                className="btn-primary"
                style={{ flex: 1, padding: "8px", fontSize: 12 }}
              >
                <Download size={14} />
                <span>JSON Export</span>
              </button>

              <button
                onClick={() => handleExport(card.id, "csv")}
                disabled={downloading === `${card.id}-csv`}
                className="btn-ghost"
                style={{ flex: 1, padding: "8px", fontSize: 12 }}
              >
                <FileSpreadsheet size={14} />
                <span>CSV Export</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
