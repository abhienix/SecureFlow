import React from 'react';
import { Server, Layers, Cpu, CheckCircle, Clock, Activity, Database, Zap } from 'lucide-react';
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import MetricCard from '../ui/MetricCard';
import LiveTelemetryStreamCard from '../shared/LiveTelemetryStreamCard';

export default function ObservabilityPage({ metrics = {}, C }) {
  const dast = metrics.dast_pipeline || {};

  const cardStyle = {
    background: C?.bgCard || "#0f172a",
    border: `1px solid ${C?.border || "#1e293b"}`,
    borderRadius: 12,
    padding: 20
  };

  const chartData = [
    { name: 'Queued', value: dast.queued_jobs || 0, fill: C?.blue || '#3b82f6' },
    { name: 'Running', value: dast.running_jobs || 0, fill: C?.amber || '#f59e0b' },
    { name: 'Completed', value: dast.completed_jobs || 0, fill: C?.green || '#10b981' },
    { name: 'Failed', value: dast.failed_jobs || 0, fill: C?.red || '#ef4444' }
  ];

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: C?.ink || "#f8fafc", margin: '0 0 4px 0' }}>
          Infrastructure Monitoring Center
        </h1>
        <div style={{ fontSize: 13, color: C?.inkLow || "#64748b" }}>
          Real-time telemetry, pipeline queues, and system health metrics.
        </div>
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
            <Activity size={18} color={C?.accent || "#6366F1"} />
            <div style={{ fontSize: 16, fontWeight: 700, color: C?.ink || "#f8fafc" }}>DAST Pipeline Job Distribution</div>
          </div>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke={C?.inkLow || "#64748b"} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke={C?.inkLow || "#64748b"} fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: C?.bgSurface || "rgba(255,255,255,0.05)" }}
                  contentStyle={{ backgroundColor: C?.bgCard || "#0f172a", borderColor: C?.border || "#1e293b", color: C?.ink || "#f8fafc", borderRadius: 8 }}
                  itemStyle={{ color: C?.ink || "#f8fafc", fontSize: 13 }}
                  labelStyle={{ color: C?.inkMid || "#94a3b8", fontSize: 12, marginBottom: 4 }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Database size={18} color={C?.accent || "#6366F1"} />
            <div style={{ fontSize: 16, fontWeight: 700, color: C?.ink || "#f8fafc" }}>Infrastructure Service Status</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, background: C?.bgSurface || "#111827", borderRadius: 8, border: `1px solid ${C?.border || "#1e293b"}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Zap size={16} color={C?.accent || "#6366F1"} />
                <span style={{ fontSize: 13, fontWeight: 600, color: C?.ink || "#f8fafc" }}>FastAPI Gateway Server</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: C?.green || '#10b981' }} />
                <span style={{ fontSize: 12, color: C?.green || '#10b981', fontWeight: 700 }}>Connected</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, background: C?.bgSurface || "#111827", borderRadius: 8, border: `1px solid ${C?.border || "#1e293b"}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Database size={16} color={C?.accent || "#6366F1"} />
                <span style={{ fontSize: 13, fontWeight: 600, color: C?.ink || "#f8fafc" }}>Redis Task Broker</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: C?.green || '#10b981' }} />
                <span style={{ fontSize: 12, color: C?.green || '#10b981', fontWeight: 700 }}>Connected</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, background: C?.bgSurface || "#111827", borderRadius: 8, border: `1px solid ${C?.border || "#1e293b"}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Cpu size={16} color={C?.accent || "#6366F1"} />
                <span style={{ fontSize: 13, fontWeight: 600, color: C?.ink || "#f8fafc" }}>Celery DAST Workers</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: C?.green || '#10b981' }} />
                <span style={{ fontSize: 12, color: C?.green || '#10b981', fontWeight: 700 }}>Active</span>
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
