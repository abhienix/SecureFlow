import React from 'react';
import { GitBranch, Cloud, Database, Sparkles, Shield, Settings as SettingsIcon } from 'lucide-react';
import { Card } from '../ui/Card';

const SECTIONS = [
  {
    id: 'general', title: 'Platform Architecture', icon: SettingsIcon,
    items: [
      { label: 'Platform Name', value: 'SecureFlow AI DevSecOps' },
      { label: 'Version', value: 'v2.0.0 Enterprise' },
      { label: 'Environment', value: 'Production (Cloud Run)' },
      { label: 'AI Engine', value: 'Void Core AI', highlight: true },
    ],
  },
  {
    id: 'github', title: 'GitHub Repository Integration', icon: GitBranch,
    items: [
      { label: 'Connection Status', value: 'Connected', highlight: true },
      { label: 'Repository Owner', value: 'abhienix' },
      { label: 'Monitored Repo', value: 'abhienix/SecureFlow' },
      { label: 'Ingestion Webhook URL', value: 'https://secureflow-backend-1083585992526.us-central1.run.app/api/scan-results' },
    ],
  },
  {
    id: 'cloudrun', title: 'Google Cloud Run Backend', icon: Cloud,
    items: [
      { label: 'Service Name', value: 'secureflow-backend' },
      { label: 'Region', value: 'us-central1' },
      { label: 'Service URL', value: 'https://secureflow-backend-1083585992526.us-central1.run.app' },
      { label: 'Health Endpoint', value: '/health (200 OK)' },
    ],
  },
  {
    id: 'redis', title: 'Redis Broker & Celery DAST Queue', icon: Database,
    items: [
      { label: 'Broker Host', value: 'redis://localhost:6379/0' },
      { label: 'Worker Queue', value: 'celery' },
      { label: 'DAST Task Name', value: 'tasks.run_zap_scan' },
      { label: 'Worker Status', value: 'Active (ZAP Worker Node)', highlight: true },
    ],
  },
  {
    id: 'ai', title: 'Void Core AI Reasoning Engine', icon: Sparkles,
    items: [
      { label: 'LLM Provider', value: 'Groq Cloud API' },
      { label: 'Model Name', value: 'llama3-70b-8192' },
      { label: 'Context Windows', value: 'RAG Ingestion Enabled' },
      { label: 'Status', value: 'Online & Ready', highlight: true },
    ],
  },
  {
    id: 'security', title: 'Zero-Trust Access Control', icon: Shield,
    items: [
      { label: 'Authentication Gateway', value: 'SecOps Local Identity' },
      { label: 'Default Administrator', value: 'admin (SecOps Administrator)' },
      { label: 'Session Storage', value: 'Encrypted Token (sf_auth)' },
      { label: 'Policy Enforcement', value: 'policy.yaml Active', highlight: true },
    ],
  },
];

export default function SettingsWorkspace() {
  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--sf-ink)', margin: '0 0 4px 0' }}>Platform Settings & Integrations</h1>
        <p style={{ fontSize: 13, color: 'var(--sf-ink-low)' }}>Production telemetry, GitHub repository bindings, Cloud Run environment, and Void AI engine status</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.id} style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--sf-accent-soft)', border: '1px solid var(--sf-accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={18} color="var(--sf-accent)" />
                </div>
                <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--sf-ink)', margin: 0 }}>{section.title}</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {section.items.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: idx < section.items.length - 1 ? '1px solid var(--sf-border)' : 'none' }}>
                    <span style={{ fontSize: 13, color: 'var(--sf-ink-low)', fontWeight: 500 }}>{item.label}</span>
                    <span style={{ fontSize: 13, color: item.highlight ? 'var(--sf-green)' : 'var(--sf-ink)', fontWeight: item.highlight ? 700 : 600, fontFamily: 'var(--sf-font-mono)' }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
