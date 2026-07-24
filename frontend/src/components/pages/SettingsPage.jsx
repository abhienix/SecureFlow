import React from "react";
import { Globe, Database } from "lucide-react";

export default function SettingsPage({ C }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: C?.textPrimary || "#F1F5F9" }}>
          Platform Settings & Integrations
        </h1>
        <span style={{ fontSize: 13, color: C?.textMuted || "#475569" }}>
          Configure API credentials, GitHub webhooks, Cloud Run GCP connections, Celery Redis queues, and AI model routing
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Card 1: Cloud & CI/CD Integrations */}
        <div style={{
          background: C?.bgCard || "#13151A", border: `1px solid ${C?.borderDefault}`, borderRadius: 8, padding: 20,
          display: "flex", flexDirection: "column", gap: 14
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Globe size={20} color="#6366F1" />
            <h3 style={{ fontSize: 16, fontWeight: 800, color: C?.textPrimary }}>Cloud & CI/CD Integrations</h3>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ background: C?.bgSecondary, padding: 12, borderRadius: 6 }}>
              <span style={{ fontWeight: 700, color: C?.textPrimary }}>GitHub Actions Integration</span>
              <span style={{ display: "block", fontSize: 11, color: C?.textMuted }}>Connected to repository `abhienix/SecureFlow`</span>
            </div>

            <div style={{ background: C?.bgSecondary, padding: 12, borderRadius: 6 }}>
              <span style={{ fontWeight: 700, color: C?.textPrimary }}>Google Cloud Run</span>
              <span style={{ display: "block", fontSize: 11, color: C?.textMuted }}>Target: `https://secureflow-backend-1083585992526.us-central1.run.app`</span>
            </div>
          </div>
        </div>

        {/* Card 2: Queue & Worker Settings */}
        <div style={{
          background: C?.bgCard || "#13151A", border: `1px solid ${C?.borderDefault}`, borderRadius: 8, padding: 20,
          display: "flex", flexDirection: "column", gap: 14
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Database size={20} color="#22C55E" />
            <h3 style={{ fontSize: 16, fontWeight: 800, color: C?.textPrimary }}>Redis & Celery DAST Queue</h3>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ background: C?.bgSecondary, padding: 12, borderRadius: 6 }}>
              <span style={{ fontWeight: 700, color: C?.textPrimary }}>Redis Broker Connection</span>
              <span style={{ display: "block", fontSize: 11, color: C?.textMuted }}>URL: `redis://localhost:6379/0` (Queue: `celery`)</span>
            </div>

            <div style={{ background: C?.bgSecondary, padding: 12, borderRadius: 6 }}>
              <span style={{ fontWeight: 700, color: C?.textPrimary }}>Celery Worker Engine</span>
              <span style={{ display: "block", fontSize: 11, color: C?.textMuted }}>Task: `tasks.run_zap_scan` (Worker-01 Ubuntu VM)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
