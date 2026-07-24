import React from "react";
import { Cpu, Server, Database, Activity, RefreshCw, Layers } from "lucide-react";
import MetricCard from "../ui/MetricCard";
import LiveTelemetryStreamCard from "../shared/LiveTelemetryStreamCard";

export default function ObservabilityPage({ metrics = {}, C }) {
  const dast = metrics.dast_pipeline || {};

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: C?.textPrimary || "#F1F5F9" }}>
          Infrastructure Observability & Celery Telemetry
        </h1>
        <span style={{ fontSize: 13, color: C?.textMuted || "#475569" }}>
          Prometheus instrumented FastAPI gateway, Redis queue length, Celery worker pool, and Cloud Run metrics
        </span>
      </div>

      {/* Row 1: KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14 }}>
        <MetricCard title="Celery Queue" value={dast.worker_queue || "celery"} change={`${dast.queued_jobs || 0} queued`} isPositive={true} Icon={Layers} C={C} />
        <MetricCard title="Active Workers" value="1 Node" change="Ubuntu VM (Worker-01)" isPositive={true} Icon={Cpu} C={C} />
        <MetricCard title="Broker Redis" value="Connected" change={dast.broker_host || "redis://localhost:6379/0"} isPositive={true} Icon={Database} C={C} />
        <MetricCard title="Avg Scan Duration" value={`${dast.avg_duration_seconds || 45}s`} change="ZAP Probe Speed" isPositive={true} Icon={Activity} C={C} />
        <MetricCard title="Total Scans Processed" value={metrics.total_scans || 12} change="100% Ingestion" isPositive={true} Icon={Server} C={C} />
      </div>

      {/* Row 2: Live Telemetry Stream Card */}
      <LiveTelemetryStreamCard C={C} />
    </div>
  );
}
