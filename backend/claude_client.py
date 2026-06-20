"""
AI analysis for SecureFlow.

For each vulnerability, we ask an LLM to explain it in plain English,
suggest a fix, and estimate a risk score (1-10).

Provider order:
  1. Gemini (cloud) - the primary provider, works anywhere with internet.
  2. Ollama (local) - optional fallback for on-prem/air-gapped deployments
     where a local model is actually running alongside this app.
     On a normal cloud deployment (like Cloud Run), there is no local
     Ollama instance, so this fallback is skipped automatically -
     see USE_OLLAMA_FALLBACK below.

If both fail, we return a clearly-labeled "unavailable" result instead
of pretending everything is fine with a fake risk_score of 0.
"""

import json
import os
import time

from google import genai

# Set this to "true" only in environments where Ollama is actually
# running locally (e.g. your own laptop or an on-prem server).
# On Cloud Run / cloud deployments, leave this false - there is no
# local model to fall back to there, and trying anyway just wastes time.
USE_OLLAMA_FALLBACK = os.getenv("USE_OLLAMA_FALLBACK", "false").lower() == "true"
OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "qwen2.5:7b"

GEMINI_MODEL = "gemini-2.5-flash"

_gemini_client = None


def get_gemini_client():
    """
    Builds the Gemini client only when it's actually needed, not at import
    time. This way, a missing/bad API key only affects AI analysis - it
    doesn't crash the entire backend on startup.
    """
    global _gemini_client
    if _gemini_client is None:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY is not set")
        _gemini_client = genai.Client(api_key=api_key)
    return _gemini_client


def build_prompt(vuln: dict) -> str:
    return f"""You are a security expert. Return only a JSON object with these exact keys:
explanation, fix, risk_score, urgency

CVE: {vuln.get('id')}
Package: {vuln.get('package')}
Severity: {vuln.get('severity')}
Fix version: {vuln.get('fix')}

risk_score must be an integer from 1 to 10.
Return only valid JSON, nothing else."""


def parse_json_response(raw: str) -> dict:
    """
    The model sometimes wraps its JSON in extra text or markdown fences.
    This pulls out just the {...} part and parses it safely.
    """
    try:
        start = raw.find('{')
        end = raw.rfind('}') + 1
        result = json.loads(raw[start:end])

        risk = result.get("risk_score", 5)
        if isinstance(risk, str):
            severity_to_score = {"LOW": 2, "MEDIUM": 5, "HIGH": 8, "CRITICAL": 10}
            result["risk_score"] = severity_to_score.get(risk.upper().split()[0], 5)
        elif isinstance(risk, float):
            result["risk_score"] = int(risk)

        return result
    except (json.JSONDecodeError, ValueError) as e:
        print(f"Could not parse AI response as JSON: {e}")
        return {
            "explanation": "AI response could not be parsed - showing raw scan data instead.",
            "fix": "Manual review recommended.",
            "risk_score": 5,
            "urgency": "Medium",
        }


def analyze_with_gemini(vuln: dict) -> dict:
    client = get_gemini_client()
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=build_prompt(vuln),
    )
    return parse_json_response(response.text)


def analyze_with_ollama(vuln: dict) -> dict:
    import requests  # only needed for this local-only path

    response = requests.post(
        OLLAMA_URL,
        json={"model": OLLAMA_MODEL, "prompt": build_prompt(vuln), "stream": False},
        timeout=180,
    )
    return parse_json_response(response.json().get("response", ""))


def unavailable_result(reason: str) -> dict:
    """
    Returned when no AI provider could analyze the vulnerability.
    Clearly labeled as unavailable, instead of silently looking like
    a real (but wrong) analysis with a risk_score of 0.
    """
    return {
        "explanation": f"AI analysis unavailable ({reason}).",
        "fix": "See FixedVersion in scan results for the recommended fix.",
        "risk_score": None,
        "urgency": "Unknown",
    }


def analyze_vulnerability(vuln: dict) -> dict:
    try:
        return analyze_with_gemini(vuln)
    except Exception as gemini_error:
        print(f"Gemini analysis failed for {vuln.get('id')}: {gemini_error}")

        if USE_OLLAMA_FALLBACK:
            try:
                return analyze_with_ollama(vuln)
            except Exception as ollama_error:
                print(f"Ollama fallback also failed for {vuln.get('id')}: {ollama_error}")
                return unavailable_result("both Gemini and local Ollama failed")

        return unavailable_result("Gemini failed, no local fallback configured")


def analyze_scan(vulnerabilities: list) -> list:
    """Analyzes up to 3 vulnerabilities per scan, to keep cost/time reasonable."""
    results = []
    for vuln in vulnerabilities[:3]:
        time.sleep(2)  # simple rate-limit spacing between API calls
        analysis = analyze_vulnerability(vuln)
        analysis["cve_id"] = vuln.get("id")
        analysis["package"] = vuln.get("package")
        results.append(analysis)
    return results