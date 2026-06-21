"""
AI analysis for SecureFlow.

When a scan finds vulnerabilities, I want to do more than just show a CVE ID
and a severity label. I want to explain what it actually means in plain English,
suggest how to fix it, and give a risk score so the dashboard tells a real story.

I tried a few AI providers and ended up with this fallback chain:

  1. Groq   — this is the main one. It's fast, free, and runs Llama 3 on
               their custom hardware. Most API calls land here.

  2. Gemini — if Groq's quota runs out or it's having a bad day, we fall
               back to Gemini. Same prompt, same output format, just a
               different provider under the hood.

  3. Ollama — for anyone running this on-prem or in an air-gapped environment
               where nothing can leave the network. You run a local Llama model
               via Ollama and set USE_OLLAMA_FALLBACK=true. On Cloud Run this
               does nothing — there's no local model running there.

If all three fail, the dashboard gets an honest "unavailable" message instead
of a fake 0/10 risk score that makes it look like everything is fine.

One thing I learned the hard way: don't import or initialize API clients at
module load time. If the key is missing or wrong, the entire backend crashes
on startup. Instead, build the client only when it's actually needed — that
way a missing Groq key only breaks AI analysis, not the whole app.
"""

import json
import os
import time

from google import genai

# only set this to true if you're running Ollama locally alongside the app.
# on Cloud Run this should always be false — there's no local model there.
USE_OLLAMA_FALLBACK = os.getenv("USE_OLLAMA_FALLBACK", "false").lower() == "true"
OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "qwen2.5:7b"

GROQ_MODEL = "llama-3.3-70b-versatile"
GEMINI_MODEL = "gemini-2.5-flash"

# these get built the first time they're needed, not at import time
_groq_client = None
_gemini_client = None


def get_groq_client():
    global _groq_client
    if _groq_client is None:
        from groq import Groq
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY is not set")
        _groq_client = Groq(api_key=api_key)
    return _groq_client


def get_gemini_client():
    global _gemini_client
    if _gemini_client is None:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY is not set")
        _gemini_client = genai.Client(api_key=api_key)
    return _gemini_client


def build_prompt(vuln: dict) -> str:
    # prompt for image scan CVEs — needs to explain the CVE, why this package
    # has it, and whether a fix exists. bullet points only, no essays.
    return f"""You are a security expert. Analyze this CVE and return only a JSON object with these exact keys: explanation, fix, risk_score, urgency

CVE: {vuln.get('id')}
Package: {vuln.get('package')}
Severity: {vuln.get('severity')}
Fix version: {vuln.get('fix')}
Description: {vuln.get('description')}

Rules:
- explanation: 3-4 bullet points starting with •. Cover: what this CVE is, why this package has it (OS layer/base image/dependency), whether a fix exists and why not if unavailable.
- fix: 1-2 bullet points with exact action. If no fix available write: "• No fix available — switch to python:3.11-slim base image to reduce attack surface"
- risk_score: integer 1-10
- urgency: one of Critical / High / Medium / Low

Return only valid JSON, nothing else."""


def build_code_scan_prompt(reason: str) -> str:
    # prompt for code scan failures — Gitleaks or Semgrep blocked the pipeline.
    # we don't have line-level findings here, just the block reason, so we ask
    # the AI to explain the class of issue and what a developer should do next.
    return f"""You are a security expert. A CI/CD code scan was blocked. Return only a JSON object with these exact keys: explanation, fix, risk_score, urgency

Block reason: {reason}

Rules:
- explanation: 3-4 bullet points starting with •. Cover: what type of issue was detected, why it is a security risk, what could happen if exploited.
- fix: 2-3 bullet points with exact steps a developer should take to resolve this.
- risk_score: integer 1-10
- urgency: one of Critical / High / Medium / Low

Return only valid JSON, nothing else."""


def parse_json_response(raw: str) -> dict:
    # models sometimes wrap the JSON in markdown fences like ```json ... ```
    # or add a sentence before it. we just find the first { and last } and
    # parse whatever is between them.
    try:
        start = raw.find('{')
        end = raw.rfind('}') + 1
        result = json.loads(raw[start:end])

        # some models return risk_score as a string like "HIGH" or a float.
        # normalize it to an integer so the dashboard always gets a number.
        risk = result.get("risk_score", 5)
        if isinstance(risk, str):
            severity_to_score = {"LOW": 2, "MEDIUM": 5, "HIGH": 8, "CRITICAL": 10}
            result["risk_score"] = severity_to_score.get(risk.upper().split()[0], 5)
        elif isinstance(risk, float):
            result["risk_score"] = int(risk)

        return result
    except (json.JSONDecodeError, ValueError) as e:
        print(f"could not parse AI response as JSON: {e}")
        return {
            "explanation": "AI response could not be parsed - showing raw scan data instead.",
            "fix": "Manual review recommended.",
            "risk_score": 5,
            "urgency": "Medium",
        }


def analyze_with_groq(vuln: dict) -> dict:
    client = get_groq_client()
    response = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[{"role": "user", "content": build_prompt(vuln)}],
        temperature=0.3,
    )
    return parse_json_response(response.choices[0].message.content)


def analyze_with_gemini(vuln: dict) -> dict:
    client = get_gemini_client()
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=build_prompt(vuln),
    )
    return parse_json_response(response.text)


def analyze_with_ollama(vuln: dict) -> dict:
    # importing requests here instead of at the top because this function
    # only runs in local/on-prem deployments — no point importing it otherwise
    import requests
    response = requests.post(
        OLLAMA_URL,
        json={
            "model": OLLAMA_MODEL,
            "prompt": build_prompt(vuln),
            "stream": False
        },
        timeout=180,
    )
    return parse_json_response(response.json().get("response", ""))


def unavailable_result(reason: str) -> dict:
    # this is what the dashboard gets when no provider worked.
    # explicit and honest — never a fake score that looks like real data.
    return {
        "explanation": f"AI analysis unavailable ({reason}).",
        "fix": "See FixedVersion in scan results for the recommended fix.",
        "risk_score": None,
        "urgency": "Unknown",
    }


def analyze_vulnerability(vuln: dict) -> dict:
    # try Groq first — it's the fastest and has the most generous free quota
    try:
        result = analyze_with_groq(vuln)
        print(f"Groq analyzed {vuln.get('id')} successfully")
        return result
    except Exception as e:
        print(f"Groq failed for {vuln.get('id')}: {e}")

    # Groq is down or quota hit — try Gemini
    try:
        result = analyze_with_gemini(vuln)
        print(f"Gemini analyzed {vuln.get('id')} successfully")
        return result
    except Exception as e:
        print(f"Gemini failed for {vuln.get('id')}: {e}")

    # both cloud providers failed — try local Ollama if it's configured
    if USE_OLLAMA_FALLBACK:
        try:
            result = analyze_with_ollama(vuln)
            print(f"Ollama analyzed {vuln.get('id')} successfully")
            return result
        except Exception as e:
            print(f"Ollama also failed for {vuln.get('id')}: {e}")
            return unavailable_result("Groq, Gemini and local Ollama all failed")

    return unavailable_result("Groq and Gemini both failed, no local fallback configured")


def analyze_code_scan(reason: str) -> dict:
    # called when Gitleaks or Semgrep blocks the pipeline — gives the dashboard
    # a real AI explanation instead of just showing "skipped" in the AI section.
    # only Groq here, no fallback chain needed for this simpler prompt.
    try:
        client = get_groq_client()
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": build_code_scan_prompt(reason)}],
            temperature=0.3,
        )
        print(f"Groq analyzed code scan failure successfully")
        return parse_json_response(response.choices[0].message.content)
    except Exception as e:
        print(f"Code scan AI analysis failed: {e}")
        return unavailable_result(str(e))


def analyze_scan(vulnerabilities: list) -> list:
    # only analyze the top 3 by CVSS score — the most critical ones.
    # no point sending 124 vulnerabilities to an AI when 121 of them
    # are low-severity OS packages with no fix available.
    top_vulns = sorted(
        vulnerabilities,
        key=lambda v: v.get("score") or 0,
        reverse=True
    )[:3]

    results = []
    for vuln in top_vulns:
        time.sleep(1)  # small gap between calls to avoid rate limits
        analysis = analyze_vulnerability(vuln)
        analysis["cve_id"] = vuln.get("id")
        analysis["package"] = vuln.get("package")
        results.append(analysis)
    return results