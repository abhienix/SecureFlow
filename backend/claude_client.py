import os
import json
import requests
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL = "llama3-70b-8192"


def _call_groq(prompt: str) -> str:
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.4,
        "max_tokens": 1024,
    }
    resp = requests.post(GROQ_API_URL, headers=headers, json=payload, timeout=30)
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"].strip()


def analyze_scan(vulnerabilities: list) -> list:
    if not vulnerabilities:
        return []

    top = vulnerabilities[:8]
    vuln_lines = "\n".join(
        f"- {v.get('id','?')} | {v.get('package','?')} | Severity: {v.get('severity','?')} | CVSS: {v.get('score','?')} | Fix: {v.get('fix','none')} | {v.get('description','')[:120]}"
        for v in top
    )

    prompt = f"""You are a senior DevSecOps engineer reviewing a Docker image CVE scan for a production deployment.

Vulnerabilities found:
{vuln_lines}

Write a detailed security assessment. Respond with this exact JSON (no markdown, no extra text):
{{
  "explanation": "Write 4-5 sentences. Name the most critical CVEs specifically. Explain what they allow an attacker to do. Mention which packages are affected. State the real-world risk to this production service.",
  "fix": "Write 4-5 actionable steps. Include specific package versions to upgrade to. Mention if base image should be updated. Include any config hardening steps. Be specific and technical.",
  "risk_score": <integer 1-10 based on highest CVSS and exploitability>
}}"""

    try:
        raw = _call_groq(prompt)
        raw = raw.strip().lstrip("`json").lstrip("`").rstrip("`").strip()
        result = json.loads(raw)
        return [result]
    except Exception as e:
        print(f"analyze_scan error: {e}")
        return [{
            "explanation": "AI analysis unavailable — review vulnerabilities manually.",
            "fix": "Check Trivy output and upgrade affected packages.",
            "risk_score": 5,
        }]


def analyze_code_scan_failure(failure_info: dict) -> dict:
    prompt = f"""You are a senior DevSecOps engineer. A code scan blocked a production deployment.

Scanner: {failure_info.get('scanner', 'unknown')}
Reason: {failure_info.get('reason', 'unknown')}
Detail: {failure_info.get('detail', 'unknown')}

Write a detailed security assessment. Respond with this exact JSON (no markdown, no extra text):
{{
  "explanation": "Write 4-5 sentences. Explain exactly what was detected and why it is dangerous. Describe what an attacker could do with this. Explain why this blocked the deployment. State the compliance/security impact.",
  "fix": "Write 4-5 specific remediation steps. Include how to rotate any exposed credentials. Include how to prevent this in future. Be specific and technical.",
  "risk_score": <integer 1-10>
}}"""

    try:
        raw = _call_groq(prompt)
        raw = raw.strip().lstrip("`json").lstrip("`").rstrip("`").strip()
        return json.loads(raw)
    except Exception as e:
        print(f"analyze_code_scan_failure error: {e}")
        return {
            "explanation": "AI analysis unavailable — review code scan output manually.",
            "fix": "Check Gitleaks/Semgrep output and fix flagged issues.",
            "risk_score": 7,
        }
