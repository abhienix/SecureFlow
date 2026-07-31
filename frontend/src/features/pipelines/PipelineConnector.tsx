import React from 'react';

interface PipelineConnectorProps {
  sourceResult?: string;
  forcedSkipped?: boolean;
}

export function PipelineConnector({ sourceResult, forcedSkipped = false }: PipelineConnectorProps) {
  const r = forcedSkipped ? 'skipped' : sourceResult?.toUpperCase() || 'PENDING';

  let color = '#374151';
  let dasharray = 'none';
  let opacity = 1;
  let animate = false;

  if (['PASS', 'PASSED', 'ALLOW', 'SCANNED', 'CLEAN', 'SUCCESS', 'COMPLETE', 'COMPLETED'].includes(r)) {
    color = '#10B981';
  } else if (['BLOCK', 'BLOCKED', 'FAIL', 'FAILED', 'FAILURE', 'ERROR'].includes(r)) {
    color = '#EF4444';
    dasharray = '6,4';
  } else if (r === 'RUNNING') {
    color = '#6366F1';
    dasharray = '8,4';
    animate = true;
  } else if (r === 'PENDING') {
    color = '#374151';
    dasharray = '4,6';
    opacity = 0.4;
  } else if (r === 'SKIPPED' || r === 'skipped') {
    color = '#374151';
    dasharray = '4,6';
    opacity = 0.3;
  } else {
    // Treat unknown as pending
    color = '#374151';
    dasharray = '4,6';
    opacity = 0.4;
  }

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      minWidth: '16px',
      height: '52px', // Align with center of the 52px circle
      paddingBottom: '26px', // Shift up by half node height + label height offset
      boxSizing: 'border-box'
    }}>
      <svg 
        style={{ 
          width: '100%', 
          height: '2px', 
          overflow: 'visible',
          opacity 
        }}
      >
        <line
          x1="0"
          y1="1"
          x2="100%"
          y2="1"
          stroke={color}
          strokeWidth={2}
          strokeDasharray={dasharray}
          style={{
            animation: animate 
              ? 'sf-connector-dash 1s linear infinite' 
              : (r === 'PASS' || r === 'ALLOW' ? 'sf-connector-pulse 2s alternate infinite' : 'none'),
            strokeDashoffset: animate ? 20 : 0,
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))'
          }}
        />
      </svg>
      <style>{`
        @keyframes sf-connector-dash {
          to { stroke-dashoffset: 0; }
        }
        @keyframes sf-connector-pulse {
          from { stroke-width: 2px; filter: drop-shadow(0 0 1px #10B981); opacity: 0.85; }
          to { stroke-width: 2.5px; filter: drop-shadow(0 0 4px #10B981); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
