import requests
import json

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL = "qwen2.5:7b"

def analyze_vulnerability(vuln: dict) -> dict:
    prompt = f"""You are a security expert. Return only a JSON object with these exact keys:
explanation, fix, risk_score, urgency

CVE: {vuln.get('id')}
Package: {vuln.get('package')}
Severity: {vuln.get('severity')}
Fix version: {vuln.get('fix')}

Return only valid JSON, nothing else."""

    try:
        response = requests.post(OLLAMA_URL, json={
            "model": MODEL,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.1,
                "num_predict": 200
            }
        }, timeout=180)

        print(f"Ollama status: {response.status_code}")
        raw = response.json().get("response", "").strip()
        print(f"Ollama raw response: {raw[:100]}")

        if not raw:
            raise ValueError("empty response from Ollama")

        if "```" in raw:
            raw = raw.split("```")[1].split("```")[0]
            if raw.startswith("json"):
                raw = raw[4:]

        return json.loads(raw.strip())

    except Exception as e:
        print(f"AI analysis error: {e}")
        return {
            "explanation": f"{vuln.get('package')} has a {vuln.get('severity')} vulnerability — {vuln.get('description', '')}",
            "fix": f"Upgrade {vuln.get('package')} to version {vuln.get('fix')}",
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