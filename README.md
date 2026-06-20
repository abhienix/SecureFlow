# SecureFlow

An AI-powered security gate for CI/CD pipelines. SecureFlow scans Docker images for vulnerabilities on every push, decides whether the build is safe to deploy based on policy rules you control, and uses an LLM to explain what each vulnerability actually means in plain English.

**Live dashboard:** https://secureflow-frontend-1083585992526.us-central1.run.app

---

## What it actually does

Most CI/CD security scanners just produce a long list of CVEs and leave you to figure out what matters. SecureFlow tries to close that gap in two ways:

1. **A policy engine that makes a real ALLOW/BLOCK decision**, not just a report. You define per-repo rules (which severities block a deploy, a CVSS threshold, an allowlist for known issues with no fix yet), and the pipeline actually stops before deploying if the policy says block.
2. **An AI layer that explains vulnerabilities in context.** Instead of just "CVE-2026-XXXX, HIGH, no fix available," SecureFlow asks an LLM to explain the practical risk and suggest next steps, so the output is useful to someone who isn't a CVE specialist.

## How a scan actually flows through the system

```
git push
   |
   v
Pre-build checks (Gitleaks for secrets, Semgrep for code issues)
   |
   v
Build the Docker image, push it to Artifact Registry
   |
   v
Trivy scans that exact pushed image
   |
   v
Scan results are sent to the backend
   |
   v
Policy engine evaluates the findings against policy.yaml -> ALLOW or BLOCK
   |
   v
If ALLOW: deploy that same image to Cloud Run
If BLOCK: pipeline stops here, nothing deploys
```

The detail that matters most here: the image that gets scanned is the exact same image that gets deployed. Earlier versions of this pipeline built two separate images for the build and the deploy step, which meant the thing being scanned and the thing going live weren't actually the same artifact. That's fixed now — one build, one scan, one deploy.

## The policy engine

Rules live in `policy.yaml`, scoped per repository, with a fallback default:

```yaml
default:
  block_on: [CRITICAL, HIGH]
  warn_on: [MEDIUM]
  cvss_threshold: 7.0

repos:
  SecureFlow:
    block_on: [CRITICAL]
    warn_on: [HIGH, MEDIUM]
    cvss_threshold: 10.0
    allowlist:
      - cve: CVE-2026-XXXXX
        expires: 2026-09-01
        reason: "no fix available yet, OS-level package, monitoring"
```

A vulnerability blocks the deploy if its severity is in `block_on`, or its CVSS score meets `cvss_threshold` — unless it's been explicitly allowlisted with a documented reason and an expiry date. Expired allowlist entries go back to being treated normally, so an old exception can't be silently forgotten forever.

## The AI layer

For each scan, SecureFlow sends the top vulnerabilities to Gemini and asks for a plain-English explanation, a suggested fix, and a 1-10 risk score. If the AI call fails for any reason (bad key, quota, network), the dashboard shows the analysis as clearly unavailable rather than a misleading default score — the security decision itself never depends on whether the AI call succeeded, only the policy engine does.

The AI client is built to support a local-model fallback (via Ollama) for on-prem or air-gapped deployments where a cloud API isn't an option. On the current cloud deployment, there's no local model available, so it runs cloud-only — the fallback path exists in the code but is intentionally inactive here.

## Tech stack

- **Backend:** FastAPI, SQLAlchemy, PostgreSQL
- **Frontend:** React, served via Nginx
- **Scanning:** Trivy (image CVEs), Gitleaks (secrets), Semgrep (static analysis)
- **AI:** Google Gemini (`google-genai`)
- **Infra:** Docker, GitHub Actions, Google Cloud Run, Artifact Registry
- **Monitoring:** Prometheus, Grafana

## Running it locally

```bash
git clone https://github.com/abhienix/SecureFlow.git
cd SecureFlow

# backend
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt

# set required env vars (see .env.example)
# DATABASE_URL, GEMINI_API_KEY

uvicorn main:app --reload
```

```bash
# frontend
cd frontend
npm install
npm start
```

Supporting services (Postgres, Prometheus, Grafana) can be started with:

```bash
docker-compose up
```

## What I'd build next

- Real OS-base-image patching cadence, rather than relying on allowlist expiry dates as the only mitigation for unfixable OS-level CVEs
- A second cloud AI provider as a fallback instead of relying solely on Gemini, since the local-model fallback only applies to on-prem deployments
- Tightened CORS and IAM scoping for production use beyond this portfolio deployment