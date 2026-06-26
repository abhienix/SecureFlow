# SecureFlow

**AI-powered DevSecOps platform that automatically scans code and container images, enforces security policies, and blocks insecure deployments before production.**

**Live Dashboard:** https://secureflow-frontend-1083585992526.us-central1.run.app/

---

## Overview

SecureFlow integrates security directly into the CI/CD pipeline by combining secret detection, static code analysis, container vulnerability scanning, policy-based enforcement, and AI-driven remediation guidance.

Instead of simply reporting vulnerabilities, SecureFlow makes automated deployment decisions through a custom policy engine that determines whether a build should be **BLOCKED** or **ALLOWED**.

---

## Pipeline Flow

```text
GitHub Push
     │
     ▼
GitHub Actions
     │
     ├── Gitleaks (Secret Detection)
     ├── Semgrep (Static Security Analysis)
     │
     └── Docker Build
             │
             ▼
        Trivy Scan
             │
             ▼
       Policy Engine
       (BLOCK / ALLOW)
             │
             ▼
      AI Analysis Layer
   (Groq → Gemini → Ollama)
             │
             ▼
      Cloud Run Deployment
             │
             ▼
      Real-Time Dashboard
```

---

## Key Features

### Policy-Based Security Enforcement

* Custom policy engine using `policy.yaml`
* Severity and CVSS-based decision making
* Repository-specific security rules
* Expiring CVE allowlists to prevent permanent exceptions
* Fail-safe deployment logic

### AI-Powered Vulnerability Analysis

* Multi-provider fallback architecture
* Groq → Gemini → Ollama provider chain
* Plain-English vulnerability explanations
* Remediation recommendations
* Risk scoring and impact assessment

### Real-Time Security Visibility

* Live WebSocket updates
* Pipeline execution timeline
* Vulnerability tracking dashboard
* Deployment status monitoring
* Security health metrics

---

## Technical Highlights

* Designed a fail-safe deployment model where any response other than explicit **ALLOW** results in **BLOCK**
* Implemented provider fallback architecture to maintain AI availability during service outages
* Built repository-specific policy management with automatic allowlist expiration
* Integrated Prometheus metrics and Grafana monitoring for pipeline observability
* Developed real-time frontend updates using WebSockets instead of polling

---

## Tech Stack

| Layer      | Technologies                        |
| ---------- | ----------------------------------- |
| CI/CD      | GitHub Actions                      |
| Security   | Gitleaks, Semgrep, Trivy            |
| Backend    | FastAPI, PostgreSQL, SQLAlchemy     |
| Frontend   | React, Recharts, WebSockets         |
| AI         | Groq, Gemini, Ollama                |
| Cloud      | Google Cloud Run, Artifact Registry |
| Monitoring | Prometheus, Grafana                 |

---

## Impact

* Automated security validation on every commit
* Prevents vulnerable deployments from reaching production
* Reduces manual security review effort
* Provides developers with actionable remediation guidance
* Delivers real-time visibility into the entire security pipeline

---

*Built by Abhimanyu Kumar · [github.com/abhienix](https://github.com/abhienix)*
