# SecureFlow

A DevSecOps pipeline I built to automatically scan Docker images for vulnerabilities on every push, make a policy-based decision to allow or block the deploy, and surface everything in a live dashboard — including AI-powered analysis of what each vulnerability actually means and how to fix it.

**Live dashboard → [secureflow-frontend-1083585992526.us-central1.run.app](https://secureflow-frontend-1083585992526.us-central1.run.app)**

---

## Why I built this

I wanted to understand what "shifting security left" actually looks like in practice — not just the concept, but the wiring. How do you catch a critical CVE before it reaches production? How do you make that decision automatically, consistently, and in a way that doesn't just block everything and annoy developers?

SecureFlow is my answer to that. It's not a toy — it's running on Google Cloud Run, it scans real images, and it makes real decisions.

---

## How it works

Every push to `main` triggers two separate pipelines:

**Code scan (runs on every push)**
Gitleaks checks for accidentally committed secrets. Semgrep checks for insecure code patterns. If either fails, the pipeline blocks and the dashboard records it. If everything's clean, it records that too — so a README update shows up as "CLEAN · ALLOW", not as a false alarm.

**Image scan (runs only when backend or Docker files change)**
The backend image gets built and pushed to Google Artifact Registry. Trivy scans it for CVEs across all severity levels. The results go to a policy engine that checks each vulnerability against rules defined in `policy.yaml` — block on CRITICAL/HIGH, warn on MEDIUM, skip anything that's been explicitly allowlisted with a reason and expiry date. If the policy says ALLOW, the image deploys to Cloud Run. If it says BLOCK, the pipeline stops.

After the policy decision, Gemini analyzes the top vulnerabilities and generates a plain-English explanation and fix suggestion for each one. If Gemini's quota is exhausted or unavailable, the system says so clearly instead of silently showing wrong data.

---

## What's actually interesting about it

**The policy engine is the core.** It's not just "block on CRITICAL" — it's per-repo rules, CVSS score thresholds, and a time-limited allowlist for vulnerabilities where no upstream fix exists yet. For example, `perl-base` has two CRITICALs with no fix available, so they're allowlisted with an expiry date and a written reason. When the expiry passes, they stop being ignored automatically.

**Failures are honest.** I spent a lot of time making sure the system doesn't silently lie. If AI analysis fails, it says "AI analysis unavailable (Gemini failed, no local fallback configured)" — not `0/10`. If a scan finds nothing wrong, it shows "CLEAN" — not "unknown". This came from debugging a lot of silent failures where the dashboard looked fine but was actually showing wrong data everywhere.

**The hybrid AI design.** I built it with Gemini as the primary provider and Ollama (local LLM) as a fallback for air-gapped or on-prem deployments. On Cloud Run there's no local model running, so the fallback is skipped and the system is transparent about that. The architecture supports both deployment models — cloud and on-prem — without changing the code, just an environment variable.

---

## Stack

| Layer | What I used |
|---|---|
| CI/CD | GitHub Actions |
| Container scanning | Trivy |
| Secret scanning | Gitleaks |
| Code analysis | Semgrep |
| Backend | FastAPI + PostgreSQL |
| AI analysis | Gemini 2.5 Flash (Ollama fallback for on-prem) |
| Cloud | Google Cloud Run + Artifact Registry |
| Frontend | React |
| Metrics | Prometheus + FastAPI Instrumentator |

---

## Running it locally

```bash
git clone https://github.com/abhienix/SecureFlow
cd SecureFlow

# Set up environment
cp .env.example .env
# Add your GEMINI_API_KEY and DATABASE_URL

# Start backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

# Start frontend
cd frontend
npm install
npm start
```

For local AI analysis without Gemini, install Ollama, pull `qwen2.5:7b`, and set `USE_OLLAMA_FALLBACK=true` in your `.env`.

---

## Policy configuration

Rules live in `policy.yaml` at the repo root. You can configure per-repo behavior:

```yaml
repos:
  SecureFlow:
    block_on: [CRITICAL]
    warn_on: [HIGH, MEDIUM]
    cvss_threshold: 7.0
    allowlist:
      - cve: CVE-2026-42496
        expires: 2026-09-01
        reason: "perl-base, no upstream fix available"
```

The default policy applies to any repo not explicitly listed.

---

## Things I learned building this

Getting the policy engine to fail loudly instead of quietly took longer than I expected. Early versions would swallow exceptions and return `risk_score: 0`, which looked like working AI analysis but was actually nothing. The fix was boring but important: surface every failure explicitly, return clearly labeled unavailable states, and never let a default value masquerade as real data.

The hybrid Ollama/Gemini architecture also taught me something real about deployment environments — a local LLM fallback only makes sense when you control the machine. On Cloud Run, "localhost" is the container itself, so Ollama calls would silently fail. The solution wasn't a clever workaround, it was being honest about what each deployment model supports.

---

Built by Abhimanyu Kumar · [github.com/abhienix/SecureFlow](https://github.com/abhienix/SecureFlow)
