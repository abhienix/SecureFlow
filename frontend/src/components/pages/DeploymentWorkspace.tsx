import React, { useMemo } from 'react';
import { GitBranch, Shield, Zap, Box, Activity, Ban } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { MetricCard } from '../ui/MetricCard';
import { Skeleton } from '../ui/Skeleton';
import { useDeployments } from '../../hooks/useApi';
import type { Deployment } from '../../types';

export default function DeploymentWorkspace() {
  const { data: rawDeployments, isLoading } = useDeployments();
  const deployments = useMemo(() => rawDeployments || [], [rawDeployments]);

  const activeCount = deployments.filter((d: Deployment) => d.status === 'active' || d.status === 'success').length;
  const blockedCount = deployments.filter((d: Deployment) => d.status === 'blocked' || d.status === 'failed').length;

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Skeleton width={300} height={32} />
        <div className="sf-v2-grid-kpi" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={80} />)}
        </div>
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={70} />)}
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--sf-ink)', margin: '0 0 4px 0' }}>Deployment Timeline</h1>
        <p style={{ fontSize: 13, color: 'var(--sf-ink-low)' }}>Track CI/CD pipeline runs and their security status.</p>
      </div>

      <div className="sf-v2-grid-kpi" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <MetricCard title="Total Deployments" value={deployments.length} Icon={Box} iconColor="var(--sf-accent)" />
        <MetricCard title="Active Deployments" value={activeCount} Icon={Activity} iconColor="var(--sf-green)" />
        <MetricCard title="Blocked Deployments" value={blockedCount} Icon={Ban} iconColor="var(--sf-red)" />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {deployments.length === 0 ? (
          <Card style={{ padding: 40, textAlign: 'center', color: 'var(--sf-ink-mid)', fontSize: 14 }}>
            No deployments found. Start a pipeline run to see history.
          </Card>
        ) : (
          deployments.map((dep: Deployment, idx: number) => {
            const isBlocked = dep.status === 'blocked' || dep.status === 'failed';
            const statusColor = isBlocked ? 'var(--sf-red)' : 'var(--sf-green)';
            return (
              <Card key={dep.id || idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: statusColor, boxShadow: `0 0 8px ${statusColor}80` }} />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--sf-ink)' }}>{dep.repo_name || 'unknown-repo'}</span>
                      <span style={{ fontSize: 12, color: 'var(--sf-ink-low)', fontFamily: 'var(--sf-font-mono)', background: 'var(--sf-bg)', padding: '2px 6px', borderRadius: 4 }}>
                        {dep.commit_sha ? dep.commit_sha.substring(0, 7) : 'N/A'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: 'var(--sf-ink-mid)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}><GitBranch size={14} /> {dep.branch || 'main'}</div>
                      <div>•</div>
                      <div>Env: <span style={{ color: 'var(--sf-ink)' }}>{dep.environment || 'production'}</span></div>
                      <div>•</div>
                      <div>Rev: {dep.revision || '1'}</div>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {dep.dast_status && (
                    <Badge variant={dep.dast_status === 'completed' ? 'passed' : 'blocked'}>
                      <Shield size={12} style={{ marginRight: 4 }} /> DAST: {dep.dast_status.toUpperCase()}
                    </Badge>
                  )}
                  {dep.ai_verdict && (
                    <Badge variant="neutral"><Zap size={12} style={{ marginRight: 4 }} /> AI: {dep.ai_verdict.toUpperCase()}</Badge>
                  )}
                  <div style={{ fontSize: 12, color: 'var(--sf-ink-low)', minWidth: 100, textAlign: 'right' }}>
                    {dep.created_at ? new Date(dep.created_at).toLocaleString() : 'Just now'}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
