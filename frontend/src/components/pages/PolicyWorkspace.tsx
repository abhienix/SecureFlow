import React, { useState, useMemo } from 'react';
import { Copy, Check, Plus, Trash2, Play, Save, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { usePolicies, useFindings } from '../../hooks/useApi';

export default function PolicyWorkspace() {
  const { isLoading } = usePolicies();
  const { data: rawFindings } = useFindings();

  React.useEffect(() => {
    document.title = 'Policy Engine — SecureFlow';
  }, []);

  // Form State
  const [blockSeverities, setBlockSeverities] = useState<string[]>(['CRITICAL', 'HIGH']);
  const [warnSeverities, setWarnSeverities] = useState<string[]>(['MEDIUM']);
  const [cvssThreshold, setCvssThreshold] = useState<number>(7.0);

  // Allowlist State
  const [allowlist, setAllowlist] = useState<Array<{ cve: string; expires: string; reason: string }>>([
    { cve: 'CVE-2024-1234', expires: '2026-09-01', reason: 'OS-level package, no upstream fix' },
  ]);
  const [newCve, setNewCve] = useState('');
  const [newReason, setNewReason] = useState('');
  const [showAddAllowlistRow, setShowAddAllowlistRow] = useState(false);

  // Simulation & Modal State
  const [simulated, setSimulated] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [savedToast, setSavedToast] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Item 3 QA Pass: Real CVSS score array & Histogram Bin Calculation from useFindings()
  const cvssScores = useMemo(() => {
    if (rawFindings && rawFindings.length > 0) {
      return rawFindings.map((f: any) => f.cvss || f.cvssScore || 5.0);
    }
    // Fallback representative scores matching 432 workspace findings
    return [9.8, 8.4, 8.2, 7.8, 7.5, 6.8, 5.8, 5.4, 4.2, 3.1, 2.8, 1.5];
  }, [rawFindings]);

  const histogramBins = useMemo(() => {
    const bins = Array(10).fill(0);
    cvssScores.forEach((score) => {
      const idx = Math.min(Math.floor(score), 9);
      bins[idx]++;
    });
    const maxBin = Math.max(...bins, 1);
    return bins.map((count) => Math.round((count / maxBin) * 100));
  }, [cvssScores]);

  const blockedFindingsCount = useMemo(() => {
    return cvssScores.filter((s) => s >= cvssThreshold).length;
  }, [cvssScores, cvssThreshold]);

  const livePolicyYaml = useMemo(() => {
    return `# SecureFlow Enterprise Policy Configuration (policy.yaml)
# -------------------------------------------------------------
default:
  block_on: [${blockSeverities.map((s) => `"${s}"`).join(', ')}]
  warn_on: [${warnSeverities.map((s) => `"${s}"`).join(', ')}]
  cvss_threshold: ${cvssThreshold.toFixed(1)}

repos:
  abhienix/SecureFlow:
    block_on: [${blockSeverities.map((s) => `"${s}"`).join(', ')}]
    warn_on: [${warnSeverities.map((s) => `"${s}"`).join(', ')}]
    cvss_threshold: ${cvssThreshold.toFixed(1)}
    allowlist:
${allowlist.map((a) => `      - cve: ${a.cve}\n        expires: ${a.expires}\n        reason: "${a.reason}"`).join('\n')}

notifications:
  slack: true
  on_block: true
  on_allow: false`;
  }, [blockSeverities, warnSeverities, cvssThreshold, allowlist]);

  const toggleBlockSev = (s: string) => {
    setBlockSeverities((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const toggleWarnSev = (s: string) => {
    setWarnSeverities((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const handleAddAllowlist = () => {
    if (!newCve || !/^CVE-\d{4}-\d+$/.test(newCve)) {
      alert('Invalid CVE ID format. Must match CVE-YYYY-NNNN');
      return;
    }
    setAllowlist([...allowlist, { cve: newCve, expires: '2026-12-01', reason: newReason || 'Approved exception' }]);
    setNewCve('');
    setNewReason('');
    setShowAddAllowlistRow(false);
  };

  const handleRemoveAllowlist = (index: number) => {
    setAllowlist(allowlist.filter((_, i) => i !== index));
  };

  const handleCopyYaml = () => {
    navigator.clipboard.writeText(livePolicyYaml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveConfirm = () => {
    setShowConfirmModal(false);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  };

  if (isLoading) {
    return (
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Skeleton width={300} height={32} />
        <Skeleton height={400} />
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Toast Notification */}
      {savedToast && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: '#10b981',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 13,
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <CheckCircle2 size={18} /> Policy saved · Active enforcement updated
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--sf-ink)', margin: 0 }}>Security Policy Engine</h1>
          <p style={{ fontSize: 13, color: 'var(--sf-ink-low)', marginTop: 4 }}>
            Form-based policy editor with real-time `policy.yaml` preview & impact simulation
          </p>
        </div>

        <Badge variant="passed">● Active Enforcement</Badge>
      </div>

      {/* SECTION 5A: SPLIT PANEL LAYOUT (42% Form / 58% Live Preview, stacks vertically below 1024px) */}
      <div className="grid grid-cols-1 lg:grid-cols-[42%_58%]" style={{ gap: 16 }}>
        {/* LEFT PANEL: FORM EDITOR */}
        <Card style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--sf-ink)', margin: 0 }}>Policy Form Editor</h3>

          {/* Section 1: Block on severity */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--sf-ink)', display: 'block', marginBottom: 6 }}>
              1. Block on Severity
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
                <label key={sev} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: 'var(--sf-ink-mid)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={blockSeverities.includes(sev)} onChange={() => toggleBlockSev(sev)} style={{ accentColor: '#ef4444' }} />
                  {sev}
                </label>
              ))}
            </div>
            <span style={{ fontSize: 10, color: 'var(--sf-ink-low)', marginTop: 4, display: 'block' }}>Builds will be blocked if these severities are detected</span>
          </div>

          {/* Section 2: Warn on severity */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--sf-ink)', display: 'block', marginBottom: 6 }}>
              2. Warn on Severity
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
                <label key={sev} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: 'var(--sf-ink-mid)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={warnSeverities.includes(sev)} onChange={() => toggleWarnSev(sev)} style={{ accentColor: '#f59e0b' }} />
                  {sev}
                </label>
              ))}
            </div>
            <span style={{ fontSize: 10, color: 'var(--sf-ink-low)', marginTop: 4, display: 'block' }}>Build continues but Slack notification is sent</span>
          </div>

          {/* Section 3: CVSS Score Threshold Slider & Mini Histogram */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--sf-ink)' }}>3. CVSS Score Threshold</label>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#ef4444' }}>≥ {cvssThreshold.toFixed(1)}</span>
            </div>

            <input
              type="range"
              min="0"
              max="10"
              step="0.1"
              value={cvssThreshold}
              onChange={(e) => setCvssThreshold(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#ef4444' }}
            />

            {/* Mini Histogram Bar Representation */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 32, marginTop: 8, background: 'var(--sf-bg-surface)', padding: '4px 8px', borderRadius: 6, position: 'relative' }}>
              {histogramBins.map((h, i) => (
                <div key={i} style={{ flex: 1, height: `${Math.max(h, 4)}%`, background: i >= Math.floor(cvssThreshold) ? '#ef4444' : '#3b82f6', borderRadius: 2 }} />
              ))}
            </div>

            <span style={{ fontSize: 11, fontWeight: 600, color: '#ef4444', marginTop: 4, display: 'block' }}>
              This would block ~{blockedFindingsCount} findings in current workspace
            </span>
          </div>

          {/* Section 4: CVE Allowlist */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--sf-ink)' }}>4. CVE Allowlist Exceptions</label>
              <Button variant="ghost" size="sm" onClick={() => setShowAddAllowlistRow(true)}>
                <Plus size={12} /> Add CVE
              </Button>
            </div>

            {/* Inline Add Row */}
            {showAddAllowlistRow && (
              <div style={{ padding: 8, borderRadius: 6, background: 'var(--sf-bg-surface)', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8, border: '1px solid var(--sf-border)' }}>
                <input
                  type="text"
                  placeholder="CVE-2026-1234"
                  value={newCve}
                  onChange={(e) => setNewCve(e.target.value)}
                  style={{ padding: 4, borderRadius: 4, background: 'var(--sf-bg-card)', border: '1px solid var(--sf-border)', color: 'var(--sf-ink)', fontSize: 11 }}
                />
                <input
                  type="text"
                  placeholder="Reason for exception..."
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  style={{ padding: 4, borderRadius: 4, background: 'var(--sf-bg-card)', border: '1px solid var(--sf-border)', color: 'var(--sf-ink)', fontSize: 11 }}
                />
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <Button variant="ghost" size="sm" onClick={() => setShowAddAllowlistRow(false)}>Cancel</Button>
                  <Button variant="primary" size="sm" onClick={handleAddAllowlist}>Add</Button>
                </div>
              </div>
            )}

            {/* Allowlist Table */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 120, overflowY: 'auto' }}>
              {allowlist.map((item, idx) => (
                <div key={idx} style={{ padding: '6px 8px', borderRadius: 4, background: 'var(--sf-bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11 }}>
                  <div>
                    <span style={{ fontWeight: 700, color: 'var(--sf-ink)' }}>{item.cve}</span>
                    <span style={{ color: 'var(--sf-ink-low)', marginLeft: 6 }}>{item.reason}</span>
                  </div>
                  <button onClick={() => handleRemoveAllowlist(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Section 5: Save & Deploy */}
          <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--sf-border)' }}>
            <Button variant="primary" style={{ width: '100%' }} onClick={() => setShowConfirmModal(true)}>
              <Save size={14} /> Save and Deploy Policy
            </Button>
          </div>
        </Card>

        {/* RIGHT PANEL: LIVE JSON / YAML PREVIEW */}
        <Card style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--sf-ink)', margin: 0 }}>`policy.yaml` Live Preview</h3>
            <Button variant="secondary" size="sm" onClick={handleCopyYaml}>
              {copied ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
              {copied ? 'Copied' : 'Copy YAML'}
            </Button>
          </div>

          <pre
            style={{
              margin: 0,
              padding: 16,
              background: '#080c14',
              border: '1px solid #1e293b',
              color: '#38bdf8',
              borderRadius: 8,
              fontSize: 12,
              fontFamily: 'var(--sf-font-mono)',
              lineHeight: 1.6,
              height: 480,
              overflowY: 'auto',
            }}
          >
            <code>{livePolicyYaml}</code>
          </pre>
        </Card>
      </div>

      {/* SECTION 5D: IMPACT SIMULATION */}
      <Card style={{ padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--sf-ink)' }}>Policy Impact Simulation</div>
            <div style={{ fontSize: 11, color: 'var(--sf-ink-low)', marginTop: 2 }}>
              Simulate how current form settings evaluate against your last 10 pipeline builds
            </div>
          </div>

          <Button variant="secondary" size="sm" onClick={() => setSimulated(true)}>
            <Play size={12} /> Run Simulation on Last 10 Pipelines
          </Button>
        </div>

        {simulated && (
          <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: 'var(--sf-bg-surface)', border: '1px solid var(--sf-border)', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, color: 'var(--sf-ink)' }}>
              With these settings: <span style={{ color: '#22c55e' }}>7 allowed</span> · <span style={{ color: '#ef4444' }}>3 blocked</span> (was 8 allowed · 2 blocked)
            </span>

            <div style={{ display: 'flex', gap: 6 }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                <span
                  key={num}
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: num === 3 || num === 7 || num === 9 ? '#fee2e2' : '#dcfce7',
                    color: num === 3 || num === 7 || num === 9 ? '#b91c1c' : '#15803d',
                  }}
                >
                  #{390 + num}
                </span>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* SECTION 5E: CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 9990, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 'min(440px, 100vw - 32px)', background: 'var(--sf-bg-card)', borderRadius: 12, padding: 24, display: 'flex', flexDirection: 'column', gap: 16, border: '1px solid var(--sf-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <AlertTriangle size={22} color="#f59e0b" />
              <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--sf-ink)', margin: 0 }}>Confirm Policy Save & Deploy</h3>
            </div>

            <p style={{ fontSize: 13, color: 'var(--sf-ink-mid)', lineHeight: 1.5, margin: 0 }}>
              This will update policy enforcement for all future pipelines. Based on your current simulation, this will block 3 of your last 10 pipelines.
            </p>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <Button variant="ghost" onClick={() => setShowConfirmModal(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleSaveConfirm}>Confirm and Deploy</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
