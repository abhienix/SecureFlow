"""
SecureFlow AI Server — Security Guardrails & Safety Engine

Enforces security domain boundaries, redacts secret tokens,
and blocks prompt injection attempts.
"""

import re
import logging

logger = logging.getLogger("secureflow.guardrails")

OFF_TOPIC_TERMS = [
    "weather", "recipe", "cook", "bake", "sports", "football", "cricket", "basketball",
    "movie", "actor", "song", "sing", "joke", "capital of", "who is the president",
    "president of", "tell me a story", "horoscope", "car", "travel", "food"
]

SECRET_PATTERNS = [
    r'ghp_[A-Za-z0-9_]{36}',                 # GitHub Personal Access Token
    r'glpat-[A-Za-z0-9\-]{20}',              # GitLab Personal Access Token
    r'aws_secret_access_key\s*=\s*[^\s]+',   # AWS Secret Key
    r'eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+', # JWT Token
    r'xox[baprs]-[0-9a-zA-Z]{10,48}',        # Slack Token
]


class GuardrailsEngine:
    @staticmethod
    def inspect_input(message: str) -> dict:
        """
        Validates incoming user prompt against safety rules and domain boundaries.
        Returns dict with is_valid boolean and reason.
        """
        msg_lower = message.lower().strip()

        # 1. Check Off-Topic Guardrail (Exact word boundaries to prevent false positives on 'cookie', 'parsing', etc.)
        if any(re.search(r'\b' + re.escape(term) + r'\b', msg_lower) for term in OFF_TOPIC_TERMS):
            return {
                "is_valid": False,
                "reason": "OFF_TOPIC",
                "blocked_response": (
                    "🔒 **Security Boundary**: I am Void, your SecureFlow security companion. "
                    "I can only assist with DevSecOps pipelines, security scans, vulnerability remediation, "
                    "and codebase safety. How can I help with your security posture today?"
                )
            }

        # 2. Check Prompt Injection Guardrail
        injection_keywords = ["ignore previous instructions", "system prompt", "you are now DAN", "bypass rules"]
        if any(kw in msg_lower for kw in injection_keywords):
            logger.warning(f"[guardrails] Blocked potential prompt injection: {message[:50]}...")
            return {
                "is_valid": False,
                "reason": "PROMPT_INJECTION",
                "blocked_response": "🛡️ **Guardrail Triggered**: Prompt injection or system instruction bypass attempt detected."
            }

        return {"is_valid": True, "reason": None}

    @staticmethod
    def sanitize_output(output_text: str) -> str:
        """
        Redacts any sensitive tokens or secrets before returning response to client.
        """
        sanitized = output_text
        for pattern in SECRET_PATTERNS:
            sanitized = re.sub(pattern, '[REDACTED_SECRET]', sanitized)
        return sanitized
