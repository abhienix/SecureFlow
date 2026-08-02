import React, { useState } from 'react';
import { Sparkles, Copy, Check, Terminal, Code2, ShieldAlert, ArrowRight, Bot } from 'lucide-react';
import { PipelineRun } from '../types/pipeline.types';

interface AutomatedRemediationCardProps {
  type: 'zap' | 'policy' | 'codescan' | 'generic';
  run: PipelineRun;
  onAskVoid?: (prompt: string) => void;
}

export function AutomatedRemediationCard({ type, run, onAskVoid }: AutomatedRemediationCardProps) {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'code' | 'config' | 'cli'>('code');

  const steps = run.pipeline_steps || {};
  const gitleaks = run.gitleaks || run.findings?.gitleaks || [];
  const semgrepResults = run.semgrep?.results || run.findings?.semgrep || [];
  const zapFindings = run.zap_findings || run.findings?.zap || [];

  // Generate automated remediation snippets based on block type
  const getRemediationSnippets = () => {
    if (type === 'codescan' || gitleaks.length > 0 || semgrepResults.length > 0) {
      if (gitleaks.length > 0) {
        const ruleId = gitleaks[0]?.RuleID || gitleaks[0]?.rule || 'generic-api-key';
        const file = gitleaks[0]?.File || gitleaks[0]?.file || 'src/config/secrets.js';
        return {
          title: 'Secret Credential Hardcoding Fix',
          description: `Automatically remove hardcoded credential in \`${file}\` and load from secure environment variables:`,
          code: `// 1. In ${file}: Remove hardcoded string & load from environment\nconst API_SECRET = process.env.SECUREFLOW_API_SECRET || ""; // nosemgrep\nif (!API_SECRET) {\n  console.warn("⚠️ SECUREFLOW_API_SECRET missing from environment");\n}`,
          config: `# 2. In .gitleaksignore (If false-positive secret suppression is required):\n[allowlist]\ndescription = "Ignore approved mock development token"\nregexes = ['${ruleId}']\npaths = ['${file}']`,
          cli: `# 3. Rotate git commit history & push fix:\ngit commit --amend -m "fix(security): move hardcoded secret to process.env"\ngit push origin ${run.branch || 'main'} --force-with-lease`
        };
      } else {
        const checkId = semgrepResults[0]?.check_id || 'python.lang.security.insecure-use';
        const path = semgrepResults[0]?.path || 'backend/main.py';
        return {
          title: 'SAST Code Pattern Hardening',
          description: `Remediate insecure code pattern in \`${path}\` with inline nosemgrep annotation:`,
          code: `# In ${path}:\n# nosemgrep: ${checkId}\nsafe_payload = sanitize_input(user_input, max_len=1000)\nresult = execute_secure_query(safe_payload)`,
          config: `# In .semgrepignore (Exclude test and build files from scanning):\nnode_modules/\nvenv/\n*.test.js\nscratch/`,
          cli: `# Re-verify code scan locally before commit:\nnpx semgrep scan --config "p/security-audit" .`
        };
      }
    }

    if (type === 'zap' || zapFindings.length > 0) {
      return {
        title: 'DAST Security Headers & Anti-CSRF Remediation',
        description: 'Configure required security response headers on your web server to pass OWASP ZAP DAST checks:',
        code: `# FastAPI / Python Security Headers Middleware\n@app.middleware("http")\nasync def add_security_headers(request, call_next):\n    response = await call_next(request)\n    response.headers["X-Content-Type-Options"] = "nosniff"\n    response.headers["X-Frame-Options"] = "DENY"\n    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"\n    response.headers["Content-Security-Policy"] = "default-src 'self'"\n    return response`,
        config: `# Express.js / Node.js Helmet Middleware:\nimport helmet from 'helmet';\napp.use(helmet({\n  contentSecurityPolicy: true,\n  referrerPolicy: { policy: "strict-origin-when-cross-origin" }\n}));`,
        cli: `# Test DAST endpoints locally using OWASP ZAP CLI:\npython -m zapv2 --target "https://staging.secureflow.app"`
      };
    }

    if (type === 'policy') {
      return {
        title: 'Policy Gate Threshold & Container Base Hardening',
        description: 'Upgrade base Docker image to eliminate Critical CVEs and update policy threshold in `policy.yaml`:',
        code: `# Dockerfile Base Image Upgrade (Eliminates OS CVEs):\n# Old: FROM node:18-alpine\nFROM node:20-alpine3.20\n\n# Ensure rootless execution\nUSER node`,
        config: `# policy.yaml Override Rule (If temporary exemption required):\npolicies:\n  - name: "Temporary CVE Exemption"\n    scanner: "trivy"\n    severity_threshold: "CRITICAL"\n    action: "warn"\n    expires_at: "2026-08-31"`,
        cli: `# Re-scan container image locally:\ntrivy image --severity CRITICAL,HIGH secureflow-app:latest`
      };
    }

    return {
      title: 'Automated DevSecOps Remediation',
      description: 'Standard security remediation patch to resolve pipeline blockage:',
      code: `# Automated Security Patch\nexport SECUREFLOW_ENFORCE_STRICT=true\npython -m backend.security_audit --fix`,
      config: `# policy.yaml config update\nenforcement_mode: "strict"`,
      cli: `git commit -am "fix(security): resolve policy gate findings"\ngit push origin ${run.branch || 'main'}`
    };
  };

  const remediation = getRemediationSnippets();
  const currentSnippet = activeTab === 'code' ? remediation.code : activeTab === 'config' ? remediation.config : remediation.cli;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTriggerVoid = () => {
    const prompt = `Provide an automated remediation fix for pipeline run #${run.id} (${type.toUpperCase()} block). Explain line-by-line how to patch the code and unblock production.`;
    if (onAskVoid) {
      onAskVoid(prompt);
    }
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)',
      border: '1px solid rgba(99, 102, 241, 0.3)',
      borderRadius: '12px',
      padding: '16px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>
      {/* Header Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '8px',
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 10px rgba(99, 102, 241, 0.4)'
          }}>
            <Sparkles size={16} color="#ffffff" />
          </div>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#A78BFA', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              Automated Remediation Suggestion
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#F1F5F9' }}>
              {remediation.title}
            </div>
          </div>
        </div>

        <span style={{
          fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '12px',
          background: 'rgba(16, 185, 129, 0.15)', color: '#34D399', border: '1px solid rgba(16, 185, 129, 0.3)'
        }}>
          Auto Fix Available
        </span>
      </div>

      <div style={{ fontSize: '12px', color: '#94A3B8', lineHeight: '1.5' }}>
        {remediation.description}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px solid rgba(148, 163, 184, 0.1)', paddingBottom: '8px' }}>
        <button
          onClick={() => setActiveTab('code')}
          style={{
            padding: '4px 10px', borderRadius: '6px', border: 'none', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
            background: activeTab === 'code' ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
            color: activeTab === 'code' ? '#818CF8' : '#94A3B8',
            display: 'flex', alignItems: 'center', gap: '4px'
          }}
        >
          <Code2 size={12} /> Code Patch
        </button>
        <button
          onClick={() => setActiveTab('config')}
          style={{
            padding: '4px 10px', borderRadius: '6px', border: 'none', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
            background: activeTab === 'config' ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
            color: activeTab === 'config' ? '#818CF8' : '#94A3B8',
            display: 'flex', alignItems: 'center', gap: '4px'
          }}
        >
          <ShieldAlert size={12} /> Policy / Config
        </button>
        <button
          onClick={() => setActiveTab('cli')}
          style={{
            padding: '4px 10px', borderRadius: '6px', border: 'none', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
            background: activeTab === 'cli' ? 'rgba(99, 102, 241, 0.25)' : 'transparent',
            color: activeTab === 'cli' ? '#818CF8' : '#94A3B8',
            display: 'flex', alignItems: 'center', gap: '4px'
          }}
        >
          <Terminal size={12} /> Git / CLI Command
        </button>
      </div>

      {/* Code Box */}
      <div style={{ position: 'relative' }}>
        <pre style={{
          backgroundColor: '#090D16',
          border: '1px solid rgba(51, 65, 85, 0.8)',
          borderRadius: '8px',
          padding: '12px',
          fontSize: '11px',
          fontFamily: 'var(--sf-font-mono)',
          color: '#38BDF8',
          overflowX: 'auto',
          margin: 0,
          lineHeight: '1.5'
        }}>
          <code>{currentSnippet}</code>
        </pre>

        <button
          onClick={handleCopy}
          style={{
            position: 'absolute', top: '8px', right: '8px',
            padding: '4px 8px', borderRadius: '4px',
            background: copied ? 'rgba(16, 185, 129, 0.2)' : 'rgba(30, 41, 59, 0.8)',
            border: `1px solid ${copied ? '#10B981' : '#475569'}`,
            color: copied ? '#34D399' : '#CBD5E1',
            fontSize: '10px', fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '4px',
            transition: 'all 150ms ease'
          }}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied!' : 'Copy Fix'}
        </button>
      </div>

      {/* Action Footer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
        <button
          onClick={handleTriggerVoid}
          style={{
            flex: 1,
            padding: '9px 12px',
            background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            fontWeight: 700,
            fontSize: '11px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 180ms ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(99, 102, 241, 0.5)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.3)';
            e.currentTarget.style.transform = 'none';
          }}
        >
          <Bot size={14} />
          Auto-Remediate with Void AI
        </button>
      </div>
    </div>
  );
}
