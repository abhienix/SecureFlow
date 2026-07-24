import React from 'react';
import { Server, Layers, Cpu, CheckCircle, Clock, Activity, Database, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import MetricCard from '../ui/MetricCard';
import LiveTelemetryStreamCard from '../shared/LiveTelemetryStreamCard';

export default function ObservabilityPage({ metrics = {}, C }) {
  const dast = metrics.dast_pipeline || {};

  const cardStyle = {
    background: C.bgCard,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    padding: 20
  };

  const chartData = [
    { name: 'Queued', value: dast.queued_jobs || 0, fill: '#3b82f6' },
    { name: 'Running', value: dast.running_jobs || 0, fill: '#f59e0b' },
    { name: 'Completed', value: dast.completed_jobs || 0, fill: '#10b981' },
    { name: 'Failed', value: dast.failed_jobs || 0, fill: '#ef4444' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: 30, height: '100%', overflowY: 'auto' }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: C.ink, margin: '0 0 4px 0' }}>Infrastructure Monitoring Center</h1>
        <div style={{ fontSize: 13, color: C.inkLow }}>Real-time telemetry, pipeline queues, and system health metrics.</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
        <MetricCard title="Total Scans" value={metrics.total_scans || 0} Icon={Server} C={C} />
        <MetricCard title="DAST Queue" value={dast.queued_jobs || 0} Icon={Layers} C={C} />
        <MetricCard title="Active Workers" value={dast.running_jobs || 0} Icon={Cpu} C={C} />
        <MetricCard title="Completed DAST" value={dast.completed_jobs || 0} Icon={CheckCircle} C={C} />
        <MetricCard title="Avg Duration" value={(dast.avg_duration_seconds || 0) + 's'} Icon={Clock} C={C} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Activity size={18} color={C.accent} />
            <div style={{ fontSize: 16, fontWeight: 700, color: C.ink }}>DAST Pipeline Status</div>
          </div>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke={C.inkLow} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke={C.inkLow} fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: C.bg }}
                  contentStyle={{ backgroundColor: C.bgCard, borderColor: C.border, color: C.ink, borderRadius: 8 }}
                  itemStyle={{ color: C.ink, fontSize: 13 }}
                  labelStyle={{ color: C.inkMid, fontSize: 12, marginBottom: 4 }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Database size={18} color={C.accent} />
            <div style={{ fontSize: 16, fontWeight: 700, color: C.ink }}>Infrastructure Status</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, background: C.bg, borderRadius: 8, border: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Zap size={16} color={C.inkMid} />
                <span style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>FastAPI Server</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
                <span style={{ fontSize: 12, color: C.inkLow }}>Connected</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, background: C.bg, borderRadius: 8, border: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Database size={16} color={C.inkMid} />
                <span style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>Redis Broker</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: dast.broker_host ? '#10b981' : '#ef4444' }} />
                <span style={{ fontSize: 12, color: C.inkLow }}>{dast.broker_host ? 'Connected' : 'Disconnected'}</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, background: C.bg, borderRadius: 8, border: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Cpu size={16} color={C.inkMid} />
                <span style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>Celery Workers</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: dast.worker_queue ? '#10b981' : '#f59e0b' }} />
                <span style={{ fontSize: 12, color: C.inkLow }}>{dast.worker_queue ? 'Active' : 'Idle'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <LiveTelemetryStreamCard C={C} />
      </div>
    </div>
  );
}
