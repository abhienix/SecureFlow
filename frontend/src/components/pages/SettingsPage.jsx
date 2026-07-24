import React from 'react';
import { GitBranch, Cloud, Database, Sparkles, Shield, Settings } from 'lucide-react';

export default function SettingsPage({ C }) {
  const settingsData = [
    {
      id: 'general',
      title: 'Platform Architecture',
      icon: <Settings size={18} color={C?.accent || "#6366F1"} />,
      items: [
        { label: 'Platform Name', value: 'SecureFlow AI DevSecOps' },
        { label: 'Version', value: 'v2.0.0 Enterprise' },
        { label: 'Environment', value: 'Production (Cloud Run)' },
        { label: 'AI Engine', value: <span style={{ color: C?.accent || "#6366F1", fontWeight: 700 }}>Void Core AI</span> }
      ]
    },
    {
      id: 'github',
      title: 'GitHub Repository Integration',
      icon: <GitBranch size={18} color={C?.accent || "#6366F1"} />,
      items: [
        { label: 'Connection Status', value: <span style={{ color: C?.green || "#10b981", fontWeight: 700 }}>Connected</span> },
        { label: 'Repository Owner', value: 'abhienix' },
        { label: 'Monitored Repo', value: 'abhienix/SecureFlow' },
        { label: 'Ingestion Webhook URL', value: 'https://secureflow-backend-1083585992526.us-central1.run.app/api/scan-results' }
      ]
    },
    {
      id: 'cloudrun',
      title: 'Google Cloud Run Backend',
      icon: <Cloud size={18} color={C?.accent || "#6366F1"} />,
      items: [
        { label: 'Service Name', value: 'secureflow-backend' },
        { label: 'Region', value: 'us-central1' },
        { label: 'Service URL', value: 'https://secureflow-backend-1083585992526.us-central1.run.app' },
        { label: 'Health Endpoint', value: '/health (200 OK)' }
      ]
    },
    {
      id: 'redis',
      title: 'Redis Broker & Celery DAST Queue',
      icon: <Database size={18} color={C?.accent || "#6366F1"} />,
      items: [
        { label: 'Broker Host', value: 'redis://localhost:6379/0' },
        { label: 'Worker Queue', value: 'celery' },
        { label: 'DAST Task Name', value: 'tasks.run_zap_scan' },
        { label: 'Worker Status', value: <span style={{ color: C?.green || "#10b981", fontWeight: 700 }}>Active (ZAP Worker Node)</span> }
      ]
    },
    {
      id: 'ai',
      title: 'Void Core AI Reasoning Engine',
      icon: <Sparkles size={18} color={C?.accent || "#6366F1"} />,
      items: [
        { label: 'LLM Provider', value: 'Groq Cloud API' },
        { label: 'Model Name', value: 'llama3-70b-8192' },
        { label: 'Context Windows', value: 'RAG Ingestion Enabled' },
        { label: 'Status', value: <span style={{ color: C?.green || "#10b981", fontWeight: 700 }}>Online & Ready</span> }
      ]
    },
    {
      id: 'security',
      title: 'Zero-Trust Access Control',
      icon: <Shield size={18} color={C?.accent || "#6366F1"} />,
      items: [
        { label: 'Authentication Gateway', value: 'SecOps Local Identity' },
        { label: 'Default Administrator', value: 'admin (SecOps Administrator)' },
        { label: 'Session Storage', value: 'Encrypted Token (sf_auth)' },
        { label: 'Policy Enforcement', value: <span style={{ color: C?.green || "#10b981", fontWeight: 700 }}>policy.yaml Active</span> }
      ]
    }
  ];

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: C?.ink || "#f8fafc", margin: '0 0 4px 0' }}>
          Platform Settings & Integrations
        </h1>
        <div style={{ fontSize: 13, color: C?.inkLow || "#64748b" }}>
          Production telemetry, GitHub repository bindings, Cloud Run environment, and Void AI engine status
        </div>
      </div>

      {/* Grid of Setting Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
        {settingsData.map(section => (
          <div key={section.id} style={{
            background: C?.bgCard || "#0f172a",
            border: `1px solid ${C?.border || "#1e293b"}`,
            borderRadius: 12, padding: 20,
            boxShadow: C?.shadow || "0 1px 3px rgba(0,0,0,0.1)"
          }}>
            {/* Section Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 34, height: 34, borderRadius: 8,
                background: C?.accentSoft || "rgba(99,102,241,0.12)",
                border: `1px solid ${C?.accentBorder || "rgba(99,102,241,0.25)"}`
              }}>
                {section.icon}
              </div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: C?.ink || "#f8fafc", margin: 0 }}>{section.title}</h2>
            </div>

            {/* Key-Value Rows */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {section.items.map((item, idx) => (
                <div 
                  key={idx} 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '10px 0',
                    borderBottom: idx < section.items.length - 1 ? `1px solid ${C?.border || "#1e293b"}` : 'none'
                  }}
                >
                  <span style={{ fontSize: 13, color: C?.inkLow || "#64748b", fontWeight: 500 }}>{item.label}</span>
                  <span style={{ fontSize: 13, color: C?.ink || "#f8fafc", fontWeight: 600, fontFamily: C?.mono || "monospace" }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
