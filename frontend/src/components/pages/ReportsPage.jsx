import React, { useState } from 'react';
import { Download, FileText, CheckCircle, Clock } from 'lucide-react';
import { BACKEND } from '../../contexts/AppContext';

export default function ReportsPage({ C }) {
  const [reportType, setReportType] = useState('Executive');
  const [format, setFormat] = useState('JSON');
  const [loading, setLoading] = useState(false);
  const [reportResult, setReportResult] = useState(null);

  const cardStyle = {
    background: C.bgCard,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    padding: 20
  };

  const reportTypes = ['Executive', 'Developer', 'Compliance', 'Security'];
  const formats = ['JSON', 'CSV', 'PDF'];

  const handleGenerate = async () => {
    setLoading(true);
    setReportResult(null);
    try {
      const res = await fetch(`${BACKEND}/api/reports/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_type: reportType, format: format })
      });
      
      if (format === 'JSON') {
        const data = await res.json();
        setReportResult(JSON.stringify(data, null, 2));
      } else if (format === 'CSV' || format === 'PDF') {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report_${Date.now()}.${format.toLowerCase()}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        setReportResult(`File downloaded as report_${Date.now()}.${format.toLowerCase()}`);
      }
    } catch (err) {
      console.error('Error generating report', err);
      setReportResult('Error generating report.');
    } finally {
      setLoading(false);
    }
  };

  const mockHistory = [
    { id: 1, time: '2023-10-15 14:30', type: 'Security', format: 'PDF', status: 'Completed' },
    { id: 2, time: '2023-10-14 09:15', type: 'Executive', format: 'JSON', status: 'Completed' },
    { id: 3, time: '2023-10-10 11:00', type: 'Compliance', format: 'CSV', status: 'Completed' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: 30, height: '100%', overflowY: 'auto' }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: C.ink, margin: '0 0 4px 0' }}>Enterprise Reporting Center</h1>
        <div style={{ fontSize: 13, color: C.inkLow }}>Generate and export security posture reports for stakeholders.</div>
      </div>

      <div style={cardStyle}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.inkMid, marginBottom: 12 }}>1. Select Report Type</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
          {reportTypes.map((type) => (
            <div
              key={type}
              onClick={() => setReportType(type)}
              style={{
                padding: '16px',
                borderRadius: 8,
                border: `1px solid ${reportType === type ? C.accent : C.border}`,
                background: reportType === type ? `${C.accent}15` : C.bg,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: reportType === type ? C.accent : C.ink
              }}
            >
              <FileText size={18} />
              <span style={{ fontSize: 13, fontWeight: 600 }}>{type}</span>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 13, fontWeight: 700, color: C.inkMid, marginBottom: 12 }}>2. Select Format</div>
        <div style={{ display: 'flex', gap: 14, marginBottom: 24 }}>
          {formats.map((fmt) => (
            <div
              key={fmt}
              onClick={() => setFormat(fmt)}
              style={{
                padding: '10px 20px',
                borderRadius: 20,
                border: `1px solid ${format === fmt ? C.accent : C.border}`,
                background: format === fmt ? C.accent : C.bg,
                color: format === fmt ? '#fff' : C.ink,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600
              }}
            >
              {fmt}
            </div>
          ))}
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading}
          style={{
            background: C.accent,
            color: '#fff',
            border: 'none',
            padding: '12px 24px',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            opacity: loading ? 0.7 : 1
          }}
        >
          <Download size={18} />
          {loading ? 'Generating...' : 'Generate Report'}
        </button>

        {reportResult && (
          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.inkMid, marginBottom: 8 }}>Result</div>
            {format === 'JSON' ? (
              <pre style={{ margin: 0, padding: 16, background: '#1e1e1e', color: '#d4d4d4', borderRadius: 8, fontSize: 12, overflowX: 'auto' }}>
                <code>{reportResult}</code>
              </pre>
            ) : (
              <div style={{ padding: 16, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.ink, fontSize: 13 }}>
                {reportResult}
              </div>
            )}
          </div>
        )}
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Clock size={18} color={C.accent} />
          <div style={{ fontSize: 16, fontWeight: 700, color: C.ink }}>Report History</div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}`, color: C.inkLow }}>
              <th style={{ padding: '12px 8px', fontWeight: 600 }}>Timestamp</th>
              <th style={{ padding: '12px 8px', fontWeight: 600 }}>Type</th>
              <th style={{ padding: '12px 8px', fontWeight: 600 }}>Format</th>
              <th style={{ padding: '12px 8px', fontWeight: 600 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {mockHistory.map((row) => (
              <tr key={row.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: '12px 8px', color: C.inkMid }}>{row.time}</td>
                <td style={{ padding: '12px 8px', color: C.ink }}>{row.type}</td>
                <td style={{ padding: '12px 8px', color: C.inkMid }}>{row.format}</td>
                <td style={{ padding: '12px 8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#10b981' }}>
                    <CheckCircle size={14} />
                    <span style={{ fontWeight: 600 }}>{row.status}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
