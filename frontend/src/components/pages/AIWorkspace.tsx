import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Send, Bot, Code2, Sparkles } from 'lucide-react';
import { Card } from '../ui/Card';
import { Skeleton } from '../ui/Skeleton';
import { useScans } from '../../hooks/useApi';
import { api } from '../../lib/api';
import type { ScanResult } from '../../types';

interface Message {
  role: 'assistant' | 'user';
  text: string;
}

const QUICK_PROMPTS = [
  'List critical vulnerabilities in this repo',
  'How to fix Gitleaks hardcoded secret?',
  'Explain policy gate decision for this commit',
  'Provide Dockerfile hardening code patch',
  'Summarize OWASP ZAP DAST alert findings',
];

export default function AIWorkspace() {
  const { data: rawScans, isLoading } = useScans();
  const scans = useMemo(() => rawScans || [], [rawScans]);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', text: "Hello! I am Void — SecureFlow's Autonomous DevSecOps Core AI. I have complete RAG context over your pipeline runs, policy.yaml rules, Gitleaks secrets, Semgrep SAST findings, Trivy container CVEs, and OWASP ZAP DAST probes." },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [focusScanId, setFocusScanId] = useState<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const activeScan: ScanResult | undefined = useMemo(() => {
    return scans.find((s) => s.id === focusScanId) || scans[0];
  }, [scans, focusScanId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (q?: string) => {
    const question = q || input.trim();
    if (!question || sending) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: question }]);
    setSending(true);
    try {
      const data = await api.getCopilotAnswer(question, focusScanId || undefined);
      setMessages((prev) => [...prev, { role: 'assistant', text: data?.answer || 'Analysis complete.' }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', text: 'Unable to reach Void AI API.' }]);
    } finally {
      setSending(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: 'calc(100vh - 120px)' }}>
        <Skeleton width={400} height={32} />
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr', gap: 16, flex: 1 }}>
          <Skeleton height="100%" /><Skeleton height="100%" /><Skeleton height="100%" />
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16, height: 'calc(100vh - 120px)' }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--sf-ink)', margin: '0 0 4px 0' }}>Void Security Core AI Workspace</h1>
        <p style={{ fontSize: 13, color: 'var(--sf-ink-low)' }}>Contextual RAG AI Security Engine analyzing live pipeline telemetry, scanner findings, and code patches</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr', gap: 16, flex: 1, minHeight: 0 }}>
        {/* Left: Chat */}
        <Card style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--sf-border)', paddingBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--sf-accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={16} color="var(--sf-accent)" />
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--sf-ink)', margin: 0 }}>Void AI Conversation</h3>
            </div>
            <span style={{ fontSize: 11, color: 'var(--sf-green)', fontWeight: 700 }}>RAG Active</span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 4 }}>
            {messages.map((m, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 10, justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                {m.role === 'assistant' && <Bot size={20} color="var(--sf-accent)" style={{ flexShrink: 0, marginTop: 2 }} />}
                <div style={{ padding: '10px 14px', borderRadius: 8, fontSize: 13, lineHeight: 1.5, background: m.role === 'user' ? 'var(--sf-accent)' : 'var(--sf-bg-surface)', color: m.role === 'user' ? '#fff' : 'var(--sf-ink)', border: m.role === 'assistant' ? '1px solid var(--sf-border)' : 'none', maxWidth: '85%' }}>
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4 }}>
            {QUICK_PROMPTS.map((qp, idx) => (
              <button key={idx} onClick={() => handleSend(qp)} style={{ fontSize: 10, padding: '4px 8px', borderRadius: 12, background: 'var(--sf-accent-soft)', border: '1px solid var(--sf-accent-border)', color: 'var(--sf-accent)', cursor: 'pointer', whiteSpace: 'nowrap' }}>{qp}</button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Ask AI about vulnerabilities, fixes, or policy rules..." style={{ flex: 1, padding: '8px 12px', background: 'var(--sf-bg)', border: '1px solid var(--sf-border)', borderRadius: 6, color: 'var(--sf-ink)', fontSize: 13, outline: 'none' }} />
            <button onClick={() => handleSend()} style={{ padding: '8px 14px', borderRadius: 6, border: 'none', background: 'var(--sf-accent)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Send size={14} />
            </button>
          </div>
        </Card>

        {/* Middle: Remedy */}
        <Card style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--sf-border)', paddingBottom: 10 }}>
            <Code2 size={18} color="var(--sf-green)" />
            <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--sf-ink)' }}>Code Fix & Remedy Diff</h3>
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--sf-ink-low)', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Select Context Scan Run</label>
            <select value={focusScanId || ''} onChange={(e) => setFocusScanId(Number(e.target.value))} style={{ width: '100%', padding: 6, background: 'var(--sf-bg)', border: '1px solid var(--sf-border)', color: 'var(--sf-ink)', borderRadius: 6, fontSize: 12 }}>
              {scans.map((s) => (
                <option key={s.id} value={s.id}>#{s.id} · {s.repo_name} ({(s.commit_sha || '').substring(0, 8)}) · {s.action_taken}</option>
              ))}
            </select>
          </div>
          {activeScan?.ai_fix ? (
            <div style={{ background: 'var(--sf-bg-surface)', padding: 12, borderRadius: 8, border: '1px solid var(--sf-border)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--sf-green)', textTransform: 'uppercase', marginBottom: 8 }}>AI Recommended Patch</div>
              <pre style={{ fontSize: 12, color: 'var(--sf-ink)', margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'var(--sf-font-mono)' }}>{activeScan.ai_fix}</pre>
            </div>
          ) : (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--sf-ink-low)', fontSize: 13 }}>No AI fix available for this scan.</div>
          )}
          {activeScan?.ai_explanation && (
            <div style={{ background: 'var(--sf-bg-surface)', padding: 12, borderRadius: 8, border: '1px solid var(--sf-border)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--sf-accent)', textTransform: 'uppercase', marginBottom: 8 }}>AI Explanation</div>
              <div style={{ fontSize: 13, color: 'var(--sf-ink)', lineHeight: 1.5 }}>{activeScan.ai_explanation}</div>
            </div>
          )}
        </Card>

        {/* Right: RAG Context */}
        <Card style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ borderBottom: '1px solid var(--sf-border)', paddingBottom: 10 }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--sf-ink)' }}>RAG Context & Telemetry</h3>
          </div>
          <div style={{ background: 'var(--sf-bg-surface)', padding: 12, borderRadius: 6, fontSize: 12, color: 'var(--sf-ink-low)', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div><strong>Repository:</strong> {activeScan?.repo_name || 'abhienix/SecureFlow'}</div>
            <div><strong>Commit SHA:</strong> {(activeScan?.commit_sha || '7ddbbe8f').substring(0, 8)}</div>
            <div><strong>Policy Decision:</strong> {activeScan?.action_taken || 'ALLOW'}</div>
            <div><strong>DAST Status:</strong> {activeScan?.dast_status || 'completed'}</div>
          </div>
          <div style={{ background: 'var(--sf-accent-soft)', border: '1px solid var(--sf-accent-border)', padding: 12, borderRadius: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--sf-accent)', textTransform: 'uppercase' }}>Active Scanners Vectorized</span>
            <div style={{ fontSize: 12, color: 'var(--sf-ink-mid)', marginTop: 6 }}>
              • Gitleaks Secrets Engine<br />• Semgrep SAST Ruleset<br />• Trivy Container CVE Database<br />• OWASP ZAP DAST Probe
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
