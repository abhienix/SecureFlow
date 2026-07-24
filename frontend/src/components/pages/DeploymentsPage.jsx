import React from "react";
import { Rocket, Globe, ExternalLink } from "lucide-react";
import SeverityBadge from "../ui/SeverityBadge";
import ScanStatusDot from "../ui/ScanStatusDot";

export default function DeploymentsPage({ deployments = [], C }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: C?.textPrimary || "#F1F5F9" }}>
          Google Cloud Run Deployments
        </h1>
        <span style={{ fontSize: 13, color: C?.textMuted || "#475569" }}>
          Production deployment revisions, traffic splitting, automated rollback gates, and live DAST probe statuses
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {deployments.map((dep) => (
          <div
            key={dep.id}
            style={{
              background: C?.bgCard || "#13151A",
              border: `1px solid ${C?.borderDefault || "rgba(255,255,255,0.10)"}`,
              borderRadius: 8,
              padding: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 8, background: "rgba(34,197,94,0.12)",
                display: "flex", alignItems: "center", justifyContent: "center"
              }}>
                <Rocket size={22} color="#22C55E" />
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: C?.textPrimary || "#F1F5F9" }}>
                    {dep.revision || "secureflow-backend-00042"}
                  </h3>
                  <span style={{
                    padding: "2px 8px", borderRadius: 4, background: "rgba(99,102,241,0.12)",
                    color: "#6366F1", fontSize: 11, fontWeight: 700
                  }}>
                    {dep.environment || "production"} (100% Traffic)
                  </span>
                </div>

                <a
                  href={dep.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: C?.textMuted, marginTop: 4, textDecoration: "none" }}
                >
                  <Globe size={12} />
                  <span>{dep.url}</span>
                  <ExternalLink size={10} />
                </a>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <div>
                <span style={{ fontSize: 10, color: C?.textMuted, textTransform: "uppercase", fontWeight: 700 }}>DAST Probe</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                  <ScanStatusDot status={dep.dast_status || "completed"} C={C} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: C?.textPrimary }}>{dep.dast_status || "completed"}</span>
                </div>
              </div>

              <div>
                <span style={{ fontSize: 10, color: C?.textMuted, textTransform: "uppercase", fontWeight: 700 }}>Security Gate</span>
                <div style={{ marginTop: 2 }}>
                  <SeverityBadge severity={dep.ai_verdict === "BLOCK" ? "critical" : "passed"} label={dep.ai_verdict || "ALLOW"} C={C} />
                </div>
              </div>

              <button className="btn-ghost" style={{ fontSize: 12, padding: "6px 12px" }}>
                Rollback Revision
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
