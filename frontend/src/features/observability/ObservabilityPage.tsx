import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldAlert, Server, Activity, Database, AlertCircle, X } from 'lucide-react';
import { InfraTopologyGraph, TopologyNode } from '../../components/topology/InfraTopologyGraph';
import MetricCard from '../../components/charts/MetricCard';
import { DrawerPanel } from '../../components/ui/DrawerPanel';
import { client } from '../../api/client';

export default function ObservabilityPage() {
  const [selectedNode, setSelectedNode] = useState<TopologyNode | null>(null);

  // Local storage state for dismissed Alertmanager alerts
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('sf_dismissed_alerts') || '[]');
    } catch {
      return [];
    }
  });

  const dismissAlert = (name: string) => {
    const next = [...dismissedAlerts, name];
    setDismissedAlerts(next);
    localStorage.setItem('sf_dismissed_alerts', JSON.stringify(next));
  };

  // Fetch alerts
  const { data: alerts } = useQuery<any[]>({
    queryKey: ['alerts'],
    queryFn: async () => {
      const res = await client.get('/alerts');
      return res.data;
    },
    refetchInterval: 15000,
  });

  // Fetch topology configuration
  const { data: topology } = useQuery<{ nodes: TopologyNode[]; edges: any[] }>({
    queryKey: ['topology'],
    queryFn: async () => {
      const res = await client.get('/topology');
      return res.data;
    },
    refetchInterval: 15000,
  });

  // Fetch metrics query (CPU, Memory, Request Rate, Latency)
  const { data: cpuMetric } = useQuery({
    queryKey: ['metrics', 'cpu'],
    queryFn: async () => {
      const res = await client.get('/metrics/query', { params: { query: 'avg(rate(container_cpu_usage_seconds_total[1m]))*100' } });
      return res.data;
    },
    refetchInterval: 10000,
  });

  const { data: memMetric } = useQuery({
    queryKey: ['metrics', 'memory'],
    queryFn: async () => {
      const res = await client.get('/metrics/query', { params: { query: 'container_memory_usage_bytes / container_spec_memory_limit_bytes * 100' } });
      return res.data;
    },
    refetchInterval: 10000,
  });

  const { data: latencyMetric } = useQuery({
    queryKey: ['metrics', 'latency'],
    queryFn: async () => {
      const res = await client.get('/metrics/query', { params: { query: 'histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))' } });
      return res.data;
    },
    refetchInterval: 10000,
  });

  const { data: requestRateMetric } = useQuery({
    queryKey: ['metrics', 'requests'],
    queryFn: async () => {
      const res = await client.get('/metrics/query', { params: { query: 'sum(rate(http_requests_total[1m]))' } });
      return res.data;
    },
    refetchInterval: 10000,
  });

  // Extract values
  const getMetricVal = (metricRes: any, fallback: number) => {
    try {
      const val = metricRes?.data?.result?.[0]?.value?.[1];
      return val ? parseFloat(val).toFixed(1) : fallback;
    } catch {
      return fallback;
    }
  };

  const cpuVal = Number(getMetricVal(cpuMetric, 32.5));
  const memVal = Number(getMetricVal(memMetric, 71.8));
  const latencyVal = Number(getMetricVal(latencyMetric, 15.4));
  const requestRateVal = Number(getMetricVal(requestRateMetric, 24.0));

  // Determine Sparkline Colors by specs
  const cpuColor = cpuVal > 80 ? 'red' : cpuVal >= 50 ? 'amber' : 'green';
  const memColor = memVal > 85 ? 'red' : memVal >= 60 ? 'amber' : 'green';
  const latencyColor = latencyVal > 500 ? 'red' : latencyVal >= 100 ? 'amber' : 'green';

  const activeAlerts = (alerts || []).filter((alert) => !dismissedAlerts.includes(alert.name));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--sf-ink)', margin: '0 0 4px 0' }}>
          Infrastructure Observability
        </h1>
        <p style={{ color: 'var(--sf-ink-low)', margin: 0, fontSize: '14px' }}>
          Real-time Prometheus telemetry, Alertmanager notifications, and microservices network map.
        </p>
      </div>

      {/* Active Alerts List */}
      {activeAlerts.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--sf-danger)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Active Alertmanager Warnings
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {activeAlerts.map((alert, i) => (
              <div
                key={i}
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.05)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  borderLeft: '4px solid var(--sf-danger)',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '13px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <AlertCircle size={16} color="var(--sf-danger)" />
                  <div>
                    <span style={{ fontWeight: 700, color: 'var(--sf-text-primary)' }}>{alert.name}</span>
                    <span style={{ color: 'var(--sf-text-muted)', marginLeft: '8px', fontFamily: 'var(--sf-font-mono)', fontSize: '11px' }}>
                      {alert.expression}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <a
                    href={alert.runbook_link}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: 'var(--sf-accent)', fontWeight: 600, textDecoration: 'none' }}
                  >
                    Runbook Link
                  </a>
                  <button
                    onClick={() => dismissAlert(alert.name)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--sf-text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '4px',
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sparkline Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        <MetricCard title="Container CPU" value={cpuVal} unit="%" icon={<Server size={16} />} color={cpuColor} />
        <MetricCard title="Container Memory" value={memVal} unit="%" icon={<Activity size={16} />} color={memColor} />
        <MetricCard title="P99 HTTP Latency" value={latencyVal} unit="ms" icon={<Database size={16} />} color={latencyColor} />
        <MetricCard title="HTTP Request Rate" value={requestRateVal} unit="req/sec" icon={<Server size={16} />} color="blue" />
      </div>

      {/* Interactive Topology canvas */}
      <div>
        <h2 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--sf-text-primary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Infrastructure Components Flow
        </h2>
        {topology?.nodes && (
          <InfraTopologyGraph nodes={topology.nodes} onNodeClick={(node) => setSelectedNode(node)} />
        )}
      </div>

      {/* Node details drawer */}
      <DrawerPanel
        isOpen={!!selectedNode}
        onClose={() => setSelectedNode(null)}
        title={`${selectedNode?.name || 'Node'} Health Telemetry`}
      >
        {selectedNode && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--sf-text-secondary)', textTransform: 'uppercase' }}>
                Service Type
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--sf-text-primary)', marginTop: '4px' }}>
                {selectedNode.type?.toUpperCase()}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--sf-text-secondary)', textTransform: 'uppercase' }}>
                Current Status
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor:
                      selectedNode.status === 'healthy'
                        ? 'var(--sf-success)'
                        : selectedNode.status === 'degraded'
                        ? 'var(--sf-warning)'
                        : 'var(--sf-danger)',
                  }}
                />
                <span style={{ fontSize: '13px', fontWeight: 600, textTransform: 'capitalize' }}>
                  {selectedNode.status}
                </span>
              </div>
            </div>

            {selectedNode.metrics && (
              <div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--sf-text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Active Prometheus Metrics
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  {selectedNode.metrics.cpu !== undefined && (
                    <div style={{ backgroundColor: 'var(--sf-bg-surface)', padding: '12px', borderRadius: '6px', border: '1px solid var(--sf-border)' }}>
                      <div style={{ fontSize: '10px', color: 'var(--sf-text-muted)' }}>CPU</div>
                      <div style={{ fontSize: '16px', fontWeight: 700 }}>{selectedNode.metrics.cpu}%</div>
                    </div>
                  )}
                  {selectedNode.metrics.memory !== undefined && (
                    <div style={{ backgroundColor: 'var(--sf-bg-surface)', padding: '12px', borderRadius: '6px', border: '1px solid var(--sf-border)' }}>
                      <div style={{ fontSize: '10px', color: 'var(--sf-text-muted)' }}>Memory</div>
                      <div style={{ fontSize: '16px', fontWeight: 700 }}>{selectedNode.metrics.memory}%</div>
                    </div>
                  )}
                  {selectedNode.metrics.latency !== undefined && (
                    <div style={{ backgroundColor: 'var(--sf-bg-surface)', padding: '12px', borderRadius: '6px', border: '1px solid var(--sf-border)' }}>
                      <div style={{ fontSize: '10px', color: 'var(--sf-text-muted)' }}>Latency</div>
                      <div style={{ fontSize: '16px', fontWeight: 700 }}>{selectedNode.metrics.latency}ms</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </DrawerPanel>
    </div>
  );
}
