import React from 'react';
import { GitBranch, Cloud, Database, Sparkles, Shield, Settings } from 'lucide-react';

export default function SettingsPage({ C }) {
  const settingsData = [
    {
      id: 'general',
      title: 'General',
      icon: <Settings size={18} color={C.accent} />,
      items: [
        { label: 'Platform Name', value: 'SecureFlow Enterprise' },
        { label: 'Version', value: 'v2.4.1-stable' },
        { label: 'Environment', value: 'Production' }
      ]
    },
    {
      id: 'github',
      title: 'GitHub Integration',
      icon: <GitBranch size={18} color={C.accent} />,
      items: [
        { label: 'Connection Status', value: <span style={{ color: C.green, fontWeight: 600 }}>Connected</span> },
        { label: 'Organization', value: 'acme-corp' },
        { label: 'Webhook URL', value: 'https://api.secureflow.dev/webhook/github' }
      ]
    },
    {
      id: 'cloudrun',
      title: 'Cloud Run',
      icon: <Cloud size={18} color={C.accent} />,
      items: [
        { label: 'Service Name', value: 'secureflow-scanner' },
        { label: 'Region', value: 'us-central1' },
        { label: 'Service URL', value: 'https://secureflow-scanner-xyz.a.run.app' }
      ]
    },
    {
      id: 'redis',
      title: 'Redis & Celery',
      icon: <Database size={18} color={C.accent} />,
      items: [
        { label: 'Broker URL', value: 'redis://redis-master.internal:6379/0' },
        { label: 'Queue Name', value: 'sec-scan-tasks' },
        { label: 'Worker Status', value: <span style={{ color: C.green, fontWeight: 600 }}>Active (4 Nodes)</span> }
      ]
    },
    {
      id: 'ai',
      title: 'AI Models',
      icon: <Sparkles size={18} color={C.accent} />,
      items: [
        { label: 'Provider', value: 'Groq' },
        { label: 'Model Name', value: 'llama3-70b-8192' },
        { label: 'Status', value: <span style={{ color: C.green, fontWeight: 600 }}>Online</span> }
      ]
    },
    {
      id: 'security',
      title: 'Security',
      icon: <Shield size={18} color={C.accent} />,
      items: [
        { label: 'Authentication Method', value: 'SAML SSO (Okta)' },
        { label: 'Session Timeout', value: '60 minutes' },
        { label: 'MFA Enforced', value: 'Yes' }
      ]
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: C.ink, margin: '0 0 4px 0' }}>Settings</h1>
        <div style={{ fontSize: 13, color: C.inkLow }}>Platform Configuration & Integrations</div>
      </div>

      {/* Grid of Setting Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20 }}>
        {settingsData.map(section => (
          <div key={section.id} style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
            {/* Section Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: C.bgElevated, border: `1px solid ${C.border}` }}>
                {section.icon}
              </div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: C.ink, margin: 0 }}>{section.title}</h2>
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
                    padding: '12px 0',
                    borderBottom: idx < section.items.length - 1 ? `1px solid ${C.border}` : 'none'
                  }}
                >
                  <span style={{ fontSize: 13, color: C.inkLow }}>{item.label}</span>
                  <span style={{ fontSize: 13, color: C.ink, fontWeight: 500 }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
