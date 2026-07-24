import React, { useState, useEffect } from 'react';
import { Shield, ShieldAlert, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import { BACKEND } from '../../contexts/AppContext';
import PolicySandbox from '../shared/PolicySandbox';

export default function PoliciesPage({ C }) {
  const [loading, setLoading] = useState(true);
  const [policyData, setPolicyData] = useState(null);

  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        const res = await fetch(`${BACKEND}/api/policies`);
        const data = await res.json();
        setPolicyData(data);
      } catch (err) {
        console.error('Failed to fetch policies', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPolicies();
  }, []);

  const cardStyle = {
    background: C.bgCard,
    border: `1px solid ${C.border}`,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20
  };

  if (loading) {
    return (
      <div style={{ padding: 30, color: C.inkMid }}>
        Loading policies...
      </div>
    );
  }

  const rules = policyData?.rules || [];
  const rawPolicy = policyData ? JSON.stringify(policyData, null, 2) : '{}';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: 30, height: '100%', overflowY: 'auto' }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: C.ink, margin: '0 0 4px 0' }}>Policy Management Center</h1>
        <div style={{ fontSize: 13, color: C.inkLow }}>Manage security policies, enforcement rules, and test changes in the sandbox.</div>
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <ShieldAlert size={18} color={C.accent} />
          <div style={{ fontSize: 16, fontWeight: 700, color: C.ink }}>Active Rules</div>
        </div>
        
        {rules.length === 0 ? (
          <div style={{ color: C.inkMid, fontSize: 13, padding: 20, textAlign: 'center', background: C.bg, borderRadius: 8 }}>
            No rules configured in the current policy.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}`, color: C.inkLow }}>
                <th style={{ padding: '12px 8px', fontWeight: 600 }}>Rule Name</th>
                <th style={{ padding: '12px 8px', fontWeight: 600 }}>Severity</th>
                <th style={{ padding: '12px 8px', fontWeight: 600 }}>Action</th>
                <th style={{ padding: '12px 8px', fontWeight: 600 }}>Scanner</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: '12px 8px', color: C.ink }}>{r.name || 'Unnamed Rule'}</td>
                  <td style={{ padding: '12px 8px', color: r.severity === 'CRITICAL' ? '#ef4444' : C.inkMid }}>
                    {r.severity}
                  </td>
                  <td style={{ padding: '12px 8px', color: r.action === 'BLOCK' ? '#ef4444' : '#f59e0b', fontWeight: 600 }}>
                    {r.action}
                  </td>
                  <td style={{ padding: '12px 8px', color: C.inkMid }}>{r.scanner || 'Any'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <FileText size={18} color={C.accent} />
            <div style={{ fontSize: 16, fontWeight: 700, color: C.ink }}>Raw Policy (policy.yaml)</div>
          </div>
          <pre style={{ margin: 0, padding: 12, background: '#1e1e1e', color: '#d4d4d4', borderRadius: 8, fontSize: 12, overflowX: 'auto' }}>
            <code>{rawPolicy}</code>
          </pre>
        </div>

        <div style={cardStyle}>
          <PolicySandbox C={C} />
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Shield size={18} color={C.accent} />
          <div style={{ fontSize: 16, fontWeight: 700, color: C.ink }}>Policy Enforcement History</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ background: C.bg, padding: 16, borderRadius: 8, border: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#ef4444', marginBottom: 8 }}>
              <AlertTriangle size={16} />
              <span style={{ fontWeight: 600, fontSize: 13 }}>Blocked Deployments</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: C.ink }}>12</div>
          </div>
          <div style={{ background: C.bg, padding: 16, borderRadius: 8, border: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#10b981', marginBottom: 8 }}>
              <CheckCircle size={16} />
              <span style={{ fontWeight: 600, fontSize: 13 }}>Allowed Deployments</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: C.ink }}>148</div>
          </div>
        </div>
      </div>
    </div>
  );
}
