import React, { useState } from 'react';

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

  // Position lookup map for SVG coordinates
  const positions: Record<string, { x: number; y: number }> = {
    github: { x: 80, y: 150 },
    actions: { x: 220, y: 150 },
    cloud_run: { x: 380, y: 150 },
    redis: { x: 540, y: 80 },
    worker: { x: 700, y: 80 },
    prometheus: { x: 380, y: 260 },
    postgres: { x: 540, y: 220 },
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

  const getGlowId = (nodeId: string, status: string) => `glow-${nodeId}-${status}`;

  const renderGlowFilter = (nodeId: string, status: string) => {
    const color = getStatusColor(status);
    return (
      <filter id={getGlowId(nodeId, status)} x="-50%" y="-50%" width="200%" height="200%" key={nodeId}>
        <feGaussianBlur stdDeviation="6" result="blur" />
        <feComponentTransfer in="blur" result="glow">
          <feFuncA type="linear" slope="0.6" />
        </feComponentTransfer>
        <feMerge>
          <feMergeNode in="glow" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    );
  };

  // Edges mapping Section 4.7
  const edges = [
    { source: 'github', target: 'actions', animated: true },
    { source: 'actions', target: 'cloud_run', animated: true },
    { source: 'cloud_run', target: 'redis', animated: true },
    { source: 'redis', target: 'worker', animated: true },
    { source: 'cloud_run', target: 'postgres', animated: true },
    { source: 'prometheus', target: 'cloud_run', animated: false },
    { source: 'prometheus', target: 'postgres', animated: false },
  ];

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
            {nodes.map((node) => renderGlowFilter(node.id, node.status))}
            {/* SVG marker for connection arrows */}
            <marker
              id="arrow"
              viewBox="0 0 10 10"
              refX="28"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--sf-border)" />
            </marker>
          </defs>

          {/* Render Connections */}
          {edges.map((edge, idx) => {
            const start = positions[edge.source];
            const end = positions[edge.target];
            if (!start || !end) return null;

            return (
              <line
                key={idx}
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
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

            return (
              <g
                key={node.id}
                onClick={() => onNodeClick?.(node)}
                onMouseEnter={() => setContextHover(node)}
                onMouseLeave={() => setContextHover(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Status Indicator Glow */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={isHovered ? 26 : 22}
                  fill="var(--sf-bg-surface)"
                  stroke={nodeColor}
                  strokeWidth={2}
                  style={{
                    filter: `url(#${getGlowId(node.id, node.status)})`,
                    transition: 'all 200ms ease',
                    animation: isDown ? 'pulse-glow 2s ease-in-out infinite' : 'none',
                  }}
                />

                {/* Node center symbol */}
                <circle cx={pos.x} cy={pos.y} r={6} fill={nodeColor} />

                {/* Node Label */}
                <text
                  x={pos.x}
                  y={pos.y + 38}
                  textAnchor="middle"
                  fill="var(--sf-text-primary)"
                  fontSize={12}
                  fontWeight={600}
                >
                  {node.name}
                </text>

                {/* Node status label */}
                <text
                  x={pos.x}
                  y={pos.y + 50}
                  textAnchor="middle"
                  fill="var(--sf-text-muted)"
                  fontSize={10}
                  fontWeight={500}
                >
                  {node.status.toUpperCase()}
                </text>
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
              top: `${(positions[hoveredNode.id].y / 320) * 100 - 35}%`,
              transform: 'translate(-50%, -100%)',
              backgroundColor: 'var(--sf-bg-surface)',
              border: '1px solid var(--sf-border)',
              borderRadius: '8px',
              padding: '10px 14px',
              boxShadow: 'var(--sf-shadow-lg)',
              zIndex: 10,
              pointerEvents: 'none',
              minWidth: '150px',
              fontSize: '11px',
              lineHeight: '1.5',
            }}
          >
            <div style={{ fontWeight: 700, color: 'var(--sf-text-primary)', marginBottom: '4px' }}>
              {hoveredNode.name}
            </div>
            <div style={{ color: getStatusColor(hoveredNode.status), fontWeight: 600 }}>
              Status: {hoveredNode.status.toUpperCase()}
            </div>
            {hoveredNode.metrics && (
              <div style={{ marginTop: '6px', borderTop: '1px solid var(--sf-border)', paddingTop: '4px' }}>
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
      `}</style>
    </div>
  );

  function setContextHover(node: TopologyNode | null) {
    setHoveredNode(node);
  }
}
export default InfraTopologyGraph;
