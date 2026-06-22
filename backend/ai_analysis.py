import os
import re
import json
import requests
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")

GROQ_MODEL = "llama-3.3-70b-versatile"
GEMINI_MODEL = "gemini-1.5-flash"
OLLAMA_MODEL = "qwen2.5:7b"


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


def _call_gemini(prompt):
    resp = requests.post(
        f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}",
        json={"contents": [{"parts": [{"text": prompt}]}]},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()


def _call_ollama(prompt):
    resp = requests.post(
        f"{OLLAMA_URL}/api/generate",
        json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False},
        timeout=60,
    )
    resp.raise_for_status()
    return resp.json()["response"].strip()


def _call_ai(prompt):
    if GROQ_API_KEY:
        try:
            result = _call_groq(prompt)
            print("AI provider: Groq (primary) - success")
            return result
        except Exception as e:
            print(f"Groq failed: {e}")
    else:
        print("Groq skipped - no API key")

    if GEMINI_API_KEY:
        try:
            result = _call_gemini(prompt)
            print("AI provider: Gemini (fallback) - success")
            return result
        except Exception as e:
            print(f"Gemini failed: {e}")
    else:
        print("Gemini skipped - no API key")

    try:
        result = _call_ollama(prompt)
        print("AI provider: Ollama (local) - success")
        return result
    except Exception as e:
        print(f"Ollama failed: {e}")

    raise Exception("All AI providers failed")


def _sanitize(value, max_len=None):
    s = str(value)
    s = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', s)
    s = s.encode('ascii', 'ignore').decode('ascii')
    if max_len:
        s = s[:max_len]
    return s.strip()


def _parse_json(raw):
    raw = raw.strip()
    if raw.startswith("```json"):
        raw = raw[7:]
    elif raw.startswith("```"):
        raw = raw[3:]
    raw = raw.rstrip("`").strip()
    raw = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', raw)
    raw = re.sub(r'\n', ' ', raw)
    return json.loads(raw)


def analyze_scan(vulnerabilities):
    if not vulnerabilities:
        return []

    top = vulnerabilities[:8]
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

    prompt = (
        "You are a senior DevSecOps engineer reviewing a Docker image CVE scan"
        " for a production Cloud Run deployment.\n\n"
        "Vulnerabilities found in the image:\n"
        + vuln_lines
        + "\n\nWrite a detailed, human-readable security assessment."
        " Be specific - name the CVEs, explain what they actually do,"
        " and give real actionable steps.\n\n"
        "Respond with this exact JSON only."
        " No markdown, no code fences, no extra text:\n"
        '{\n'
        '  "explanation": "Write exactly 4-5 sentences.'
        ' Name the most critical CVE IDs specifically.'
        ' Explain what an attacker could actually do if they exploited these.'
        ' Name the affected packages.'
        ' State the real-world impact on this production service.",\n'
        '  "fix": "Write exactly 4-5 numbered steps.'
        ' Include the exact package versions to upgrade to.'
        ' Say whether the base Docker image needs to be updated.'
        ' Include any runtime hardening steps.'
        ' Be specific and technical - no vague advice.",\n'
        '  "risk_score": 8\n'
        '}'
    )

    try:
        raw = _call_ai(prompt)
        result = _parse_json(raw)
        return [result]
    except Exception as e:
        print(f"analyze_scan failed: {e}")
        return [{
            "explanation": "AI analysis unavailable. Please review the Trivy scan output manually.",
            "fix": "Manually review the Trivy results and upgrade all affected packages to their latest patched versions.",
            "risk_score": 5,
        }]


def analyze_code_scan_failure(failure_info):
    prompt = (
        "You are a senior DevSecOps engineer."
        " The CI/CD pipeline was blocked because a code security scan failed.\n\n"
        "What the scanner found:\n"
        "- Scanner: " + _sanitize(failure_info.get('scanner', 'unknown')) + "\n"
        "- Reason: " + _sanitize(failure_info.get('reason', 'unknown')) + "\n"
        "- Detail: " + _sanitize(failure_info.get('detail', 'unknown'), max_len=300) + "\n\n"
        "Explain this clearly to a developer who needs to understand"
        " why their deployment was blocked.\n\n"
        "Respond with this exact JSON only."
        " No markdown, no code fences, no extra text:\n"
        '{\n'
        '  "explanation": "Write exactly 4-5 sentences.'
        ' Explain what was detected and why it is dangerous.'
        ' Describe what an attacker could do if this reached production.'
        ' Explain why blocking the deployment was the right call.'
        ' State the compliance impact.",\n'
        '  "fix": "Write exactly 4-5 numbered steps.'
        ' Include how to rotate or revoke exposed credentials.'
        ' Include how to remove the secret from git history.'
        ' Include how to prevent this again.",\n'
        '  "risk_score": 8\n'
        '}'
    )

    try:
        raw = _call_ai(prompt)
        return _parse_json(raw)
    except Exception as e:
        print(f"analyze_code_scan_failure failed: {e}")
        return {
            "explanation": "AI analysis unavailable. Please review the scanner output manually.",
            "fix": "Review the scanner output, fix flagged issues, rotate any exposed credentials, and re-run the pipeline.",
            "risk_score": 7,
        }
