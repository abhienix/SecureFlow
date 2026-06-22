import os
import json
import requests
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL = "llama3-8b-8192"


def _call_groq(prompt: str) -> str:
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.3,
        "max_tokens": 512,
    }
    resp = requests.post(GROQ_API_URL, headers=headers, json=payload, timeout=30)
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"].strip()


def analyze_scan(vulnerabilities: list) -> list:
    if not vulnerabilities:
        return []

    vuln_summary = json.dumps(vulnerabilities[:5], indent=2)
    prompt = f"""You are a security expert. Analyze these CVE vulnerabilities found in a Docker image and respond with JSON only.

Vulnerabilities:
{vuln_summary}

Respond with this exact JSON structure (no markdown, no extra text):
{{
  "explanation": "2-3 sentence plain-English explanation of the risk",
  "fix": "specific actionable remediation steps",
  "risk_score": <integer 1-10>
}}"""

    try:
        raw = _call_groq(prompt)
        raw = raw.strip().lstrip("`json").lstrip("`").rstrip("`").strip()
        result = json.loads(raw)
        return [result]
    except Exception as e:
        print(f"analyze_scan error: {e}")
        return [{
            "explanation": "AI analysis unavailable.",
            "fix": "Review vulnerabilities manually.",
            "risk_score": 5,
        }]


def analyze_code_scan_failure(failure_info: dict) -> dict:
    prompt = f"""You are a security expert. A code scan failed with the following details:

Scanner: {failure_info.get('scanner', 'unknown')}
Reason: {failure_info.get('reason', 'unknown')}
Detail: {failure_info.get('detail', 'unknown')}

Respond with this exact JSON structure (no markdown, no extra text):
{{
  "explanation": "2-3 sentence plain-English explanation of why this is a security risk",
  "fix": "specific steps to fix the issue",
  "risk_score": <integer 1-10>
}}"""

    try:
        raw = _call_groq(prompt)
        raw = raw.strip().lstrip("`json").lstrip("`").rstrip("`").strip()
        return json.loads(raw)
    except Exception as e:
        print(f"analyze_code_scan_failure error: {e}")
        return {
            "explanation": "AI analysis unavailable.",
            "fix": "Review the code scan output manually.",
            "risk_score": 7,
        }
