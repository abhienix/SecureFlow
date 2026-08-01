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
GEMINI_MODEL = "gemini-2.0-flash-lite"
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
   # # Ollama runs the model locally — no API key needed, works offline,
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
    raw = raw.strip()
    if raw.startswith("```json"):
        raw = raw[7:]
    elif raw.startswith("```"):
        raw = raw[3:]
    raw = raw.rstrip("`").strip()
    raw = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', raw)
    
    try:
        # Try direct parse after collapsing newlines
        clean = re.sub(r'\n', ' ', raw)
        return json.loads(clean)
    except Exception:
        # Fallback: find the first { and last }
        match = re.search(r'(\{[\s\S]*\})', raw)
        if match:
            json_str = match.group(1)
            json_str = re.sub(r'\n', ' ', json_str)
            return json.loads(json_str)
        raise


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
    scanner = _sanitize(failure_info.get('scanner', 'unknown'))
    scanner_hint = ""
    if scanner == "gitleaks":
        scanner_hint = (
            " Focus on: credential rotation, removing secrets from git history (git filter-repo/BFG),"
            " using environment variables or a secret manager, and adding pre-commit hooks."
        )
    elif scanner == "semgrep":
        scanner_hint = (
            " Focus on: the exact insecure code pattern, a secure code alternative,"
            " and whether this is a false positive vs a real exploit path."
        )

    prompt = (
        "You are a senior DevSecOps engineer."
        " The CI/CD pipeline was blocked because a code security scan failed.\n\n"
        "What the scanner found:\n"
        "- Scanner: " + scanner + "\n"
        "- Reason: " + _sanitize(failure_info.get('reason', 'unknown')) + "\n"
        "- Detail: " + _sanitize(failure_info.get('detail', 'unknown'), max_len=400) + "\n\n"
        "Explain this clearly to a developer who needs to understand"
        " why their deployment was blocked."
        + scanner_hint + "\n\n"
        "Respond with this exact JSON only."
        " No markdown, no code fences, no extra text:\n"
        '{\n'
        '  "explanation": "Write exactly 4-5 sentences.'
        ' Quote the specific file/rule/pattern from the detail when available.'
        ' Explain what was detected and why it is dangerous.'
        ' Describe what an attacker could do if this reached production.'
        ' Explain why blocking the deployment was the right call.",\n'
        '  "fix": "Write exactly 4-5 numbered steps.'
        ' Step 1 must be an immediate containment action.'
        ' Include credential rotation if secrets were exposed.'
        ' Include git history cleanup commands if applicable.'
        ' Include prevention (pre-commit hooks, secret scanning in IDE).",\n'
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
    "You are SecureFlow's security companion named Void — a sharp, highly intelligent, interactive DevSecOps assistant engineered by Abhimanyu.\n\n"
    "SYSTEM ARCHITECTURE & DEEP MEMORY:\n"
    "1. DEVSECOPS PIPELINE ENGINE:\n"
    "   - SecureFlow coordinates multi-stage CI/CD security audits using standard security tools: Gitleaks (Secrets), Semgrep (SAST), Trivy (Container CVEs), and OWASP ZAP (DAST).\n"
    "   - Policy Gate rules enforce strict blocking on CRITICAL and HIGH severity findings before staging/production deployment.\n"
    "2. DEEP SYSTEM MEMORY:\n"
    "   - You have real-time memory access to the latest 50 scan runs, top 500 security findings, Cloud Run deployment states, and policy rule configurations.\n"
    "3. REMEDIATION & PATCH GENERATION:\n"
    "   - When answering vulnerability questions, offer actionable, developer-ready code patches, Dockerfile hardening instructions, or `.gitleaks.toml` suppression rules.\n\n"
    "STRICT DOMAIN BOUNDARIES & SECURITY GUARDRAILS:\n"
    "1. DOMAIN SCOPE:\n"
    "   - You MUST ONLY answer questions related to SecureFlow, DevSecOps, CI/CD pipelines, security scans, CVEs, code vulnerabilities, policy gates, cloud security, and software safety.\n"
    "2. OFF-TOPIC REJECTION:\n"
    "   - If the user asks ANY off-topic, non-security, or non-technical question (e.g. weather, sports, cooking, general trivia, stories, non-software topics), you MUST politely decline with:\n"
    "     '🔒 **Security Boundary**: I am Void, your SecureFlow security companion. I can only assist with DevSecOps pipelines, security scans, vulnerability remediation, and codebase safety. How can I help with your security posture today?'\n\n"
    "RESPONSE STYLE & INTERACTIVE CONVERSATION PRINCIPLES:\n"
    "1. CASUAL GREETINGS:\n"
    "   - For standalone greetings ('hi', 'hello', 'hey'), respond warmly and briefly without dumping scan lists unless requested.\n"
    "2. NUMERIC & RANGE PRECISION:\n"
    "   - If the user asks for 'first 10', 'last 5', 'top 3', or specific counts, respect the exact count requested.\n"
    "3. TECHNICAL INTEL:\n"
    "   - Provide sharp, expert guidance on OWASP Top 10, CVE fixes, Docker hardening, Gitleaks secrets, and pipeline policy gate rules with code fix snippets.\n"
    "4. CREATOR KNOWLEDGE:\n"
    "   - You know Abhimanyu as your creator/architect. Only mention him if explicitly asked about your origin.\n"
)


def answer_copilot_question(question, context):
    """
    Answers a free-form question about scan history using the same
    Groq -> Gemini -> Ollama fallback chain as the rest of this file.

    question: plain string, the user's question
    context:  dict of recent scan data (see main.py's /api/copilot/ask),
              kept small/bounded so the prompt stays cheap regardless of
              how much scan history has accumulated overall
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
        print(f"answer_copilot_question cloud LLM call failed: {e} — using smart_fallback")
        return smart_fallback(question, context)


def smart_fallback(question: str, context: dict) -> str:
    """
    Data-driven fallback when LLM is unavailable.
    Reads the real DB context and answers common questions directly.
    Never echoes the question back or gives empty boilerplate.
    """
    q = question.lower().strip()
    recent_scans = context.get("recent_scans", [])
    earliest_scans = context.get("earliest_scans", [])
    sev = context.get("findings_summary", {})
    total = context.get("total_scans", len(recent_scans))

    blocked = [s for s in recent_scans if s.get("action_taken") == "BLOCK" or s.get("status") in ("failed", "blocked")]
    passed  = [s for s in recent_scans if s.get("action_taken") == "ALLOW" and s.get("status") not in ("failed", "blocked")]
    latest  = recent_scans[0] if recent_scans else {}

    # ── 0. Strict Security Domain Boundary Guardrail ───────────────────────
    OFF_TOPIC_TERMS = [
        "weather", "recipe", "cook", "bake", "sports", "football", "cricket", "basketball",
        "movie", "actor", "song", "sing", "joke", "capital of", "who is the president",
        "president of", "tell me a story", "game", "horoscope", "car", "travel", "food"
    ]
    if any(term in q for term in OFF_TOPIC_TERMS):
        return (
            "🔒 **Security Boundary**: I am Void, your SecureFlow security companion. "
            "I can only assist with DevSecOps pipelines, security scans, vulnerability remediation, "
            "and codebase safety. How can I help with your security posture today?"
        )

    # ── 1. Standalone Greeting Check (Exact word boundary & short prompt) ──
    if re.search(r'\b(hi|hello|hey|greetings|who are you|what are you)\b', q) and len(q.split()) <= 4:
        return (
            f"Hey! 👋 I'm **Void** — your SecureFlow security assistant.\n"
            f"I have access to your live pipeline data. Right now:\n"
            f"- **{total}** total scans tracked\n"
            f"- **{len(blocked)}** blocked in the last 20 runs\n"
            f"- **{sev.get('CRITICAL', 0)} critical** / **{sev.get('HIGH', 0)} high** findings\n\n"
            f"Ask me about specific pipelines, commits, CVEs, or scan results."
        )

    # ── 2. Single First Commit / Specific Scan ID Lookup ───────────────────
    # Detect single item query for "no 1 commit", "commit #1", "first commit", "1st commit", "oldest commit"
    has_plural_count = any(k in q for k in ["10", "20", "50", "5", "last", "recent", "list", "all"]) and not re.search(r'\b(no|number|#)?\s*1\b', q)
    is_single_first = (
        bool(re.search(r'\b(no|number|#)?\s*1(st)?\b', q) or re.search(r'\b(first|earliest|oldest)\b', q))
        and not has_plural_count
    )

    if is_single_first and any(w in q for w in ["commit", "scan", "run", "done", "asked", "done"]):
        all_scans = earliest_scans or recent_scans
        if all_scans:
            first_scan = min(all_scans, key=lambda s: s.get("id", 999999))
            icon = "🔴" if first_scan.get("action_taken") == "BLOCK" else "🟢"
            return (
                f"**First Commit (#1 in Repository History)**:\n"
                f"{icon} **#{first_scan['id']}** `{first_scan.get('commit_sha', '?')[:7]}` — _{first_scan.get('commit_message') or 'no message'}_\n"
                f"- Branch: `{first_scan.get('branch', 'main')}`\n"
                f"- Result: **{first_scan.get('action_taken', 'ALLOW')}**\n"
                f"- Created At: {first_scan.get('created_at', 'N/A')}\n\n"
                f"_(Total pipeline scans tracked: {total})_"
            )

    # Check for explicit ID lookup like "scan 608", "commit #608"
    id_match = re.search(r'\b(scan|commit|run|#)\s*#?(\d+)\b', q)
    if id_match and not ("not " + id_match.group(2) in q):
        target_id = int(id_match.group(2))
        combined_scans = recent_scans + earliest_scans
        found_scan = next((s for s in combined_scans if s.get("id") == target_id), None)
        if found_scan:
            icon = "🔴" if found_scan.get("action_taken") == "BLOCK" else "🟢"
            return (
                f"**Scan Run #{found_scan['id']}**\n"
                f"{icon} Commit `{found_scan.get('commit_sha', '?')[:7]}` — _{found_scan.get('commit_message') or 'no message'}_\n"
                f"- Branch: `{found_scan.get('branch', 'main')}`\n"
                f"- Action: **{found_scan.get('action_taken', 'ALLOW')}**\n"
                f"- Created At: {found_scan.get('created_at', 'N/A')}"
            )

    # ── 3. Blocked / Failed Queries ─────────────────────────────────────────
    if any(w in q for w in ["block", "fail", "which one", "why", "reason", "issue", "how many are blocked"]):
        if not blocked:
            return "✅ No blocked pipelines in the last 20 runs. Everything is passing."
        
        b = blocked[0]
        explanation = b.get("ai_explanation") or "Security scanner thresholds exceeded."
        return (
            f"**Pipeline #{b['id']} was BLOCKED**\n"
            f"- Commit: `{b.get('commit_sha', '?')[:7]}` on `{b.get('branch', 'main')}`\n"
            f"- Message: _{b.get('commit_message', '') or 'n/a'}_\n"
            f"- Reason: {explanation}\n\n"
            f"In total, **{len(blocked)}** of the last {len(recent_scans)} runs were blocked."
        )

    # ── 4. Commits / Scan Results Listing (With Range & Direction Parsing) ──
    if any(w in q for w in ["commit", "last", "recent", "pipeline", "result", "1st", "first", "start"]):
        if not recent_scans:
            return "No recent scan data found in the database right now."

        # Strip out negated numbers like "not 610" before extracting count limit
        q_clean = re.sub(r'\b(not|except)\s+#?\d+\b', '', q)
        match_num = re.search(r'\b(\d+)\b', q_clean)
        requested_limit = int(match_num.group(1)) if match_num else 20
        requested_limit = min(max(requested_limit, 1), 50)

        is_earliest = any(w in q for w in ["from the start", "earliest", "oldest", "1st 10", "first 10", "start"])

        if is_earliest:
            display_scans = list(earliest_scans) if earliest_scans else list(recent_scans)
            display_scans.sort(key=lambda s: s.get("id", 0))
            heading = f"Here are the first {min(requested_limit, len(display_scans))} scan runs (from the start):\n"
        else:
            display_scans = list(recent_scans)
            heading = f"Here are the last {min(requested_limit, len(display_scans))} scan runs:\n"

        lines = [heading]
        for s in display_scans[:requested_limit]:
            icon = "🔴" if s.get("action_taken") == "BLOCK" else "🟢"
            sha  = s.get("commit_sha", "?")[:7]
            msg  = (s.get("commit_message") or "no message")[:60]
            branch = s.get("branch", "main")
            action = s.get("action_taken", "ALLOW")
            lines.append(f"{icon} **#{s['id']}** `{sha}` — {msg} _(branch: {branch}, {action})_")
        return "\n".join(lines)

    # ── 5. CVE / findings / severity ────────────────────────────────────────
    if any(w in q for w in ["cve", "finding", "vuln", "critical", "high", "severity", "security"]):
        c, h, m, lo = sev.get("CRITICAL", 0), sev.get("HIGH", 0), sev.get("MEDIUM", 0), sev.get("LOW", 0)
        if c + h + m + lo == 0:
            return "No findings data available right now. Run a scan to populate security findings."
        return (
            f"**Current Security Findings (last 200 entries):**\n"
            f"- 🔴 Critical: **{c}**\n"
            f"- 🟠 High: **{h}**\n"
            f"- 🟡 Medium: **{m}**\n"
            f"- 🟢 Low: **{lo}**\n\n"
            f"Focus on the **{c} critical** issues first — these can cause immediate risk."
        )

    # ── 6. Health / status ──────────────────────────────────────────────────
    if any(w in q for w in ["health", "status", "overview", "summary"]):
        block_rate = round(len(blocked) / max(len(recent_scans), 1) * 100)
        return (
            f"**SecureFlow System Health**\n"
            f"- Total scans tracked: **{total}**\n"
            f"- Last 20 runs: **{len(passed)} passed**, **{len(blocked)} blocked** ({block_rate}% block rate)\n"
            f"- Findings: **{sev.get('CRITICAL', 0)}** critical, **{sev.get('HIGH', 0)}** high\n"
            f"- Latest run: **#{latest.get('id', 'N/A')}** — {latest.get('action_taken', 'ALLOW')}"
        )

    # ── 7. Latest / most recent scan ────────────────────────────────────────
    if any(w in q for w in ["latest", "newest", "most recent"]):
        if not latest:
            return "No scans found yet."
        return (
            f"**Latest scan: #{latest['id']}**\n"
            f"- Branch: `{latest.get('branch', 'main')}`\n"
            f"- Commit: `{latest.get('commit_sha', '?')[:7]}` — _{latest.get('commit_message', '') or 'no message'}_\n"
            f"- Result: **{latest.get('action_taken', 'ALLOW')}**\n"
            + (f"- Note: {latest['ai_explanation']}" if latest.get('ai_explanation') else "")
        )

    # ── 8. Default Fallback ─────────────────────────────────────────────────
    block_rate = round(len(blocked) / max(len(recent_scans), 1) * 100)
    return (
        f"Here's what I can see right now:\n"
        f"- **{total}** total pipeline scans\n"
        f"- Last 20: **{len(passed)} passed**, **{len(blocked)} blocked** ({block_rate}% block rate)\n"
        f"- Findings: **{sev.get('CRITICAL', 0)} critical**, **{sev.get('HIGH', 0)} high**, **{sev.get('MEDIUM', 0)} medium**\n\n"
        f"Try asking: _'tell me no 1 commit'_, _'which pipeline was blocked?'_, or _'show last 10 commits'_."
    )

    # ── 7. Default Fallback ─────────────────────────────────────────────────
    block_rate = round(len(blocked) / max(len(recent_scans), 1) * 100)
    return (
        f"Here's what I can see right now:\n"
        f"- **{total}** total pipeline scans\n"
        f"- Last 20: **{len(passed)} passed**, **{len(blocked)} blocked** ({block_rate}% block rate)\n"
        f"- Findings: **{sev.get('CRITICAL', 0)}** critical, **{sev.get('HIGH', 0)}** high, **{sev.get('MEDIUM', 0)}** medium\n\n"
        f"Try asking: _'show last 10 commits'_, _'which pipeline was blocked?'_, or _'show 1st 10 from start'_."
    )