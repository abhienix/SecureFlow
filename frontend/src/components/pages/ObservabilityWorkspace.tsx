import React, { useMemo } from 'react';
import { Server, Layers, Cpu, CheckCircle, Clock, Activity, Database, Zap } from 'lucide-react';
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardHeader } from '../ui/Card';
import { MetricCard } from '../ui/MetricCard';
import { Skeleton } from '../ui/Skeleton';
import { useMetrics } from '../../hooks/useApi';
import { useUIStore } from '../../stores/uiStore';

export default function ObservabilityWorkspace() {
  const { data: metrics, isLoading } = useMetrics();
  const { wsConnected } = useUIStore();
  const dast = useMemo(() => metrics?.dast_pipeline || {}, [metrics]);

  const chartData = useMemo(() => [
    { name: 'Queued', value: dast.queued_jobs || 0, fill: 'var(--sf-blue)' },
    { name: 'Running', value: dast.running_jobs || 0, fill: 'var(--sf-amber)' },
    { name: 'Completed', value: dast.completed_jobs || 0, fill: 'var(--sf-green)' },
    { name: 'Failed', value: dast.failed_jobs || 0, fill: 'var(--sf-red)' },
  ], [dast]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Skeleton width={400} height={32} />
        <div className="sf-v2-grid-kpi" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} height={80} />)}
        </div>
        <div className="sf-v2-grid-2"><Skeleton height={250} /><Skeleton height={250} /></div>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--sf-ink)', margin: '0 0 4px 0' }}>Infrastructure Monitoring Center</h1>
        <p style={{ fontSize: 13, color: 'var(--sf-ink-low)' }}>Real-time telemetry, pipeline queues, and system health metrics.</p>
      </div>

      <div className="sf-v2-grid-kpi" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        <MetricCard title="Total Scans" value={metrics?.total_scans || 0} Icon={Server} iconColor="var(--sf-accent)" />
        <MetricCard title="DAST Queue" value={dast.queued_jobs || 0} Icon={Layers} iconColor="var(--sf-blue)" />
        <MetricCard title="Active Workers" value={dast.running_jobs || 0} Icon={Cpu} iconColor="var(--sf-amber)" />
        <MetricCard title="Completed DAST" value={dast.completed_jobs || 0} Icon={CheckCircle} iconColor="var(--sf-green)" />
        <MetricCard title="Avg Duration" value={`${dast.avg_duration_seconds || 0}s`} Icon={Clock} iconColor="var(--sf-violet)" />
      </div>

      <div className="sf-v2-grid-2">
        <Card>
          <CardHeader title="DAST Pipeline Job Distribution" subtitle="Queue and worker telemetry" action={<Activity size={18} color="var(--sf-accent)" />} />
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="var(--sf-ink-low)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--sf-ink-low)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: 'var(--sf-bg-card)', borderColor: 'var(--sf-border)', color: 'var(--sf-ink)', borderRadius: 8 }} itemStyle={{ color: 'var(--sf-ink)', fontSize: 13 }} labelStyle={{ color: 'var(--sf-ink-mid)', fontSize: 12, marginBottom: 4 }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Infrastructure Service Status" subtitle="Backend connectivity" action={<Database size={18} color="var(--sf-accent)" />} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { Icon: Zap, name: 'FastAPI Gateway Server', status: wsConnected ? 'Connected' : 'Reconnecting...', color: wsConnected ? 'var(--sf-green)' : 'var(--sf-amber)' },
              { Icon: Database, name: 'Redis Task Broker', status: 'Connected', color: 'var(--sf-green)' },
              { Icon: Cpu, name: 'Celery DAST Workers', status: 'Active', color: 'var(--sf-green)' },
            ].map((svc) => (
              <div key={svc.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, background: 'var(--sf-bg-surface)', borderRadius: 8, border: '1px solid var(--sf-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svc.Icon size={16} color="var(--sf-accent)" />
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--sf-ink)' }}>{svc.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: svc.color }} />
                  <span style={{ fontSize: 12, color: svc.color, fontWeight: 700 }}>{svc.status}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
