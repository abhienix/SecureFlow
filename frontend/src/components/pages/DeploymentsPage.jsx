import React from 'react';
import { GitBranch, Shield, Zap, Box, Activity, Ban } from 'lucide-react';
import MetricCard from '../ui/MetricCard';

export default function DeploymentsPage({ deployments = [], C }) {
  const cardStyle = {
    background: C.bgCard,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    padding: 20
  };

  const activeCount = deployments.filter(d => d.status === 'active' || d.status === 'success').length;
  const blockedCount = deployments.filter(d => d.status === 'blocked' || d.status === 'failed').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: 30, height: '100%', overflowY: 'auto' }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: C.ink, margin: '0 0 4px 0' }}>Deployment Timeline</h1>
        <div style={{ fontSize: 13, color: C.inkLow }}>Track CI/CD pipeline runs and their security status.</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <MetricCard title="Total Deployments" value={deployments.length} Icon={Box} C={C} />
        <MetricCard title="Active Deployments" value={activeCount} Icon={Activity} C={C} />
        <MetricCard title="Blocked Deployments" value={blockedCount} Icon={Ban} C={C} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {deployments.length === 0 ? (
          <div style={{ ...cardStyle, textAlign: 'center', color: C.inkMid, padding: 40, fontSize: 14 }}>
            No deployments found. Start a pipeline run to see history.
          </div>
        ) : (
          deployments.map((dep, idx) => {
            const isBlocked = dep.status === 'blocked' || dep.status === 'failed';
            const statusColor = isBlocked ? '#ef4444' : '#10b981';

            return (
              <div key={dep.id || idx} style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: statusColor, boxShadow: `0 0 8px ${statusColor}80` }} />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 15, color: C.ink }}>{dep.repo_name || 'unknown-repo'}</span>
                      <span style={{ fontSize: 12, color: C.inkLow, fontFamily: 'monospace', background: C.bg, padding: '2px 6px', borderRadius: 4 }}>
                        {dep.commit_sha ? dep.commit_sha.substring(0, 7) : 'N/A'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: C.inkMid }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <GitBranch size={14} /> {dep.branch || 'main'}
                      </div>
                      <div>•</div>
                      <div>Env: <span style={{ color: C.ink }}>{dep.environment || 'production'}</span></div>
                      <div>•</div>
                      <div>Rev: {dep.revision || '1'}</div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {dep.dast_status && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 12, background: C.bg, border: `1px solid ${C.border}`, color: C.ink }}>
                      <Shield size={12} color={dep.dast_status === 'passed' ? '#10b981' : '#ef4444'} />
                      DAST: {dep.dast_status.toUpperCase()}
                    </div>
                  )}
                  {dep.ai_verdict && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 12, background: `${C.accent}15`, border: `1px solid ${C.accent}40`, color: C.accent }}>
                      <Zap size={12} />
                      AI: {dep.ai_verdict.toUpperCase()}
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: C.inkLow, minWidth: 100, textAlign: 'right' }}>
                    {dep.created_at ? new Date(dep.created_at).toLocaleString() : 'Just now'}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
