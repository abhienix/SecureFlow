import os
import time
import json
import google.generativeai as genai
import requests

# Ollama config
OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "qwen2.5:7b"

# Gemini config - new unified SDK
GEMINI_MODEL = "gemini-2.5-flash"
gemini_client = genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

def build_prompt(vuln: dict) -> str:
    return f"""You are a security expert. Return only a JSON object with these exact keys:
explanation, fix, risk_score, urgency
CVE: {vuln.get('id')}
Package: {vuln.get('package')}
Severity: {vuln.get('severity')}
Fix version: {vuln.get('fix')}
Return only valid JSON, nothing else."""

def parse_json_response(raw: str) -> dict:
    try:
        start = raw.find('{')
        end = raw.rfind('}') + 1
        result = json.loads(raw[start:end])
        # force risk_score to integer
        risk = result.get("risk_score", 0)
        if isinstance(risk, str):
            mapping = {"LOW": 2, "MEDIUM": 5, "HIGH": 8, "CRITICAL": 10}
            result["risk_score"] = mapping.get(risk.upper().split()[0], 3)
        elif isinstance(risk, float):
            result["risk_score"] = int(risk)
        return result
    except:
        return {"explanation": "Parsing error", "fix": "Manual review", "risk_score": 5, "urgency": "Low"}

def analyze_with_gemini(vuln: dict) -> dict:
    model = genai.GenerativeModel(GEMINI_MODEL)
    response = model.generate_content(build_prompt(vuln))
    return parse_json_response(response.text)

def analyze_with_ollama(vuln: dict) -> dict:
    response = requests.post(OLLAMA_URL, json={
        "model": OLLAMA_MODEL,
        "prompt": build_prompt(vuln),
        "stream": False
    }, timeout=180)
    return parse_json_response(response.json().get("response", ""))

def analyze_vulnerability(vuln: dict) -> dict:
    try:
        print(f"Trying Gemini for {vuln.get('id')}...")
        return analyze_with_gemini(vuln)
    except Exception as e:
        print(f"Gemini failed: {e}. Falling back to Ollama...")
        return analyze_with_ollama(vuln)

def analyze_scan(vulnerabilities: list) -> list:
    results = []
    for vuln in vulnerabilities[:3]:
        time.sleep(2)
        analysis = analyze_vulnerability(vuln)
        analysis["cve_id"] = vuln.get("id")
        analysis["package"] = vuln.get("package")
        results.append(analysis)
    return results