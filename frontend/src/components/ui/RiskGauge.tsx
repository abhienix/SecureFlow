import React, { useMemo } from 'react';

export interface RiskGaugeProps {
  /** 0-100 score */
  score: number;
  label?: string;
  size?: number;
}

/**
 * Animated radial gauge for risk posture visualization.
 * Color transitions: green (>=80) → amber (>=50) → red (<50).
 */
export function RiskGauge({ score, label = 'Risk Score', size = 180 }: RiskGaugeProps) {
  const clamped = Math.max(0, Math.min(100, score));
  const radius = (size - 24) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  const stroke = useMemo(() => {
    if (clamped >= 80) return 'var(--sf-green)';
    if (clamped >= 50) return 'var(--sf-amber)';
    return 'var(--sf-red)';
  }, [clamped]);

  const statusLabel = useMemo(() => {
    if (clamped >= 80) return 'Healthy';
    if (clamped >= 50) return 'At Risk';
    return 'Critical';
  }, [clamped]);

  return (
    <div className="sf-v2-gauge" style={{ width: size, height: size }}>
      <svg className="sf-v2-gauge__svg" width={size} height={size}>
        <circle
          className="sf-v2-gauge__track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
        />
        <circle
          className="sf-v2-gauge__fill"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="sf-v2-gauge__center">
        <div className="sf-v2-gauge__value">{Math.round(clamped)}</div>
        <div className="sf-v2-gauge__label">{label}</div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            marginTop: 4,
            color: stroke,
          }}
        >
          {statusLabel}
        </div>
      </div>
    </div>
  );
}

export default RiskGauge;
