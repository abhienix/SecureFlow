import React, { useState } from 'react';
import { GitBranch, Play, Cloud, Database, Server, Activity, Monitor, LayoutTemplate } from 'lucide-react';

export interface TopologyNode {
  id: string;
  name: string;
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
  type: string;
  metrics?: {
    cpu?: number;
    memory?: number;
    latency?: number;
  };
}

interface InfraTopologyGraphProps {
  nodes: TopologyNode[];
  onNodeClick?: (node: TopologyNode) => void;
}

export function InfraTopologyGraph({ nodes, onNodeClick }: InfraTopologyGraphProps) {
  const [hoveredNode, setHoveredNode] = useState<TopologyNode | null>(null);

  // Position lookup map for SVG coordinates (800 x 320 viewbox)
  const positions: Record<string, { x: number; y: number }> = {
    github: { x: 80, y: 70 },
    actions: { x: 250, y: 70 },
    cloud_run: { x: 420, y: 70 },
    redis: { x: 590, y: 70 },
    worker: { x: 720, y: 150 },
    fastapi: { x: 550, y: 160 },
    postgres: { x: 380, y: 160 },
    prometheus: { x: 210, y: 160 },
    grafana: { x: 380, y: 250 },
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return '#10B981'; // green
      case 'degraded':
        return '#F59E0B'; // amber
      case 'down':
        return '#EF4444'; // red
      default:
        return '#64748B'; // muted
    }
  };

  const getNodeIcon = (id: string) => {
    switch (id) {
      case 'github':
        return GitBranch;
      case 'actions':
        return Play;
      case 'cloud_run':
        return Cloud;
      case 'redis':
        return Database;
      case 'worker':
        return Server;
      case 'fastapi':
        return Activity;
      case 'prometheus':
        return Monitor;
      case 'grafana':
        return LayoutTemplate;
      case 'postgres':
        return Database;
      default:
        return Server;
    }
  };

  // Edges mapping according to Part 3 spec
  const edges = [
    { source: 'github', target: 'actions', animated: true },
    { source: 'actions', target: 'cloud_run', animated: true },
    { source: 'cloud_run', target: 'redis', animated: true },
    { source: 'redis', target: 'worker', animated: true },
    { source: 'worker', target: 'fastapi', animated: true },
    { source: 'fastapi', target: 'postgres', animated: true },
    { source: 'prometheus', target: 'fastapi', animated: false },
    { source: 'prometheus', target: 'grafana', animated: false },
    { source: 'grafana', target: 'postgres', animated: false },
  ];

  // Trigonometric calculation to stop arrow exactly at border of 140x56 node
  const getLineCoordinates = (sourceId: string, targetId: string) => {
    const start = positions[sourceId];
    const end = positions[targetId];
    if (!start || !end) return { x1: 0, y1: 0, x2: 0, y2: 0 };

    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const angle = Math.atan2(dy, dx);

    // Node half-dimensions: horizontal=70px, vertical=28px
    // Offset targets slightly more (78px horizontal, 34px vertical) to leave gap for SVG arrow marker
    const x1 = start.x + Math.cos(angle) * 70;
    const y1 = start.y + Math.sin(angle) * 28;
    const x2 = end.x - Math.cos(angle) * 78;
    const y2 = end.y - Math.sin(angle) * 34;

    return { x1, y1, x2, y2 };
  };

  return (
    <div
      style={{
        backgroundColor: 'var(--sf-bg-card)',
        border: '1px solid var(--sf-border)',
        borderRadius: '12px',
        padding: '20px',
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <h3
        style={{
          fontSize: '14px',
          fontWeight: 700,
          color: 'var(--sf-text-primary)',
          margin: '0 0 16px 0',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        Infrastructure Topology Graph
      </h3>

      <div style={{ position: 'relative', width: '100%', height: '320px' }}>
        <svg
          viewBox="0 0 800 320"
          width="100%"
          height="100%"
          style={{ overflow: 'visible', background: 'transparent' }}
        >
          <defs>
            {/* SVG marker for connection arrows */}
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="var(--sf-border)" />
            </marker>
          </defs>

          {/* Render Connections behind nodes */}
          {edges.map((edge, idx) => {
            const coords = getLineCoordinates(edge.source, edge.target);
            if (coords.x1 === 0) return null;

            return (
              <line
                key={idx}
                x1={coords.x1}
                y1={coords.y1}
                x2={coords.x2}
                y2={coords.y2}
                stroke={edge.animated ? 'var(--sf-accent)' : 'var(--sf-border)'}
                strokeWidth={2}
                strokeDasharray={edge.animated ? '5,5' : 'none'}
                markerEnd="url(#arrow)"
                style={{
                  animation: edge.animated ? 'dash 15s linear infinite' : 'none',
                }}
              />
            );
          })}

          {/* Render Nodes */}
          {nodes.map((node) => {
            const pos = positions[node.id];
            if (!pos) return null;

            const isHovered = hoveredNode?.id === node.id;
            const nodeColor = getStatusColor(node.status);
            const isDown = node.status === 'down';
            const Icon = getNodeIcon(node.id);

            return (
              <g key={node.id}>
                <foreignObject
                  x={pos.x - 70}
                  y={pos.y - 28}
                  width="140"
                  height="56"
                  onMouseEnter={() => setHoveredNode(node)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={() => onNodeClick?.(node)}
                  style={{ overflow: 'visible' }}
                >
                  <div
                    style={{
                      width: '140px',
                      height: '56px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 12px',
                      gap: '8px',
                      backgroundColor: node.status === 'healthy' ? 'rgba(16, 185, 129, 0.06)' : 'var(--sf-bg-surface)',
                      border: `2px solid ${nodeColor}`,
                      boxShadow: isHovered ? '0 4px 12px rgba(79, 70, 229, 0.15)' : 'none',
                      transition: 'all 200ms ease',
                      animation: isDown ? 'pulse-border-red 1.5s infinite' : 'none',
                      cursor: 'pointer',
                      userSelect: 'none',
                      boxSizing: 'border-box',
                    }}
                  >
                    <span style={{ color: nodeColor, display: 'flex', alignItems: 'center' }}>
                      <Icon size={18} />
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: 'var(--sf-text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {node.name}
                    </span>
                  </div>
                </foreignObject>
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredNode && positions[hoveredNode.id] && (
          <div
            style={{
              position: 'absolute',
              left: `${(positions[hoveredNode.id].x / 800) * 100}%`,
              top: `${(positions[hoveredNode.id].y / 320) * 100 - 32}%`,
              transform: 'translate(-50%, -100%)',
              backgroundColor: 'var(--sf-bg-surface)',
              border: '1px solid var(--sf-border)',
              borderRadius: '8px',
              padding: '10px 14px',
              boxShadow: 'var(--sf-shadow-lg)',
              zIndex: 10,
              pointerEvents: 'none',
              minWidth: '160px',
              fontSize: '11px',
              lineHeight: '1.6',
            }}
          >
            <div style={{ fontWeight: 700, color: 'var(--sf-text-primary)', marginBottom: '4px' }}>
              {hoveredNode.name}
            </div>
            <div style={{ color: getStatusColor(hoveredNode.status), fontWeight: 700, textTransform: 'uppercase', fontSize: '10px' }}>
              Status: {hoveredNode.status}
            </div>
            {hoveredNode.metrics && (
              <div style={{ marginTop: '6px', borderTop: '1px solid var(--sf-border)', paddingTop: '6px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {hoveredNode.metrics.cpu !== undefined && (
                  <div>CPU: {hoveredNode.metrics.cpu}%</div>
                )}
                {hoveredNode.metrics.memory !== undefined && (
                  <div>Memory: {hoveredNode.metrics.memory}%</div>
                )}
                {hoveredNode.metrics.latency !== undefined && (
                  <div>Latency: {hoveredNode.metrics.latency}ms</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes dash {
          to {
            stroke-dashoffset: -1000;
          }
        }
        @keyframes pulse-border-red {
          0% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
            border-color: rgba(239, 68, 68, 0.8);
          }
          70% {
            box-shadow: 0 0 0 8px rgba(239, 68, 68, 0);
            border-color: rgba(239, 68, 68, 1);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
            border-color: rgba(239, 68, 68, 0.8);
          }
        }
      `}</style>
    </div>
  );
}
export default InfraTopologyGraph;
