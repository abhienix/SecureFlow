/**
 * SecureFlow — Extensible Dynamic Scanners Registry
 * 
 * Future-ready scanner metadata system. New scanners registered here
 * automatically populate filters, badges, cards, and analytics across
 * the entire frontend without requiring UI refactoring.
 */

export const SCANNERS_REGISTRY = {
  gitleaks: {
    id: "gitleaks",
    name: "Gitleaks",
    category: "Secrets",
    description: "Detects hardcoded secrets, API keys, and credentials in commit history.",
    color: "#EC4899",
    bgColor: "rgba(236,72,153,0.12)",
    icon: "Key",
    version: "v8.24.3",
    status: "Active"
  },
  semgrep: {
    id: "semgrep",
    name: "Semgrep",
    category: "SAST",
    description: "Static Application Security Testing for OWASP Top 10 and code flaws.",
    color: "#8B5CF6",
    bgColor: "rgba(139,92,246,0.12)",
    icon: "Code2",
    version: "v1.72.0",
    status: "Active"
  },
  trivy: {
    id: "trivy",
    name: "Trivy",
    category: "Container",
    description: "Container image vulnerability scanner & OS package CVE analyzer.",
    color: "#3B82F6",
    bgColor: "rgba(59,130,246,0.12)",
    icon: "Box",
    version: "v0.51.0",
    status: "Active"
  },
  zap: {
    id: "zap",
    name: "OWASP ZAP",
    category: "DAST",
    description: "Dynamic Application Security Testing against active Cloud Run deployments.",
    color: "#F59E0B",
    bgColor: "rgba(245,158,11,0.12)",
    icon: "Globe",
    version: "v2.14.0",
    status: "Active"
  },
  nuclei: {
    id: "nuclei",
    name: "Nuclei (Extensible)",
    category: "DAST+",
    description: "Fast template-based vulnerability scanner for custom attack vectors.",
    color: "#10B981",
    bgColor: "rgba(16,185,129,0.12)",
    icon: "Zap",
    version: "v3.2.0",
    status: "Configured"
  },
  checkov: {
    id: "checkov",
    name: "Checkov / IaC",
    category: "Infrastructure",
    description: "Infrastructure as Code static analysis for Terraform & Dockerfile security.",
    color: "#06B6D4",
    bgColor: "rgba(6,182,212,0.12)",
    icon: "FileCode",
    version: "v3.2.0",
    status: "Configured"
  }
};

export const getScannerMeta = (scannerId) => {
  if (!scannerId) return SCANNERS_REGISTRY.trivy;
  const key = String(scannerId).toLowerCase();
  return SCANNERS_REGISTRY[key] || {
    id: key,
    name: key.toUpperCase(),
    category: "Security",
    color: "#6366F1",
    bgColor: "rgba(99,102,241,0.12)",
    icon: "ShieldAlert",
    version: "v1.0",
    status: "Active"
  };
};
