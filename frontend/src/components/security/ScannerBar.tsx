import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ScannerData {
  scanner: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

interface ScannerBarProps {
  data: ScannerData[];
}

export function ScannerBar({ data }: ScannerBarProps) {
  return (
    <div
      style={{
        backgroundColor: 'var(--sf-bg-card)',
        border: '1px solid var(--sf-border)',
        borderRadius: '12px',
        padding: '20px',
        height: '300px',
        width: '100%',
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
        Scanner Findings Comparison
      </h3>
      <div style={{ width: '100%', height: '90%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--sf-border)" />
            <XAxis dataKey="scanner" stroke="var(--sf-text-secondary)" fontSize={11} />
            <YAxis stroke="var(--sf-text-secondary)" fontSize={11} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--sf-bg-surface)',
                borderColor: 'var(--sf-border)',
                color: 'var(--sf-text-primary)',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
            <Bar dataKey="critical" name="Critical" fill="#EF4444" radius={[4, 4, 0, 0]} />
            <Bar dataKey="high" name="High" fill="#F59E0B" radius={[4, 4, 0, 0]} />
            <Bar dataKey="medium" name="Medium" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="low" name="Low" fill="#10B981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
export default ScannerBar;
