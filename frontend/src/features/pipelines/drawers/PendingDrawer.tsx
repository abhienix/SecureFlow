import React from 'react';

interface PendingDrawerProps {
  label: string;
}

export function PendingDrawer({ label }: PendingDrawerProps) {
  return (
    <div style={{
      backgroundColor: '#1E293B',
      border: '1px solid #334155',
      borderRadius: '6px',
      padding: '16px',
      fontSize: '13px',
      color: '#94A3B8',
      lineHeight: '1.5'
    }}>
      Waiting for earlier stages to complete before this stage can begin.
    </div>
  );
}
export default PendingDrawer;
