import os
import json
import re
import requests
from dotenv import load_dotenv

load_dotenv()

# API keys and config - set these in your .env file
# We try providers in order: Groq (fastest) -> Gemini (backup) -> Ollama (local fallback)
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")  # only works if Ollama is running locally

# Model selection - using the best available free-tier models
GROQ_MODEL = "llama-3.3-70b-versatile"   # Groq's fastest + smartest free model as of 2025
GEMINI_MODEL = "gemini-1.5-flash"         # Google's fast free model, good fallback
OLLAMA_MODEL = "qwen2.5:7b"               # Local model - needs Ollama running on your machine


# -- Provider: Groq -------------------------------------------------------------
def _call_groq(prompt):
    resp = requests.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "model": GROQ_MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.4,
            "max_tokens": 1024,
        },
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"].strip()


# -- Provider: Gemini -----------------------------------------------------------
def _call_gemini(prompt):
    resp = requests.post(
        f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}",
        json={"contents": [{"parts": [{"text": prompt}]}]},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()


# -- Provider: Ollama (local) ---------------------------------------------------
def _call_ollama(prompt):
    resp = requests.post(
        f"{OLLAMA_URL}/api/generate",
        json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False},
        timeout=60,
    )
    resp.raise_for_status()
    return resp.json()["response"].strip()


# -- AI Router -----------------------------------------------------------------
def _call_ai(prompt):
    if GROQ_API_KEY:
        try:
            result = _call_groq(prompt)
            print("AI provider: Groq (primary) - success")
            return result
        except Exception as e:
            print(f"Groq failed (trying Gemini next): {e}")
    else:
        print("Groq skipped - no API key found in environment")

    if GEMINI_API_KEY:
        try:
            result = _call_gemini(prompt)
            print("AI provider: Gemini (secondary fallback) - success")
            return result
        except Exception as e:
            print(f"Gemini also failed (trying local Ollama next): {e}")
    else:
        print("Gemini skipped - no GEMINI_API_KEY found in environment")

    try:
        result = _call_ollama(prompt)
        print("AI provider: Ollama (local fallback) - success")
        return result
    except Exception as e:
        print(f"Ollama also failed (connection refused is expected in Cloud Run): {e}")

    raise Exception("All AI providers failed: Groq, Gemini, and Ollama all unavailable")


# -- String sanitizer -----------------------------------------------------------
# Strips non-ASCII and control characters from any string value before it goes
# into a prompt. Keeps printable ASCII only - safe for JSON and LLM prompts.
def _sanitize(value, max_len=None):
    s = str(value)
    # Remove all control characters except tab (\x09), newline (\x0a), carriage return (\x0d)
    s = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', s)
    # Strip non-ASCII entirely
    s = s.encode('ascii', 'ignore').decode('ascii')
    if max_len:
        s = s[:max_len]
    return s.strip()


# -- JSON parser ----------------------------------------------------------------
# LLMs sometimes wrap their JSON in markdown code fences like ```json ... ```
# This strips those out before parsing so json.loads doesn't choke.
# We also strip any stray control characters from the raw response itself.
def _parse_json(raw):
    raw = raw.strip()

    # Strip markdown code fences if present
    if raw.startswith("```json"):
        raw = raw[7:]
    elif raw.startswith("```"):
        raw = raw[3:]
    raw = raw.rstrip("`").strip()

    # Remove control characters that break json.loads
    # Keep only \t (0x09), \n (0x0a), \r (0x0d) - everything else in 0x00-0x1f is invalid in JSON strings
    raw = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', raw)

    # Groq sometimes puts literal newlines inside string values - replace with space
    import re as _re
    raw = _re.sub(r"\n", " ", raw)
    return json.loads(raw)


# -- Main analysis: Docker image CVE scan --------------------------------------
# Called after Trivy scans the Docker image.
# Takes the list of vulnerabilities extracted from Trivy output.
# Returns a list with one analysis dict: {explanation, fix, risk_score}
def analyze_scan(vulnerabilities):
    if not vulnerabilities:
        return []

    # Only send the top 8 CVEs to avoid hitting token limits
    top = vulnerabilities[:8]

    # Sanitize every field before embedding in the prompt -
    # raw Trivy output can contain non-ASCII chars or control codes that break JSON parsing
    vuln_lines = "\n".join(
        "- {id} | {pkg} | Severity: {sev} | CVSS: {score} | Fix: {fix} | {desc}".format(
            id=_sanitize(v.get('id', '?')),
            pkg=_sanitize(v.get('package', '?')),
            sev=_sanitize(v.get('severity', '?')),
            score=_sanitize(v.get('score', '?')),
            fix=_sanitize(v.get('fix', 'none')),
            desc=_sanitize(v.get('description', ''), max_len=120),
        )
        for v in top
    )

    prompt = f"""You are a senior DevSecOps engineer reviewing a Docker image CVE scan for a production Cloud Run deployment.

Vulnerabilities found in the image:
{vuln_lines}

Write a detailed, human-readable security assessment. Be specific - name the CVEs, explain what they actually do, and give real actionable steps.

Respond with this exact JSON only. No markdown, no code fences, no extra text:
{{
  "explanation": "Write exactly 4-5 sentences. Name the most critical CVE IDs specifically. Explain what an attacker could actually do if they exploited these. Name the affected packages. State the real-world impact on this production service.",
  "fix": "Write exactly 4-5 numbered steps. Include the exact package versions to upgrade to. Say whether the base Docker image needs to be updated. Include any runtime hardening steps. Be specific and technical - no vague advice.",
  "risk_score": <an integer from 1 to 10 based on the highest CVSS score and real exploitability>
}}"""

    try:
        raw = _call_ai(prompt)
        result = _parse_json(raw)
        return [result]
    except Exception as e:
        print(f"analyze_scan completely failed after all providers: {e}")
        return [{
            "explanation": "AI analysis unavailable - all providers (Groq, Gemini, Ollama) failed. Please review the Trivy scan output manually to assess the vulnerabilities.",
            "fix": "Manually review the Trivy results and upgrade all affected packages to their latest patched versions.",
            "risk_score": 5,
        }]


# -- Code scan failure analysis -------------------------------------------------
# Called when Gitleaks or Semgrep blocks the pipeline.
# Takes details about what was found and explains the risk in plain English.
def analyze_code_scan_failure(failure_info):
    prompt = f"""You are a senior DevSecOps engineer. The CI/CD pipeline was just blocked because a code security scan failed.

What the scanner found:
- Scanner: {_sanitize(failure_info.get('scanner', 'unknown'))}
- Reason for block: {_sanitize(failure_info.get('reason', 'unknown'))}
- Specific detail: {_sanitize(failure_info.get('detail', 'unknown'), max_len=300)}

Write a detailed, human-readable security assessment. Explain this clearly to a developer who needs to understand why their deployment was blocked.

Respond with this exact JSON only. No markdown, no code fences, no extra text:
{{
  "explanation": "Write exactly 4-5 sentences. Explain what was detected and exactly why it is dangerous. Describe what an attacker could do if this reached production. Explain why blocking the deployment was the right call. State the compliance and security impact.",
  "fix": "Write exactly 4-5 numbered steps. Include how to immediately rotate or revoke any exposed credentials. Include how to remove the secret from git history. Include how to prevent this from happening again. Be specific.",
  "risk_score": <an integer from 1 to 10 reflecting severity>
}}"""

    try:
        raw = _call_ai(prompt)
        return _parse_json(raw)
    except Exception as e:
        print(f"analyze_code_scan_failure completely failed after all providers: {e}")
        return {
            "explanation": "AI analysis unavailable - all providers (Groq, Gemini, Ollama) failed. Please review the Gitleaks/Semgrep output manually to understand what was flagged.",
            "fix": "Review the scanner output above, fix the flagged issues, rotate any exposed credentials immediately, and re-run the pipeline.",
            "risk_score": 7,
        }