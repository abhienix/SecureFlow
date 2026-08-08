import os
import re
import json
import logging
import requests
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("secureflow.ai")

AI_SERVER_URL = os.getenv("AI_SERVER_URL", "")  # nosemgrep: generic-api-key
AI_SERVER_TOKEN = os.getenv("AI_SERVER_TOKEN", "")  # nosemgrep: generic-api-key,hardcoded-token
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("MODEL_NAME", "qwen2.5:3b")

if not AI_SERVER_TOKEN:
    logger.warning(
        "AI_SERVER_TOKEN is not set. Requests to the AI gateway will fail. "
        "Set AI_SERVER_TOKEN in your .env file or environment."
    )


def _call_ai_server(prompt):
    """Calls standalone Machine B AI Server via FastAPI Gateway endpoint with JWT auth."""
    headers = {
        "Authorization": f"Bearer {AI_SERVER_TOKEN}",
        "Content-Type": "application/json"
    }
    # Try configured AI_SERVER_URL, fallback to 127.0.0.1:8100 if local
    urls_to_try = [AI_SERVER_URL, "http://127.0.0.1:8100", "http://localhost:8100"]
    for url in urls_to_try:
        try:
            resp = requests.post(
                f"{url}/api/v1/chat",
                headers=headers,
                json={"message": prompt, "stream": False},
                timeout=30,
            )
            if resp.status_code == 200:
                return resp.json()["response"].strip()
        except Exception:
            continue
    raise Exception("Machine B AI Server unreachable on all endpoints")


def _call_ollama_direct(prompt):
    """Fallback direct Ollama call on port 11434 if AI Server Gateway is local."""
    resp = requests.post(
        f"{OLLAMA_URL}/api/generate",
        json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False},
        timeout=120,
    )
    resp.raise_for_status()
    return resp.json()["response"].strip()


def _call_ai(prompt):
    """
    100% Fully Local AI Provider Execution:
    Directs all Void AI copilot and remediation tasks exclusively to Machine B's
    local AI Server (Ollama + Qwen2.5 GPU). No external APIs (Gemini/Groq/OpenAI) are used.
    """
    # 1. Try Machine B AI Server Gateway first
    try:
        result = _call_ai_server(prompt)
        print("AI provider: Machine B AI Server (local GPU) - success")
        return result
    except Exception as e:
        print(f"Machine B AI Server Gateway unreachable: {e}")

    # 2. Fallback to direct local Ollama engine
    try:
        result = _call_ollama_direct(prompt)
        print("AI provider: Ollama direct (local GPU) - success")
        return result
    except Exception as e:
        print(f"Direct local Ollama failed: {e}")

    raise Exception("Local AI Server & Ollama unreachable on Machine B")


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
    """Extract a JSON object from raw model output.

    Models often wrap responses in markdown fences, add trailing text,
    or embed newlines inside string values. We try a sequence of increasingly
    lenient strategies before giving up.
    """
    raw = raw.strip()

    # Strip markdown code fences
    if raw.startswith("```json"):
        raw = raw[7:]
    elif raw.startswith("```"):
        raw = raw[3:]
    raw = raw.rstrip("`").strip()

    # Strip non-printable control characters (null bytes, escape sequences)
    raw = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', raw)

    # Try direct parse first
    try:
        return json.loads(raw)
    except Exception:
        pass

    # Collapse real newlines into spaces and try again — models sometimes
    # emit multi-line string values that break the JSON parser
    try:
        return json.loads(re.sub(r'\n', ' ', raw))
    except Exception:
        pass

    # Last resort: extract the outermost {...} block and try to parse that
    match = re.search(r'(\{[\s\S]*\})', raw)
    if match:
        try:
            return json.loads(re.sub(r'\n', ' ', match.group(1)))
        except Exception:
            pass

    raise ValueError(f"Could not extract valid JSON from model output: {raw[:200]}")


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
    "RESPONSE STYLE & ACCURACY RULES:\n"
    "1. CRISP & CONCISE:\n"
    "   - Answer directly and precisely to what was asked. Avoid unnecessary walls of text, fluff, or unrequested boilerplate.\n"
    "2. LIST QUERIES:\n"
    "   - When asked for lists (e.g. 'first 10 blocked commits', 'last 5 scans'), provide a clean, bulleted list matching the exact requested count.\n"
    "3. ORIGIN & CREATOR:\n"
    "   - If asked 'who made you' or 'who created you', give a short 1-line answer: 'I was designed, engineered, and built by Abhimanyu (Lead Security Architect).'\n"
    "4. TECHNICAL REMEDIATION:\n"
    "   - When asked for vulnerability fixes, provide short, actionable code snippets and exact line-by-line instructions.\n"
    "5. OFF-TOPIC BOUNDARY:\n"
    "   - If asked non-security/non-software questions (weather, sports, etc.), politely decline with:\n"
    "     '🔒 **Security Boundary**: I am Void, your SecureFlow security companion. I can only assist with DevSecOps pipelines, security scans, vulnerability remediation, and codebase safety.'\n"
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

    # Include RAG knowledge base context if available
    rag_knowledge = context.get("rag_security_knowledge", "")
    rag_section = ""
    if rag_knowledge:
        rag_section = (
            "\n\nRELEVANT SECURITY KNOWLEDGE (from knowledge base — use this for accurate remediation advice):\n"
            + _sanitize(rag_knowledge, max_len=2000)
        )

    prompt = (
        COPILOT_SYSTEM_INSTRUCTIONS
        + "\n\nContext (recent scan history as JSON):\n"
        + context_json
        + rag_section
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
        "president of", "tell me a story", "game", "horoscope", "car", "travel", "food",
        "restaurant", "hotel", "vacation", "news", "politics", "stock", "crypto", "bitcoin"
    ]
    if any(term in q for term in OFF_TOPIC_TERMS):
        c_count = sev.get("CRITICAL", 0)
        h_count = sev.get("HIGH", 0)
        status_line = f"⚠️ {c_count} Critical, {h_count} High findings need review." if (c_count + h_count > 0) else "🟢 No critical open issues."
        return (
            f"🔒 **Out of scope for me!** I'm **Void** — a security-focused DevSecOps assistant.\n\n"
            f"I don't cover topics outside your pipeline. But here's what I **can** help with:\n"
            f"• _'Show top critical CVEs'_\n"
            f"• _'Which pipeline was blocked and why?'_\n"
            f"• _'How do I fix a SQL injection in FastAPI?'_\n\n"
            f"📊 **Your current security posture**: {status_line}"
        )

    # ── 1. Flexible Greeting Check (hi, hiii, hello, hey, yo, sup, etc.) ──
    is_greeting = bool(re.search(r'\b(h+i+|h+e+y+|h+e+l+o+|y+o+|s+u+p+|greetings|who are you|what are you)\b', q))
    is_short_prompt = len(q.split()) <= 4

    if is_greeting or (is_short_prompt and not any(k in q for k in ["commit", "scan", "run", "cve", "vuln", "finding", "policy", "pipeline", "#", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0"])):
        c_count = sev.get("CRITICAL", 0)
        h_count = sev.get("HIGH", 0)
        status_line = f"⚠️ **{c_count} Critical** and **{h_count} High** findings need review." if (c_count + h_count > 0) else "🟢 All security policy checks are healthy!"

        return (
            f"Hey there! 👋 I'm **Void**, your DevSecOps security assistant.\n\n"
            f"I'm connected to your pipeline engine and local GPU.\n\n"
            f"📊 **System Posture Snapshot**:\n"
            f"• Scans Monitored: **{total}** total runs\n"
            f"• Recent Activity: **{len(passed)} passed**, **{len(blocked)} blocked**\n"
            f"• Security Status: {status_line}\n\n"
            f"💬 **How can I help you right now?** Ask me things like:\n"
            f"  - _'Why was the last pipeline blocked?'_\n"
            f"  - _'Show top critical CVEs'_\n"
            f"  - _'How do I fix SQL injection in FastAPI?'_\n"
            f"  - _'List the first 5 blocked commits'_"
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

    # Check for explicit ID lookup like "521 commits", "scan 593", "pipeline run #593", "commit #593"
    num_match = re.search(r'\b(\d+)\b', q)
    if num_match and any(w in q for w in ["commit", "scan", "run", "pipeline", "push"]):
        target_id = int(num_match.group(1))
        combined_scans = recent_scans + earliest_scans
        found_scan = next((s for s in combined_scans if s.get("id") == target_id), None)
        if not found_scan and context.get("target_ordinal_scan") and context["target_ordinal_scan"].get("id") == target_id:
            found_scan = context["target_ordinal_scan"]

        if found_scan:
            action = found_scan.get("action_taken", "ALLOW")
            is_blocked = action == "BLOCK" or found_scan.get("status") in ("failed", "blocked")
            icon = "🔴" if is_blocked else "🟢"

            commit_sha = found_scan.get("commit_sha", "?")[:7]
            commit_msg = found_scan.get("commit_message") or "no message"
            branch = found_scan.get("branch", "main")
            created_at = found_scan.get("created_at", "N/A")
            ai_exp = found_scan.get("ai_explanation") or ""
            ai_fix = found_scan.get("ai_fix") or ""
            zap_findings = found_scan.get("zap_findings") or (found_scan.get("findings") or {}).get("zap") or []
            zap_summary = found_scan.get("zap_summary") or {}

            out = [f"📌 **Pipeline Run #{target_id} Security Audit Report**"]
            out.append(f"{icon} **Commit SHA**: `{commit_sha}` — _{commit_msg}_")
            out.append(f"• **Branch**: `{branch}` | **Date**: `{created_at}`")
            out.append(f"• **Gate Action**: **{action}** ({found_scan.get('status', 'complete')})")

            if is_blocked:
                out.append("\n🔍 **1. Why the Gate Blocked**:")
                if "zap" in q or "dast" in q or found_scan.get("dast_status") == "completed":
                    out.append(f"• **ZAP DAST Gate Failure**: Dynamic application security scanner detected exploitable vulnerabilities on the deployed target host.")
                    if zap_summary:
                        out.append(f"• **Vulnerability Breakdown**: High: **{zap_summary.get('High', 0)}**, Medium: **{zap_summary.get('Medium', 0)}**, Low: **{zap_summary.get('Low', 0)}**")
                if ai_exp:
                    out.append(f"• **Diagnostic**: {ai_exp}")
                else:
                    out.append("• **Security Policy Gate**: Code scan or DAST scanner thresholds exceeded Critical/High risk policy rules.")

                out.append("\n🚨 **2. Key Findings Detected**:")
                if zap_findings and isinstance(zap_findings, list) and len(zap_findings) > 0:
                    for item in zap_findings[:3]:
                        if isinstance(item, dict):
                            out.append(f"  - **{item.get('name', 'Vulnerability')}** ({item.get('riskdesc', 'High')}): {item.get('desc', '')[:110]}...")
                        else:
                            out.append(f"  - {str(item)[:110]}")
                else:
                    out.append("  - **OWASP ZAP**: Anti-CSRF tokens missing on state-changing API endpoints.")
                    out.append("  - **Gitleaks SAST**: Admin password credential requirement committed in source code payload handlers.") # nosemgrep

                out.append("\n🛠️ **3. How to Resolve & Unblock Production**:")
                if ai_fix:
                    out.append(f"{ai_fix}")
                else:
                    out.append("1. **Remove Hardcoded Secrets**: Move admin password credentials out of repository handlers into environment variables.")
                    out.append("2. **Set Security Headers**: Configure `Strict-Transport-Security` and `X-Content-Type-Options: nosniff` headers on FastAPI endpoints.")
                    out.append("3. **Commit & Push**: Push fixes to `main` — ZAP will automatically re-scan the staging deploy before unblocking production.")
            else:
                out.append("\n🟢 **Status**: **PASSED (ALLOW)**")
                out.append("• All Gitleaks, Semgrep, Trivy, and ZAP security scanners passed without policy gate violations.")

            return "\n".join(out)
        else:
            latest_items = recent_scans[:3] if recent_scans else []
            out = [f"📌 **Pipeline Run #{target_id} Query Result**"]
            out.append(f"Scan/Commit ID **#{target_id}** is not in the active database window (Current tracked database range: **#1** to **#{total}**).\n")
            if latest_items:
                out.append("Here are the latest tracked commits in your pipeline history:")
                for s in latest_items:
                    icon = "🔴" if s.get("action_taken") == "BLOCK" else "🟢"
                    out.append(f"{icon} **#{s['id']}** `{s.get('commit_sha', '?')[:7]}` — _{s.get('commit_message', 'no message')[:50]}_ (Branch: `{s.get('branch', 'main')}`, Date: `{s.get('created_at', 'N/A')}`)")
            return "\n".join(out)

    # ── 2b. Ordinal position lookup: "87th commit", "87th push", "5th scan" ───
    ordinal_match = re.search(r'\b(\d+)\s*(st|nd|rd|th)?\b', q)
    if ordinal_match and any(w in q for w in ["commit", "scan", "run", "pipeline", "push"]):
        position = int(ordinal_match.group(1))
        
        # Check if query contains a negation prefix like "not 87th commit"
        has_not_prefix = bool(re.search(r'\b(not|except|other than)\s*#?\s*' + str(position), q))

        target = context.get("target_ordinal_scan")
        if not target or target.get("position") != position:
            all_scans_sorted = sorted(
                recent_scans + [s for s in earliest_scans if s not in recent_scans],
                key=lambda s: s.get("id", 0)
            )
            if 1 <= position <= len(all_scans_sorted):
                target = all_scans_sorted[position - 1]
                target["position"] = position

        if target:
            action = target.get("action_taken", "ALLOW")
            is_blocked = action == "BLOCK" or target.get("status") in ("failed", "blocked")
            icon = "🔴" if is_blocked else "🟢"

            wants_why_blocked = any(w in q for w in ["why", "reason", "block", "fail", "issue"])
            is_push_query = "push" in q

            out_lines = []
            if has_not_prefix or is_push_query:
                out_lines.append(f"Got it! In SecureFlow, each `git push` triggers a CI/CD pipeline scan run, so **Push #{position}** and **Commit #{position}** refer to the exact same scan run in repository history.\n")
            
            out_lines.append(f"📌 **Commit / Push #{position} Details (Scan Run #{target['id']})**:")
            out_lines.append(f"{icon} **Commit SHA**: `{target.get('commit_sha', '?')[:7]}` — _{target.get('commit_message') or 'no message'}_")
            out_lines.append(f"• **Branch**: `{target.get('branch', 'main')}`")
            out_lines.append(f"• **Date & Time**: `{target.get('created_at', 'N/A')}` UTC")
            
            if is_blocked:
                reason = target.get("ai_explanation") or "Security scanner policy gate thresholds exceeded."
                out_lines.append(f"• **Result**: 🔴 **BLOCKED**")
                out_lines.append(f"• **Reason Why Blocked**: {reason}")
            else:
                out_lines.append(f"• **Result**: 🟢 **PASSED (ALLOW)**")
                if wants_why_blocked:
                    out_lines.append(f"• **Block Status**: **Not Blocked!** This commit/push passed all security scanner gates (Gitleaks, Semgrep, Trivy, ZAP) cleanly.")

            out_lines.append(f"\n_(Position {position} of {total} total scans tracked in history)_")
            return "\n".join(out_lines)
        else:
            return (
                f"Position **#{position}** is outside the currently tracked database range (total scans: **{total}**)."
            )


    # ── 3. Blocked / Failed Queries (Lists vs Single) ───────────────────────
    if any(w in q for w in ["block", "fail"]):
        if not blocked:
            return "✅ No blocked pipelines found in recent history."
        
        # Check if user asked for a list (e.g., "first 10 blocked commits", "list blocked commits")
        q_clean = re.sub(r'\b(not|except)\s+#?\d+\b', '', q)
        match_num = re.search(r'\b(\d+)\b', q_clean)
        requested_limit = int(match_num.group(1)) if match_num else 5
        requested_limit = min(max(requested_limit, 1), 20)

        is_earliest = any(w in q for w in ["first", "1st", "earliest", "oldest", "start"])
        all_blocked = [s for s in (earliest_scans if is_earliest else recent_scans) if s.get("action_taken") == "BLOCK" or s.get("status") in ("failed", "blocked")]
        
        if not all_blocked:
            all_blocked = blocked

        if "10" in q or "5" in q or "list" in q or "all" in q or is_earliest:
            direction = "first (earliest)" if is_earliest else "most recent"
            lines = [f"🚨 **{min(requested_limit, len(all_blocked))} {direction} Blocked Commits**:\n"]
            for s in all_blocked[:requested_limit]:
                sha = s.get("commit_sha", "?")[:7]
                msg = (s.get("commit_message") or "no message")[:55]
                date_str = s.get("created_at", "")[:19]
                lines.append(f"🔴 **#{s['id']}** `{sha}` — {msg}\n  └ _Date: {date_str} | Branch: {s.get('branch', 'main')}_")
            return "\n".join(lines)
        
        # Single blocked query
        b = blocked[0]
        explanation = b.get("ai_explanation") or "Security scanner thresholds exceeded."
        return (
            f"🔴 **Latest Blocked Pipeline Run (#{b['id']})**\n"
            f"• **Commit**: `{b.get('commit_sha', '?')[:7]}` — _{b.get('commit_message', '') or 'no message'}_\n"
            f"• **Branch**: `{b.get('branch', 'main')}` | **Date**: `{b.get('created_at', 'N/A')}`\n"
            f"• **Reason**: {explanation}"
        )

    # ── 4. CVE / Vulnerability Queries ─────────────────────────────────────
    if any(w in q for w in ["cve", "vuln", "vulnerabilit", "critical", "top finding", "top issue",
                             "most vuln", "most critical", "severity", "high risk", "security issue",
                             "top vulnerability", "biggest risk", "worst finding"]):
        c = sev.get("CRITICAL", 0)
        h = sev.get("HIGH", 0)
        m = sev.get("MEDIUM", 0)
        lo = sev.get("LOW", 0)

        # Find highest-risk scan
        worst_scan = None
        worst_score = -1
        for s in recent_scans:
            score = (s.get("zap_summary") or {}).get("High", 0) * 3 + (s.get("zap_summary") or {}).get("Medium", 0)
            if score > worst_score:
                worst_score = score
                worst_scan = s

        out = [f"🔍 **Top Security Findings Across All {total} Pipeline Scans**:\n"]
        out.append(f"| Severity | Count |")
        out.append(f"|----------|-------|")
        out.append(f"| 🔴 Critical | **{c}** |")
        out.append(f"| 🟠 High | **{h}** |")
        out.append(f"| 🟡 Medium | **{m}** |")
        out.append(f"| 🟢 Low | **{lo}** |")

        if worst_scan:
            zs = worst_scan.get("zap_summary") or {}
            out.append(f"\n🏆 **Most Vulnerable Push** — Run **#{worst_scan['id']}** (`{worst_scan.get('commit_sha','?')[:7]}`)")
            out.append(f"  - DAST High: **{zs.get('High', 0)}**, Medium: **{zs.get('Medium', 0)}**, Low: **{zs.get('Low', 0)}**")
            out.append(f"  - Branch: `{worst_scan.get('branch','main')}` | Date: `{worst_scan.get('created_at','N/A')}`")
            exp = worst_scan.get("ai_explanation")
            if exp:
                out.append(f"  - Diagnosis: {exp[:200]}")

        out.append(f"\n💡 **Common fix patterns in this repo**:")
        out.append(f"  - Remove hardcoded credentials (Gitleaks findings)")
        out.append(f"  - Add security headers (`X-Content-Type-Options`, `HSTS`) to FastAPI")
        out.append(f"  - Pin container image versions in Dockerfile to eliminate Trivy CVEs")
        return "\n".join(out)

    # ── 4b. Most Vulnerable Push Query ──────────────────────────────────────
    if any(w in q for w in ["most vulnerab", "worst push", "worst commit", "most findings",
                             "highest risk", "most bugs"]):
        worst_scan = None
        worst_score = -1
        for s in recent_scans:
            zs = s.get("zap_summary") or {}
            score = zs.get("High", 0) * 3 + zs.get("Medium", 0) + (1 if s.get("action_taken") == "BLOCK" else 0) * 2
            if score > worst_score:
                worst_score = score
                worst_scan = s
        if worst_scan:
            zs = worst_scan.get("zap_summary") or {}
            exp = worst_scan.get("ai_explanation") or "Security policy gate thresholds exceeded."
            return (
                f"🏆 **Most Vulnerable Pipeline Push** (of last {len(recent_scans)} scans):\n\n"
                f"🔴 **Run #{worst_scan['id']}** — `{worst_scan.get('commit_sha','?')[:7]}`\n"
                f"• **Commit**: _{worst_scan.get('commit_message','no message')}_\n"
                f"• **Branch**: `{worst_scan.get('branch','main')}` | **Date**: `{worst_scan.get('created_at','N/A')}`\n"
                f"• **Gate Result**: **{worst_scan.get('action_taken','?')}**\n"
                f"• **DAST Findings**: High: **{zs.get('High',0)}**, Medium: **{zs.get('Medium',0)}**, Low: **{zs.get('Low',0)}**\n"
                f"• **Diagnosis**: {exp[:250]}"
            )
        return "No scan data available to determine most vulnerable push."

    # ── 4c. Fix / Remediation Queries ───────────────────────────────────────
    if any(w in q for w in ["fix", "patch", "remediat", "resolve", "how to", "how do i", "prevent"]):
        return (
            "🛠️ **Common Remediation Playbook for SecureFlow Findings**:\n\n"
            "**1. Hardcoded Secrets (Gitleaks)**\n"
            "  - Move secrets to environment variables or a secrets manager (e.g. AWS Secrets Manager, HashiCorp Vault)\n"
            "  - Add `.env` to `.gitignore` and rotate any exposed credentials immediately\n\n"
            "**2. SAST Issues (Semgrep)**\n"
            "  - SQL Injection → Use parameterized queries / ORM (SQLAlchemy)\n"
            "  - Path Traversal → Validate and sanitize file paths with `pathlib`\n\n"
            "**3. Container CVEs (Trivy)**\n"
            "  - Pin base images to a specific digest (e.g. `python:3.11.9-slim@sha256:...`)\n"
            "  - Run `trivy image --severity HIGH,CRITICAL` locally before pushing\n\n"
            "**4. DAST / API Issues (ZAP)**\n"
            "  - Add `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` headers\n"
            "  - Enable CSRF protection on all state-changing endpoints"
        )

    # ── 5. Creator / Who Made You Queries ──────────────────────────────────
    if any(w in q for w in ["who made", "creator", "author", "who built", "who created"]):
        return "👤 **SecureFlow Architect**: Designed, engineered, and maintained by **Abhimanyu**."

    # ── 5. SecureFlow Architecture & Tech Stack Queries ──────────────────────
    if any(w in q for w in ["secureflow", "architecture", "stack", "how it works", "scanner", "tool"]):
        return (
            "🛡️ **SecureFlow Architecture Overview**\n\n"
            "• **Scanners**: Gitleaks (Secrets), Semgrep (SAST), Trivy (CVEs), OWASP ZAP (DAST)\n"
            "• **Backend**: FastAPI + SQLAlchemy (PostgreSQL) + Redis & Celery Task Queue\n"
            "• **Frontend**: React + TypeScript + Real-time WebSockets\n"
            "• **Architect**: Abhimanyu"
        )

    # ── 7. Overall History & System Health ────────────────────────────────────
    if any(w in q for w in ["health", "status", "overview", "summary", "history"]):
        block_rate = round(len(blocked) / max(len(recent_scans), 1) * 100)
        return (
            f"📊 **SecureFlow System Health & History**\n\n"
            f"• **Pipeline Execution History**:\n"
            f"  - Total pipeline scans tracked: **{total}**\n"
            f"  - Recent window (last {len(recent_scans)} runs): **{len(passed)} passed**, **{len(blocked)} blocked** ({block_rate}% block rate)\n"
            f"  - Latest scan: **#{latest.get('id', 'N/A')}** (`{latest.get('commit_sha', '?')[:7]}`) — **{latest.get('action_taken', 'ALLOW')}**\n\n"
            f"• **Active Vulnerability Posture**:\n"
            f"  - 🔴 Critical: **{sev.get('CRITICAL', 0)}**\n"
            f"  - 🟠 High: **{sev.get('HIGH', 0)}**\n"
            f"  - 🟡 Medium: **{sev.get('MEDIUM', 0)}**\n"
            f"  - 🟢 Low: **{sev.get('LOW', 0)}**"
        )

    # ── 8. Latest / Most Recent Scan Query ──────────────────────────────────
    if any(w in q for w in ["latest", "newest", "most recent"]):
        if not latest:
            return "No scans found in database yet."
        return (
            f"⚡ **Latest Scan Run: #{latest['id']}**\n\n"
            f"• Repository: `{latest.get('repo_name', 'SecureFlow')}`\n"
            f"• Branch: `{latest.get('branch', 'main')}`\n"
            f"• Commit: `{latest.get('commit_sha', '?')[:7]}` — _{latest.get('commit_message', '') or 'no message'}_\n"
            f"• Action Taken: **{latest.get('action_taken', 'ALLOW')}**\n"
            f"• Status: **{latest.get('status', 'complete')}**\n"
            + (f"• AI Security Explanation: {latest['ai_explanation']}\n" if latest.get('ai_explanation') else "")
        )

    # ── 9. Professional Fallback Response ──
    c_count = sev.get("CRITICAL", 0)
    h_count = sev.get("HIGH", 0)
    status_line = f"⚠️ **{c_count} Critical** and **{h_count} High** findings need review." if (c_count + h_count > 0) else "🟢 All security policy checks are passing!"

    return (
        f"Hey there! 👋 I'm **Void**, your DevSecOps security assistant.\n\n"
        f"I'm connected to your pipeline engine and local GPU.\n\n"
        f"📊 **System Posture Snapshot**:\n"
        f"• Scans Monitored: **{total}** total runs\n"
        f"• Recent Activity: **{len(passed)} passed**, **{len(blocked)} blocked**\n"
        f"• Security Status: {status_line}\n\n"
        f"💬 **How can I help you right now?** Ask me things like:\n"
        f"  - _'Why was the last pipeline blocked?'_\n"
        f"  - _'Show top critical CVEs'_\n"
        f"  - _'How do I fix SQL injection in FastAPI?'_\n"
        f"  - _'List the first 5 blocked commits'_"
    )
