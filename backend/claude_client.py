import requests
import json
import os

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL = "qwen2.5:7b"

def analyze_vulnerability(vuln: dict) -> dict:
    prompt = f"""You are a security expert. Analyze this vulnerability and respond in this exact JSON format with no extra text:

{{
  "explanation": "plain english explanation of what this vulnerability is",
  "fix": "exact command or code change to fix this",
  "risk_score": 8,
  "urgency": "Immediate"
}}

Vulnerability:
- CVE ID: {vuln.get('id', 'unknown')}
- Package: {vuln.get('package', 'unknown')}
- Severity: {vuln.get('severity', 'unknown')}
- CVSS Score: {vuln.get('score', 0)}
- Fix version: {vuln.get('fix', 'unknown')}
- Description: {vuln.get('description', 'no description')}

Respond with only the JSON object, no markdown, no extra text."""

    try:
        response = requests.post(OLLAMA_URL, json={
            "model": MODEL,
            "prompt": prompt,
            "stream": False
        }, timeout=120)

        raw = response.json().get("response", "").strip()

        if "```json" in raw:
            raw = raw.split("```json")[1].split("```")[0].strip()
        elif "```" in raw:
            raw = raw.split("```")[1].split("```")[0].strip()

        return json.loads(raw)

    except Exception as e:
        print(f"AI analysis error: {e}")
        return {
            "explanation": f"Vulnerability in {vuln.get('package')} — {vuln.get('description', '')[:200]}",
            "fix": f"Upgrade to version {vuln.get('fix', 'check vendor advisory')}",
            "risk_score": 8,
            "urgency": "High"
        }

def analyze_scan(vulnerabilities: list) -> list:
    results = []
    for vuln in vulnerabilities[:3]:
        print(f"analyzing {vuln.get('id')} with Ollama...")
        analysis = analyze_vulnerability(vuln)
        analysis["cve_id"] = vuln.get("id")
        analysis["package"] = vuln.get("package")
        results.append(analysis)
    return results