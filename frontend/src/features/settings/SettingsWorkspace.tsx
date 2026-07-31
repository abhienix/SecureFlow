import React, { useState } from 'react';
import {
  Palette, Sliders, Bell, ShieldCheck, Server, Info, Moon, Sun, Monitor,
  GitPullRequest, Rocket, MessageSquare, Zap, Cpu, Database, Key, RefreshCw
} from 'lucide-react';
import { Card, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useTheme } from '../../contexts/ThemeContext';
import { useSystemInfo, useSystemHealth } from '../../hooks/useApi';

type Tab = 'appearance' | 'integrations' | 'notifications' | 'security' | 'system' | 'about';

export default function SettingsWorkspace() {
  const { mode, setMode } = useTheme();
  const { data: sysInfo } = useSystemInfo();
  const { data: sysHealth } = useSystemHealth();
  const [activeTab, setActiveTab] = useState<Tab>('appearance');

  React.useEffect(() => {
    document.title = 'Settings — SecureFlow';
  }, []);
  const [compactMode, setCompactMode] = useState(false);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'appearance', label: 'Appearance', icon: Palette },
    { key: 'integrations', label: 'Integrations', icon: Sliders },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'security', label: 'Security & Keys', icon: ShieldCheck },
    { key: 'system', label: 'System Status', icon: Server },
    { key: 'about', label: 'About SecureFlow', icon: Info },
  ];

  const info = sysInfo || {
    frontend_version: 'v2.5.0',
    backend_version: 'v2.0.0',
    build_number: '#9841203',
    frontend_commit: 'a2d3b0b',
    backend_commit: 'a2d3b0b',
    database_version: 'PostgreSQL 15.4',
    redis_status: 'PONG (Connected)',
    worker_status: '4 Workers Active',
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--sf-ink)', margin: 0 }}>
          Settings & Platform Administration
        </h1>
        <p style={{ fontSize: 13, color: 'var(--sf-ink-low)', marginTop: 4 }}>
          Manage user preferences, integration endpoints, API security, and platform architecture
        </p>
      </div>

      {/* Navigation Tabs Bar */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--sf-bg-surface)', padding: 4, borderRadius: 10, border: '1px solid var(--sf-border)', overflowX: 'auto' }}>
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                padding: '8px 16px',
                borderRadius: 6,
                border: 'none',
                background: isActive ? 'var(--sf-accent-soft)' : 'transparent',
                color: isActive ? 'var(--sf-accent)' : 'var(--sf-ink-mid)',
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={15} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: APPEARANCE */}
      {activeTab === 'appearance' && (
        <Card>
          <CardHeader title="Appearance & UI Customization" subtitle="Configure theme, layout density, and visual animations" />
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Theme Selector */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--sf-ink-mid)', textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>
                Color Theme Mode
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                {[
                  { key: 'dark', label: 'Dark Mode', Icon: Moon },
                  { key: 'light', label: 'Light Mode', Icon: Sun },
                  { key: 'system', label: 'System Preference', Icon: Monitor },
                ].map((t) => {
                  const isSel = mode === t.key;
                  return (
                    <button
                      key={t.key}
                      onClick={() => setMode(t.key as any)}
                      style={{
                        position: 'relative',
                        padding: 16,
                        borderRadius: 10,
                        background: isSel ? 'var(--sf-accent-soft)' : 'var(--sf-bg-surface)',
                        border: isSel ? '2px solid #3b82f6' : '1px solid var(--sf-border)',
                        color: 'var(--sf-ink)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 8,
                        cursor: 'pointer',
                      }}
                    >
                      {isSel && (
                        <div style={{ position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: '50%', background: '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900 }}>
                          ✓
                        </div>
                      )}
                      <t.Icon size={20} color={isSel ? '#3b82f6' : 'var(--sf-ink-mid)'} />
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Density & Animation Controls */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
              <div style={{ padding: 14, borderRadius: 10, background: 'var(--sf-bg-surface)', border: '1px solid var(--sf-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--sf-ink)' }}>Compact Mode</div>
                  <div style={{ fontSize: 11, color: 'var(--sf-ink-low)', marginTop: 2 }}>Reduce table padding and row heights for high-density monitoring</div>
                  <div style={{ fontSize: 10, color: '#38bdf8', fontWeight: 600, marginTop: 4 }}>Preview: Row height 52px → 36px</div>
                </div>
                <input type="checkbox" checked={compactMode} onChange={(e) => setCompactMode(e.target.checked)} style={{ width: 18, height: 18, accentColor: 'var(--sf-accent)', cursor: 'pointer' }} />
              </div>

              <div style={{ padding: 14, borderRadius: 10, background: 'var(--sf-bg-surface)', border: '1px solid var(--sf-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--sf-ink)' }}>Micro-Animations</div>
                  <div style={{ fontSize: 11, color: 'var(--sf-ink-low)', marginTop: 2 }}>Enable smooth CSS keyframes, pulse effects, and drawer transitions</div>
                  <div style={{ fontSize: 10, color: '#38bdf8', fontWeight: 600, marginTop: 4 }}>Preview: 150ms ease-out transitions</div>
                </div>
                <input type="checkbox" checked={animationsEnabled} onChange={(e) => setAnimationsEnabled(e.target.checked)} style={{ width: 18, height: 18, accentColor: 'var(--sf-accent)', cursor: 'pointer' }} />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* TAB 2: INTEGRATIONS */}
      {activeTab === 'integrations' && (
        <Card>
          <CardHeader title="Enterprise Toolchain Integrations" subtitle="Orchestrate security scanners, CI/CD runners, and notification webhooks" />
          <div style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {[
              { name: 'GitHub & Actions', desc: 'Repository webhook & CI workflow orchestration', icon: GitPullRequest, connected: true },
              { name: 'Google Cloud Run', desc: 'Target container deployment & health checking', icon: Rocket, connected: true },
              { name: 'Slack Alerts', desc: 'Channel notification webhooks on BLOCK signals', icon: MessageSquare, connected: true },
              { name: 'Grok / OpenAI LLM', desc: 'AI Copilot RAG reasoning service', icon: Zap, connected: true },
            ].map((int) => {
              const Icon = int.icon;
              return (
                <div key={int.name} style={{ padding: 16, borderRadius: 10, background: 'var(--sf-bg-surface)', border: '1px solid var(--sf-border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--sf-accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={16} color="var(--sf-accent)" />
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--sf-ink)' }}>{int.name}</span>
                    </div>
                    <Badge variant="success">Active</Badge>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--sf-ink-low)', margin: 0 }}>{int.desc}</p>
                  <Button variant="secondary" size="sm" style={{ marginTop: 'auto' }}>Configure Integration</Button>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* TAB 3: NOTIFICATIONS */}
      {activeTab === 'notifications' && (
        <Card>
          <CardHeader title="Notification & Alert Thresholds" subtitle="Configure automated alerting channels and severity filters" />
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ padding: 16, borderRadius: 10, background: 'var(--sf-bg-surface)', border: '1px solid var(--sf-border)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--sf-ink)', marginBottom: 8 }}>Slack Webhook URL</div>
              <input
                type="text"
                defaultValue="your-slack-webhook-url"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'var(--sf-bg)', border: '1px solid var(--sf-border)', color: 'var(--sf-ink)', fontSize: 12, fontFamily: 'var(--sf-font-mono)' }}
              />
            </div>

            <div style={{ padding: 16, borderRadius: 10, background: 'var(--sf-bg-surface)', border: '1px solid var(--sf-border)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--sf-ink)', marginBottom: 8 }}>Alert Severity Threshold</div>
              <div style={{ display: 'flex', gap: 10 }}>
                {['CRITICAL ONLY', 'CRITICAL & HIGH', 'ALL VULNERABILITIES'].map((lvl, i) => (
                  <button key={lvl} style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid var(--sf-border)', background: i === 1 ? 'var(--sf-accent-soft)' : 'transparent', color: i === 1 ? 'var(--sf-accent)' : 'var(--sf-ink-mid)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* TAB 4: SECURITY */}
      {activeTab === 'security' && (
        <Card>
          <CardHeader title="API Keys & Access Security" subtitle="Manage authentication tokens and active security sessions" />
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ padding: 16, borderRadius: 10, background: 'var(--sf-bg-surface)', border: '1px solid var(--sf-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--sf-ink)' }}>SecureFlow API Key</div>
                <div style={{ fontSize: 11, fontFamily: 'var(--sf-font-mono)', color: 'var(--sf-ink-low)', marginTop: 4 }}>sf_live_k8s_9841203981238912</div>
              </div>
              <Button variant="secondary" size="sm"><Key size={14} /> Regenerate Key</Button>
            </div>
          </div>
        </Card>
      )}

      {/* TAB 5: SYSTEM */}
      {activeTab === 'system' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <CardHeader title="System Architecture & Build Information" subtitle="Platform build numbers, Git commit hashes, database versions, and worker pool status" />
            <div style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              {[
                { label: 'Frontend Version', value: info.frontend_version },
                { label: 'Backend Version', value: info.backend_version },
                { label: 'Build Number', value: info.build_number },
                { label: 'Frontend Commit SHA', value: info.frontend_commit },
                { label: 'Backend Commit SHA', value: info.backend_commit },
                { label: 'Database Engine', value: info.database_version },
                { label: 'Redis Status', value: info.redis_status },
                { label: 'Celery Workers', value: info.worker_status },
              ].map((item) => (
                <div key={item.label} style={{ padding: 12, borderRadius: 8, background: 'var(--sf-bg-surface)', border: '1px solid var(--sf-border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--sf-ink-low)', textTransform: 'uppercase', fontWeight: 700 }}>{item.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--sf-ink)', marginTop: 4, fontFamily: 'var(--sf-font-mono)' }}>{item.value}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Live Component Health & Latency" subtitle="Real-time status of API, database, cache, workers, and integrations" />
            <div style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              {[
                { name: 'FastAPI Backend', status: sysHealth?.components?.fastapi?.status || 'Healthy (0.8ms)', icon: Server, color: 'var(--sf-green)' },
                { name: 'PostgreSQL Database', status: sysHealth?.components?.database?.status || 'Connected (Pool: 10/10)', icon: Database, color: 'var(--sf-green)' },
                { name: 'Redis Queue Cache', status: sysHealth?.components?.redis?.status || 'Connected (PONG)', icon: Cpu, color: 'var(--sf-green)' },
                { name: 'Celery Workers', status: sysHealth?.components?.celery?.status || '4/4 Workers Online', icon: RefreshCw, color: 'var(--sf-green)' },
                { name: 'Void AI Engine', status: sysHealth?.components?.void_ai?.status || 'Grok DevSecOps Core Online', icon: Zap, color: 'var(--sf-violet)' },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.name} style={{ padding: 14, borderRadius: 10, background: 'var(--sf-bg-surface)', border: '1px solid var(--sf-border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Icon size={16} color="var(--sf-accent)" />
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--sf-ink)' }}>{s.name}</span>
                    </div>
                    <span style={{ fontSize: 11, color: s.color, fontWeight: 700 }}>{s.status}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 6: ABOUT SECUREFLOW */}
      {activeTab === 'about' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <CardHeader title="About SecureFlow Enterprise" subtitle="AI-Assisted DevSecOps Security Orchestration Platform" />
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14, lineHeight: 1.6, color: 'var(--sf-ink-mid)', fontSize: 13 }}>
              <p style={{ margin: 0 }}>
                SecureFlow is an AI-assisted DevSecOps Security Orchestration Platform designed to automate and unify security throughout the software delivery lifecycle.
              </p>
              <p style={{ margin: 0 }}>
                Instead of replacing security scanners, SecureFlow orchestrates multiple industry-standard security tools into a single intelligent workflow that provides centralized visibility, security policy enforcement, real-time pipeline monitoring, and AI-assisted remediation.
              </p>
            </div>
          </Card>

          <Card>
            <CardHeader title="Current Technology Stack" subtitle="Production platform stack" />
            <div style={{ padding: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {[
                'FastAPI', 'PostgreSQL', 'Redis', 'Celery', 'GitHub Actions',
                'Gitleaks', 'Semgrep', 'Docker', 'Trivy', 'Google Cloud',
                'OWASP ZAP', 'Slack', 'Grok AI'
              ].map((tech) => (
                <span key={tech} style={{ padding: '6px 12px', borderRadius: 8, background: 'var(--sf-accent-soft)', color: 'var(--sf-accent)', fontSize: 12, fontWeight: 700 }}>
                  {tech}
                </span>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
