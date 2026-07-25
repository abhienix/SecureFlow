import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useScans } from '../../hooks/useApi';

// ─── MAIN OVERVIEW WORKSPACE ───────────────────────────────────────────────────

export default function OverviewWorkspace() {
  const navigate = useNavigate();
  const { data: rawScans } = useScans();

  const [activeTimelineTab, setActiveTimelineTab] = useState<'30d' | '90d' | 'all'>('30d');

  useEffect(() => {
    document.title = 'Overview — SecureFlow';
  }, []);

  const scans = useMemo(() => rawScans || [], [rawScans]);

  const stats = useMemo(() => {
    const totalScans = scans.length || 1;
    const passed = scans.filter((s) => s.action_taken === 'ALLOW').length;
    const blocked = scans.filter((s) => s.action_taken === 'BLOCK').length;
    const passRate = Math.round((passed / totalScans) * 100) || 56;

    return {
      passRate,
      passed,
      blocked,
      totalScans,
    };
  }, [scans]);

  // Posture score math for circular arc gauge
  // score = 0 (as critical secret exists)
  const score = 0;
  const circumference = 2 * Math.PI * 36; // ~226.19
  // At score=0: dashoffset = 219 (leaving a tiny ~7px red sliver visible)
  const dashOffset = score === 0 ? 219 : circumference * (1 - score / 100);

  // Gates data (9 gates total, 3x3 grid)
  const gates = [
    { name: 'GitHub Actions', status: 'healthy', sub: 'Workflow active' },
    { name: 'Gitleaks', status: 'healthy', sub: 'Secrets scanner' },
    { name: 'Semgrep SAST', status: 'healthy', sub: 'Code analysis' },
    { name: 'Docker Engine', status: 'healthy', sub: 'Container runtime' },
    { name: 'Trivy', status: 'healthy', sub: 'Vulnerability scanner' },
    { name: 'Policy Engine', status: 'healthy', sub: 'Rules enforced' },
    { name: 'GCP Deploy', status: 'healthy', sub: 'Cloud Run target' },
    { name: 'OWASP ZAP', status: 'failed', sub: '2 findings' },
    { name: 'Overall policy', status: 'unknown', sub: 'Blocked' },
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f8f8f6',
        padding: '20px 24px',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
      className="dark:bg-[#1a1a18] text-gray-900 dark:text-gray-100 transition-colors"
    >
      {/* HEADER */}
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: 'inherit' }}>
          Operational Security Posture
        </h1>
        <p style={{ fontSize: 13, color: '#888', marginTop: 4, margin: 0 }} className="dark:text-gray-400">
          Real-time DevSecOps posture score, active detections, and pipeline gate status
        </p>
      </div>

      {/* ZONE 1 DIVIDER */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0 12px' }}>
        <div style={{ flex: 1, height: 1, background: '#e8e8e4' }} className="dark:bg-[#2e2e2a]" />
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#aaa',
            textTransform: 'uppercase',
            letterSpacing: '.06em',
          }}
        >
          Key Performance Indicators
        </div>
        <div style={{ flex: 1, height: 1, background: '#e8e8e4' }} className="dark:bg-[#2e2e2a]" />
      </div>

      {/* CHANGE 2 — KPI CARD ROW: GRID PROPORTIONS (2fr 1fr 1fr 1fr) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 12,
        }}
        className="lg:!grid-cols-[2fr_1fr_1fr_1fr]"
      >
        {/* A. POSTURE SCORE CARD (2fr) */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #fca5a5',
            borderRadius: 12,
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 12,
          }}
          className="dark:bg-[#242420] dark:border-red-900/60 shadow-sm"
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: '#888',
              textTransform: 'uppercase',
              letterSpacing: '.05em',
            }}
            className="dark:text-gray-400"
          >
            Security Posture Score
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* SVG Circular Gauge 88x88px */}
            <div style={{ position: 'relative', width: 88, height: 88, flexShrink: 0 }}>
              <svg width={88} height={88} viewBox="0 0 88 88" style={{ transform: 'rotate(-90deg)' }}>
                {/* Background Track */}
                <circle
                  cx={44}
                  cy={44}
                  r={36}
                  fill="none"
                  stroke="#e8e8e4"
                  strokeWidth={8}
                  className="dark:stroke-[#2e2e2a]"
                />
                {/* Score Arc Fill */}
                <circle
                  cx={44}
                  cy={44}
                  r={36}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth={8}
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  style={{ transition: 'stroke-dashoffset 1s ease' }}
                />
              </svg>
              {/* Score text centered */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                  fontWeight: 800,
                  color: '#111',
                }}
                className="dark:text-white"
              >
                {score}
              </div>
            </div>

            {/* Right side content */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#dc2626' }}>
                  Needs immediate fix
                </span>
              </div>
              <p
                style={{
                  fontSize: 12,
                  color: '#555',
                  margin: 0,
                  lineHeight: 1.3,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
                className="dark:text-gray-300"
              >
                1 critical secret leak detected in repository. Immediate remediation required.
              </p>

              {/* Last 7 pipelines mini bar chart */}
              <div style={{ marginTop: 2 }}>
                <div style={{ fontSize: 10, color: '#aaa', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>
                  Last 7 pipelines
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 22 }}>
                  {[
                    { h: 14, col: '#22c55e' },
                    { h: 18, col: '#22c55e' },
                    { h: 16, col: '#22c55e' },
                    { h: 20, col: '#22c55e' },
                    { h: 22, col: '#22c55e' },
                    { h: 12, col: '#f59e0b' },
                    { h: 8, col: '#ef4444' },
                  ].map((b, i) => (
                    <div
                      key={i}
                      style={{
                        width: 14,
                        height: b.h,
                        background: b.col,
                        borderRadius: '2px 2px 0 0',
                      }}
                      title={`Run #${i + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* B. ACTIVE DETECTIONS CARD (1fr) */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #fca5a5',
            borderRadius: 12,
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 8,
          }}
          className="dark:bg-[#242420] dark:border-red-900/60 shadow-sm"
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: '#888',
              textTransform: 'uppercase',
              letterSpacing: '.05em',
            }}
            className="dark:text-gray-400"
          >
            Active Detections
          </div>

          <div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#dc2626', lineHeight: 1 }}>1</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#dc2626', marginTop: 2 }}>
              secret leaked
            </div>
            <div style={{ fontSize: 11, color: '#dc2626', marginTop: 2 }}>
              1 critical · action required
            </div>
          </div>

          {/* Info pill at bottom */}
          <div
            style={{
              background: '#fef2f2',
              color: '#b91c1c',
              fontSize: 11,
              borderRadius: 6,
              padding: '8px',
              wordBreak: 'break-all',
              lineHeight: 1.3,
            }}
            className="dark:bg-red-950/40 dark:text-red-300 font-mono"
          >
            AWS key in config/env.sample:14
          </div>
        </div>

        {/* C. OPEN REMEDIATION TASKS CARD (1fr) */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #fde68a',
            borderRadius: 12,
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 8,
          }}
          className="dark:bg-[#242420] dark:border-amber-900/60 shadow-sm"
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: '#888',
              textTransform: 'uppercase',
              letterSpacing: '.05em',
            }}
            className="dark:text-gray-400"
          >
            Open Remediation Tasks
          </div>

          <div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#b45309', lineHeight: 1 }} className="dark:text-amber-500">
              400
            </div>
            <div style={{ fontSize: 11, color: '#b45309', marginTop: 4 }} className="dark:text-amber-400">
              400 auto-generated
            </div>
          </div>

          {/* Mini scanner breakdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
            {[
              { name: 'Trivy', pct: 75, count: 300 },
              { name: 'Semgrep', pct: 30, count: 88 },
              { name: 'ZAP', pct: 14, count: 12 },
            ].map((sc) => (
              <div key={sc.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10 }}>
                <span style={{ width: 50, color: '#777' }} className="dark:text-gray-400">
                  {sc.name}
                </span>
                <div
                  style={{
                    flex: 1,
                    height: 5,
                    background: '#fde68a',
                    borderRadius: 2,
                    overflow: 'hidden',
                  }}
                  className="dark:bg-amber-950/50"
                >
                  <div
                    style={{
                      width: `${sc.pct}%`,
                      height: '100%',
                      background: '#f59e0b',
                      borderRadius: 2,
                    }}
                  />
                </div>
                <span style={{ color: '#777', width: 24, textAlign: 'right' }} className="dark:text-gray-400">
                  {sc.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* D. POLICY PASS RATE CARD (1fr) */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e8e8e4',
            borderRadius: 12,
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: 8,
          }}
          className="dark:bg-[#242420] dark:border-[#2e2e2a] shadow-sm"
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: '#888',
              textTransform: 'uppercase',
              letterSpacing: '.05em',
            }}
            className="dark:text-gray-400"
          >
            Policy Pass Rate
          </div>

          <div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#15803d', lineHeight: 1 }} className="dark:text-green-400">
              {stats.passRate}%
            </div>
            <div style={{ fontSize: 11, color: '#888', marginTop: 4 }} className="dark:text-gray-400">
              112 passed · 39 blocked
            </div>
          </div>

          {/* Sparkline (7 bars) */}
          <div style={{ height: 32, display: 'flex', alignItems: 'flex-end', gap: 3, marginTop: 4 }}>
            {[
              { h: 22, col: '#22c55e' },
              { h: 27, col: '#22c55e' },
              { h: 19, col: '#22c55e' },
              { h: 29, col: '#22c55e' },
              { h: 13, col: '#ef4444' },
              { h: 24, col: '#22c55e' },
              { h: 10, col: '#ef4444' },
            ].map((b, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: b.h,
                  background: b.col,
                  borderRadius: '2px 2px 0 0',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ZONE 2 DIVIDER */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '24px 0 12px' }}>
        <div style={{ flex: 1, height: 1, background: '#e8e8e4' }} className="dark:bg-[#2e2e2a]" />
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#aaa',
            textTransform: 'uppercase',
            letterSpacing: '.06em',
          }}
        >
          Vulnerability Analytics
        </div>
        <div style={{ flex: 1, height: 1, background: '#e8e8e4' }} className="dark:bg-[#2e2e2a]" />
      </div>

      {/* ZONE 2 CONTENT: DONUT + TIMELINE + SCANNER DETECTIONS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 12,
          }}
        >
          {/* CHANGE 3 — VULNERABILITY BREAKDOWN DONUT CHART */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e8e8e4',
              borderRadius: 12,
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 16,
            }}
            className="dark:bg-[#242420] dark:border-[#2e2e2a] shadow-sm"
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: 'inherit' }}>
              Vulnerability Breakdown
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
              {/* Donut SVG 110x110px */}
              <div style={{ position: 'relative', width: 110, height: 110, flexShrink: 0 }}>
                <svg width={110} height={110} viewBox="0 0 110 110" style={{ transform: 'rotate(-90deg)' }}>
                  {/* Base Track */}
                  <circle
                    cx={55}
                    cy={55}
                    r={42}
                    fill="transparent"
                    stroke="#e8e8e4"
                    strokeWidth={12}
                    className="dark:stroke-[#2e2e2a]"
                  />
                  {/* Low/Info (24 - 5.4%) */}
                  <circle
                    cx={55}
                    cy={55}
                    r={42}
                    fill="transparent"
                    stroke="#3b82f6"
                    strokeWidth={12}
                    strokeDasharray="14.2 263.89"
                    strokeDashoffset="0"
                  />
                  {/* Medium (371 - 83.6%) */}
                  <circle
                    cx={55}
                    cy={55}
                    r={42}
                    fill="transparent"
                    stroke="#f59e0b"
                    strokeWidth={12}
                    strokeDasharray="220.6 263.89"
                    strokeDashoffset="-14.2"
                  />
                  {/* High (48 - 10.8%) */}
                  <circle
                    cx={55}
                    cy={55}
                    r={42}
                    fill="transparent"
                    stroke="#f97316"
                    strokeWidth={12}
                    strokeDasharray="28.5 263.89"
                    strokeDashoffset="-234.8"
                  />
                  {/* Critical (1 - 0.2%) - thicker & round stroke for visible dot */}
                  <circle
                    cx={55}
                    cy={55}
                    r={42}
                    fill="transparent"
                    stroke="#ef4444"
                    strokeWidth={16}
                    strokeLinecap="round"
                    strokeDasharray="4 263.89"
                    strokeDashoffset="-263.3"
                  />
                </svg>

                {/* Center text: 444 findings */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span style={{ fontSize: 18, fontWeight: 800, lineHeight: 1 }} className="dark:text-white">
                    444
                  </span>
                  <span style={{ fontSize: 9, color: '#888', marginTop: 2 }} className="dark:text-gray-400">
                    findings
                  </span>
                </div>
              </div>

              {/* Legend Right */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 160 }}>
                {/* Critical Row */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: '#ef4444',
                          boxShadow: '0 0 0 3px #fee2e2',
                        }}
                        className="dark:shadow-red-950/60"
                      />
                      <span style={{ fontWeight: 700, color: '#dc2626' }}>Critical</span>
                    </div>
                    <div>
                      <span style={{ fontWeight: 800, color: '#dc2626' }}>1</span>{' '}
                      <span style={{ fontSize: 10, color: '#888' }} className="dark:text-gray-400">(0.2%)</span>
                    </div>
                  </div>

                  {/* Callout Pill */}
                  <div
                    onClick={() => navigate('/security-center')}
                    style={{
                      marginTop: 4,
                      background: '#fef2f2',
                      color: '#dc2626',
                      fontSize: 10,
                      fontWeight: 600,
                      borderRadius: 4,
                      padding: '4px 8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                    className="dark:bg-red-950/40 dark:text-red-300 hover:opacity-90"
                  >
                    <span>AWS key leaked · immediate action</span>
                    <span>→</span>
                  </div>
                </div>

                {/* High */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f97316' }} />
                    <span style={{ color: '#555' }} className="dark:text-gray-300">High</span>
                  </div>
                  <div>
                    <span style={{ fontWeight: 700 }}>48</span>{' '}
                    <span style={{ fontSize: 10, color: '#888' }} className="dark:text-gray-400">(10.8%)</span>
                  </div>
                </div>

                {/* Medium */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
                    <span style={{ color: '#555' }} className="dark:text-gray-300">Medium</span>
                  </div>
                  <div>
                    <span style={{ fontWeight: 700 }}>371</span>{' '}
                    <span style={{ fontSize: 10, color: '#888' }} className="dark:text-gray-400">(83.6%)</span>
                  </div>
                </div>

                {/* Low/Info */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }} />
                    <span style={{ color: '#555' }} className="dark:text-gray-300">Low / Info</span>
                  </div>
                  <div>
                    <span style={{ fontWeight: 700 }}>24</span>{' '}
                    <span style={{ fontSize: 10, color: '#888' }} className="dark:text-gray-400">(5.4%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* CHANGE 4 — ACTIVITY TIMELINE CHART */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e8e8e4',
              borderRadius: 12,
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 12,
            }}
            className="dark:bg-[#242420] dark:border-[#2e2e2a] shadow-sm"
          >
            {/* Header with Title + Range Tabs */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'inherit' }}>
                  Detections Activity Timeline
                </div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }} className="dark:text-gray-400">
                  Cumulative severity findings over time
                </div>
              </div>

              {/* Tabs: [30d] [90d] [All] */}
              <div style={{ display: 'flex', gap: 4, background: '#f0f0ec', padding: 2, borderRadius: 6 }} className="dark:bg-[#2e2e2a]">
                {(['30d', '90d', 'all'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setActiveTimelineTab(t)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 5,
                      fontSize: 11,
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                      background: activeTimelineTab === t ? '#6366f1' : 'transparent',
                      color: activeTimelineTab === t ? '#ffffff' : '#888',
                    }}
                  >
                    {t.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Clean SVG Timeline Chart */}
            <div style={{ width: '100%', overflow: 'hidden' }}>
              <svg width="100%" height={130} viewBox="0 0 380 130" style={{ overflow: 'visible' }}>
                <defs>
                  <linearGradient id="gradLow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
                  </linearGradient>
                  <linearGradient id="gradHigh" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#f97316" stopOpacity="0.1" />
                  </linearGradient>
                  <linearGradient id="gradCrit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity="0.2" />
                  </linearGradient>
                </defs>

                {/* Gridlines at y=26 (60), y=65 (30), y=104 (0) */}
                <line x1="30" y1="26" x2="375" y2="26" stroke="#e8e8e4" strokeDasharray="3 3" className="dark:stroke-[#2e2e2a]" />
                <line x1="30" y1="65" x2="375" y2="65" stroke="#e8e8e4" strokeDasharray="3 3" className="dark:stroke-[#2e2e2a]" />
                <line x1="30" y1="104" x2="375" y2="104" stroke="#e8e8e4" className="dark:stroke-[#2e2e2a]" />

                {/* Y-axis labels */}
                <text x="4" y="29" fontSize="9" fill="#bbb">60</text>
                <text x="4" y="68" fontSize="9" fill="#bbb">30</text>
                <text x="10" y="107" fontSize="9" fill="#bbb">0</text>

                {/* Area Fills */}
                <path
                  d="M 30 104 C 80 85, 120 70, 160 55 C 200 45, 250 35, 300 28 C 340 24, 365 22, 375 20 L 375 104 L 30 104 Z"
                  fill="url(#gradLow)"
                />
                <path
                  d="M 30 104 C 80 100, 120 95, 160 90 C 200 85, 250 80, 300 75 C 340 70, 365 68, 375 65 L 375 104 L 30 104 Z"
                  fill="url(#gradHigh)"
                />
                <path
                  d="M 30 104 C 100 104, 200 104, 300 103 C 340 102, 365 101, 375 100 L 375 104 L 30 104 Z"
                  fill="url(#gradCrit)"
                />

                {/* Stroke Lines */}
                <path
                  d="M 30 104 C 80 85, 120 70, 160 55 C 200 45, 250 35, 300 28 C 340 24, 365 22, 375 20"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2"
                />
                <path
                  d="M 30 104 C 80 100, 120 95, 160 90 C 200 85, 250 80, 300 75 C 340 70, 365 68, 375 65"
                  fill="none"
                  stroke="#f97316"
                  strokeWidth="1.5"
                />
                <path
                  d="M 30 104 C 100 104, 200 104, 300 103 C 340 102, 365 101, 375 100"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="1.5"
                />

                {/* X-axis date labels */}
                <text x="35" y="120" fontSize="9" fill="#ccc">Jul 1</text>
                <text x="140" y="120" fontSize="9" fill="#ccc">Jul 10</text>
                <text x="250" y="120" fontSize="9" fill="#ccc">Jul 18</text>
                <text x="345" y="120" fontSize="9" fill="#ccc">Jul 25</text>
              </svg>
            </div>

            {/* Color key */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 10, color: '#888' }} className="dark:text-gray-400">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 6, background: '#3b82f6', borderRadius: 1 }} />
                <span>Informational (371)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 6, background: '#f97316', borderRadius: 1 }} />
                <span>High (48)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 6, background: '#ef4444', borderRadius: 1 }} />
                <span>Critical (1)</span>
              </div>
            </div>
          </div>
        </div>

        {/* CHANGE 5 — SCANNER DETECTIONS BAR CHART */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e8e8e4',
            borderRadius: 12,
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
          className="dark:bg-[#242420] dark:border-[#2e2e2a] shadow-sm"
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'inherit' }}>
              Scanner Detections Breakdown
            </div>
            <div style={{ fontSize: 11, color: '#888', marginTop: 2 }} className="dark:text-gray-400">
              Severity distribution per automated security engine
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Gitleaks: 7 total — 1 critical (14%), 6 high (86%) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 80, fontSize: 12, fontWeight: 600, color: '#333' }} className="dark:text-gray-200">
                Gitleaks
              </span>
              <div
                style={{
                  flex: 1,
                  height: 8,
                  background: '#f0f0ec',
                  borderRadius: 4,
                  display: 'flex',
                  overflow: 'hidden',
                }}
                className="dark:bg-[#2e2e2a]"
              >
                <div style={{ width: '14%', background: '#ef4444' }} title="1 Critical" />
                <div style={{ width: '86%', background: '#f97316' }} title="6 High" />
              </div>
              <span style={{ width: 60, fontSize: 11, color: '#888', textAlign: 'right' }} className="dark:text-gray-400">
                7 findings
              </span>
            </div>

            {/* Semgrep: 26 total — 2 high (8%), 8 medium (31%), 16 low (62%) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 80, fontSize: 12, fontWeight: 600, color: '#333' }} className="dark:text-gray-200">
                Semgrep
              </span>
              <div
                style={{
                  flex: 1,
                  height: 8,
                  background: '#f0f0ec',
                  borderRadius: 4,
                  display: 'flex',
                  overflow: 'hidden',
                }}
                className="dark:bg-[#2e2e2a]"
              >
                <div style={{ width: '8%', background: '#f97316' }} title="2 High" />
                <div style={{ width: '31%', background: '#f59e0b' }} title="8 Medium" />
                <div style={{ width: '61%', background: '#3b82f6' }} title="16 Low" />
              </div>
              <span style={{ width: 60, fontSize: 11, color: '#888', textAlign: 'right' }} className="dark:text-gray-400">
                26 findings
              </span>
            </div>

            {/* Trivy: 67 total — 4 high (6%), 20 medium (30%), 43 low (64%) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 80, fontSize: 12, fontWeight: 600, color: '#333' }} className="dark:text-gray-200">
                Trivy
              </span>
              <div
                style={{
                  flex: 1,
                  height: 8,
                  background: '#f0f0ec',
                  borderRadius: 4,
                  display: 'flex',
                  overflow: 'hidden',
                }}
                className="dark:bg-[#2e2e2a]"
              >
                <div style={{ width: '6%', background: '#f97316' }} title="4 High" />
                <div style={{ width: '30%', background: '#f59e0b' }} title="20 Medium" />
                <div style={{ width: '64%', background: '#3b82f6' }} title="43 Low" />
              </div>
              <span style={{ width: 60, fontSize: 11, color: '#888', textAlign: 'right' }} className="dark:text-gray-400">
                67 findings
              </span>
            </div>

            {/* OWASP ZAP: 12 total — 6 medium (50%), 6 low (50%) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ width: 80, fontSize: 12, fontWeight: 600, color: '#333' }} className="dark:text-gray-200">
                OWASP ZAP
              </span>
              <div
                style={{
                  flex: 1,
                  height: 8,
                  background: '#f0f0ec',
                  borderRadius: 4,
                  display: 'flex',
                  overflow: 'hidden',
                }}
                className="dark:bg-[#2e2e2a]"
              >
                <div style={{ width: '50%', background: '#f59e0b' }} title="6 Medium" />
                <div style={{ width: '50%', background: '#3b82f6' }} title="6 Low" />
              </div>
              <span style={{ width: 60, fontSize: 11, color: '#888', textAlign: 'right' }} className="dark:text-gray-400">
                12 findings
              </span>
            </div>
          </div>

          {/* Severity Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 10, color: '#888', paddingTop: 4 }} className="dark:text-gray-400">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, background: '#ef4444', borderRadius: 1 }} />
              <span>Critical</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, background: '#f97316', borderRadius: 1 }} />
              <span>High</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, background: '#f59e0b', borderRadius: 1 }} />
              <span>Medium</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, background: '#3b82f6', borderRadius: 1 }} />
              <span>Low / Info</span>
            </div>
          </div>
        </div>
      </div>

      {/* ZONE 3 DIVIDER */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '24px 0 12px' }}>
        <div style={{ flex: 1, height: 1, background: '#e8e8e4' }} className="dark:bg-[#2e2e2a]" />
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#aaa',
            textTransform: 'uppercase',
            letterSpacing: '.06em',
          }}
        >
          Security Gate & Scanner Health
        </div>
        <div style={{ flex: 1, height: 1, background: '#e8e8e4' }} className="dark:bg-[#2e2e2a]" />
      </div>

      {/* CHANGE 6 — SECURITY GATE STATUS GRID */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e8e8e4',
          borderRadius: 12,
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
        className="dark:bg-[#242420] dark:border-[#2e2e2a] shadow-sm"
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'inherit' }}>
              Security Gate Status
            </div>
            <div style={{ fontSize: 11, color: '#888', marginTop: 2 }} className="dark:text-gray-400">
              CI/CD quality gates enforcement results across security pipeline
            </div>
          </div>

          <div
            style={{
              background: '#fef2f2',
              color: '#dc2626',
              fontSize: 10,
              fontWeight: 700,
              borderRadius: 10,
              padding: '3px 8px',
              border: '1px solid #fca5a5',
            }}
            className="dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/60"
          >
            1 gate failed
          </div>
        </div>

        {/* 3x3 Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {gates.map((g) => {
            const isFailed = g.status === 'failed';
            const isUnknown = g.status === 'unknown';

            return (
              <div
                key={g.name}
                style={{
                  border: isFailed
                    ? '1px solid #fca5a5'
                    : isUnknown
                    ? '1px dashed #d0d0cc'
                    : '1px solid #e8e8e4',
                  background: isFailed ? '#fef2f2' : '#ffffff',
                  borderRadius: 8,
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
                className={
                  isFailed
                    ? 'dark:bg-red-950/30 dark:border-red-900/60'
                    : isUnknown
                    ? 'dark:bg-[#242420] dark:border-zinc-700'
                    : 'dark:bg-[#242420] dark:border-[#2e2e2a]'
                }
              >
                {/* Icon Circle (24px) */}
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 800,
                    background: isFailed ? '#fee2e2' : isUnknown ? '#f5f5f2' : '#dcfce7',
                    color: isFailed ? '#dc2626' : isUnknown ? '#aaa' : '#15803d',
                  }}
                  className={
                    isFailed
                      ? 'dark:bg-red-950/40 dark:text-red-400'
                      : isUnknown
                      ? 'dark:bg-zinc-800 dark:text-gray-400'
                      : 'dark:bg-green-950/40 dark:text-green-400'
                  }
                >
                  {isFailed ? '✗' : isUnknown ? '?' : '✓'}
                </div>

                {/* Text Column */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: isFailed ? '#dc2626' : '#333',
                    }}
                    className={isFailed ? 'dark:text-red-400' : 'dark:text-gray-200'}
                  >
                    {g.name}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      color: isFailed ? '#dc2626' : isUnknown ? '#aaa' : '#888',
                    }}
                    className={isFailed ? 'dark:text-red-400' : 'dark:text-gray-400'}
                  >
                    {g.sub}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
