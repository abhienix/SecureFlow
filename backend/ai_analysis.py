import os
import re
import json
import requests
from dotenv import load_dotenv

# Load API keys and config from .env so nothing sensitive is hardcoded in source
load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
# Ollama runs locally, so we default to localhost if not explicitly configured
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")

# Model choices: Groq gives us fast cloud inference for free, Gemini is our
# paid fallback with higher reliability, and Ollama is the offline safety net
# so the pipeline never fully dies even without internet or API credits
GROQ_MODEL = "llama-3.3-70b-versatile"
GEMINI_MODEL = "gemini-1.5-flash"
OLLAMA_MODEL = "qwen2.5:7b"


def _call_groq(prompt):
    # Groq uses OpenAI-compatible API format, which made it easy to swap in
    # without changing the rest of the calling code
    resp = requests.post(
        "https://api.groq.com/openai/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "model": GROQ_MODEL,
            "messages": [{"role": "user", "content": prompt}],
            # temperature 0.4 — low enough to keep output structured/consistent,
            # high enough to avoid robotic repetition across similar CVE sets
            "temperature": 0.4,
            "max_tokens": 1024,
        },
        # 30s timeout — Groq is fast; if it takes longer something is wrong
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"].strip()


def _call_gemini(prompt):
    # Gemini uses a different API shape than OpenAI, so it gets its own caller
    # rather than trying to shoehorn it into a generic wrapper
    resp = requests.post(
        f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}",
        json={"contents": [{"parts": [{"text": prompt}]}]},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()["candidates"][0]["content"]["parts"][0]["text"].strip()


def _call_ollama(prompt):
    # Ollama runs the model locally — no API key needed, works offline,
    # but slower so we give it a longer timeout (60s vs 30s for cloud)
    resp = requests.post(
        f"{OLLAMA_URL}/api/generate",
        json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False},
        timeout=60,
    )
    resp.raise_for_status()
    return resp.json()["response"].strip()


def _call_ai(prompt):
    # Fallback chain: Groq (free + fast) → Gemini (paid + reliable) → Ollama (local, always available)
    # Each provider is tried only if its API key exists, so missing keys are
    # skipped gracefully instead of throwing auth errors mid-pipeline
    #
    # NOTE: this function is reused below by answer_copilot_question() too —
    # the Copilot chat doesn't get its own provider-calling logic, it just
    # builds a different prompt and hands it to the same fallback chain
    # everything else in this file already uses. One chain, one set of
    # timeouts/retries/logging to maintain, instead of two copies drifting
    # apart over time.

    if GROQ_API_KEY:
        try:
            result = _call_groq(prompt)
            print("AI provider: Groq (primary) - success")
            return result
        except Exception as e:
            # Log and fall through — don't crash the whole scan just because
            # one provider is having a bad day
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

    # If all three fail, raise so the caller can return a safe static fallback
    # rather than silently returning None and confusing the frontend
    raise Exception("All AI providers failed")


def _sanitize(value, max_len=None):
    # Strip control characters before sending to AI — some CVE descriptions
    # contain null bytes or escape sequences that break JSON parsing downstream
    s = str(value)
    s = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', s)
    # Force ASCII — LLM APIs occasionally choke on non-ASCII in vulnerability descriptions
    s = s.encode('ascii', 'ignore').decode('ascii')
    if max_len:
        # Cap description length to keep the prompt within token limits
        s = s[:max_len]
    return s.strip()


def _parse_json(raw):
    # LLMs sometimes wrap JSON in markdown code fences even when told not to —
    # strip those before parsing so we don't crash on valid responses
    raw = raw.strip()
    if raw.startswith("```json"):
        raw = raw[7:]
    elif raw.startswith("```"):
        raw = raw[3:]
    raw = raw.rstrip("`").strip()
    # Remove any stray control characters the model may have hallucinated
    raw = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', raw)
    # Collapse newlines inside the JSON string so json.loads doesn't fail
    # on multi-line string values
    raw = re.sub(r'\n', ' ', raw)
    return json.loads(raw)


def analyze_scan(vulnerabilities):
    if not vulnerabilities:
        return []

    # Cap at 8 vulns — sending the full list inflates the prompt, hits token
    # limits, and the AI starts giving generic advice instead of specific fixes.
    # The top 8 (already sorted by severity by the caller) covers the critical surface.
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

    # Prompt is tightly constrained — we tell the model exactly what persona
    # to adopt, what format to output, and how many sentences each field should be.
    # Without this level of control, the AI tends to give vague generic advice
    # that developers can't actually act on.
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
        # Static fallback — better to show something useful than crash the dashboard
        return [{
            "explanation": "AI analysis unavailable. Please review the Trivy scan output manually.",
            "fix": "Manually review the Trivy results and upgrade all affected packages to their latest patched versions.",
            "risk_score": 5,
        }]


def analyze_code_scan_failure(failure_info):
    # This runs when Gitleaks or Semgrep blocks the pipeline — the developer
    # needs to understand *why* their push was rejected, not just see a generic error
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
        # Don't let AI failure swallow the original security finding —
        # return a safe fallback so the block reason still shows on the dashboard
        return {
            "explanation": "AI analysis unavailable. Please review the scanner output manually.",
            "fix": "Review the scanner output, fix flagged issues, rotate any exposed credentials, and re-run the pipeline.",
            "risk_score": 7,
        }


# ---------------------------------------------------------------------------
# AI Copilot — chat Q&A over scan history (NEW)
# ---------------------------------------------------------------------------
# Added to support the dashboard's "Ask about your pipeline" chat panel.
# This deliberately reuses _call_ai() above rather than writing its own
# Groq/Gemini/Ollama calling code — it's the exact same fallback chain,
# same timeouts, same provider order. The only thing that's different from
# analyze_scan()/analyze_code_scan_failure() is the prompt itself: instead
# of "explain this CVE", it's "answer this free-form question using this
# JSON context", and the response is plain text rather than a structured
# JSON object, since chat answers don't need a fixed schema.
#
# SAFETY NOTE: the system instructions below explicitly tell the model it
# cannot take actions (re-run scans, flip ALLOW/BLOCK, deploy, etc.) even
# though this function never gives it tool access to do so. That's
# intentional — without that instruction, if a person asks "can you
# unblock this commit for me", the model might describe itself as having
# done it, which would be actively misleading on a security dashboard.
# The model only ever reads the context dict it's handed and writes back
# text; main.py is responsible for keeping the actual ALLOW/BLOCK/deploy
# decisions entirely outside this function's reach.

COPILOT_SYSTEM_INSTRUCTIONS = (
    "You are the AI Copilot inside the SecureFlow CI/CD security dashboard. "
    "Answer questions about scan history, blocked commits, vulnerabilities, "
    "and risk trends using ONLY the context data provided below. You do not "
    "have access to the internet, the codebase, or any tool that can take "
    "action. You cannot re-run scans, change ALLOW/BLOCK decisions, deploy "
    "anything, or modify the policy engine. If asked to do any of these "
    "things, say plainly that you can't take actions from chat and point to "
    "the relevant dashboard control instead (e.g. the Re-analyze button on "
    "that scan). Be concise. Reference specific commit SHAs, repo names, and "
    "severities from the context when relevant. If the context doesn't "
    "contain enough information to answer, say so rather than guessing."
)


def answer_copilot_question(question, context):
    """
    Answers a free-form question about scan history using the same
    Groq -> Gemini -> Ollama fallback chain as the rest of this file.

    question: plain string, the user's question
    context:  dict of recent scan data (see main.py's /api/copilot/ask),
              kept small/bounded so the prompt stays cheap regardless of
              how much scan history has accumulated overall

    Read-only by design — this function has no DB access and no ability
    to call back into the policy engine, scanners, or deploy pipeline.
    It only ever returns text for the chat panel to display.
    """
    question = _sanitize(question, max_len=500)
    context_json = _sanitize(json.dumps(context, default=str), max_len=6000)

    prompt = (
        COPILOT_SYSTEM_INSTRUCTIONS
        + "\n\nContext (recent scan history as JSON):\n"
        + context_json
        + "\n\nQuestion: "
        + question
    )

    try:
        return _call_ai(prompt)
    except Exception as e:
        print(f"answer_copilot_question failed: {e}")
        # Same pattern as analyze_scan/analyze_code_scan_failure: never let
        # an AI outage surface as a raw exception to the frontend. main.py
        # turns this into a clean 502, but we still return something
        # reasonable here in case this function is ever called directly.
        raise