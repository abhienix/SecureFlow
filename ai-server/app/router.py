"""
SecureFlow AI Server — Multi-Model LLM Task Router

Dynamically dispatches incoming security requests between 2 dedicated LLMs:
1. Security Reasoning & Copilot Model: qwen2.5:3b (Pipeline audit, CVE reasoning, history)
2. Code Patch & Remediation Model: deepseek-coder:6.7b / qwen2.5:3b (Code fixes, SAST remediation, Dockerfile hardening)
"""

import re
import os
import logging

logger = logging.getLogger("secureflow.llm_router")

MODEL_SECURITY_COPILOT = os.getenv("MODEL_SECURITY_COPILOT", "qwen2.5:3b")
MODEL_CODE_REMEDIATION = os.getenv("MODEL_CODE_REMEDIATION", "qwen2.5:3b")  # Fallback to qwen2.5:3b or deepseek-coder:6.7b


class TaskLLMRouter:
    INTENT_PATTERNS = {
        "CODE_REMEDIATION": [
            r'\b(fix|patch|remediate|refactor|sanitize|harden|resolve|unblock|mitigate)\b',
            r'\b(code patch|security fix|cwe fix|parameterized query|escape html|patch cve)\b',
            r'```[a-z]*'
        ],
        "CODE_GENERATION": [
            r'\b(generate|create|write|build|construct|make|script)\b.*\b(code|script|dockerfile|yaml|terraform|function|class|api|handler)\b'
        ],
        "PIPELINE_FAILURE": [
            r'\b(why|reason|cause|failed|blocked|failing|blocking)\b.*\b(run|pipeline|build|commit|deploy|scan)\b',
            r'\bwhy was\b', r'\bwhy did\b'
        ],
        "PIPELINE_STATUS": [
            r'\b(status|posture|health|progress|state|latest|recent|history|list|count)\b.*\b(pipeline|run|scan|commit|build)\b',
            r'\b(first|last|recent|ordinal)\s+(\d+st|\d+nd|\d+rd|\d+th|\d+|commits?|scans?)\b'
        ],
        "SCAN_RESULTS": [
            r'\b(findings?|results?|reports?|vulnerabilities|secrets?|cves?|alerts?)\b.*\b(gitleaks|semgrep|trivy|zap|owasp)\b'
        ],
        "CVE_LOOKUP": [
            r'\b(cve-\d{4}-\d{4,7})\b', r'\bcve\b.*\b(severity|score|cvss|details?|lookup)\b'
        ],
        "VULNERABILITY_LOOKUP": [
            r'\b(cwe-\d+)\b', r'\b(sqli|xss|csrf|rce|ssrf|idor|path traversal|buffer overflow)\b'
        ],
        "SECURITY_QA": [
            r'\b(what is|explain|difference between|how does|overview|concept|best practices)\b.*\b(sast|dast|sca|iam|waf|soc|mitre|owasp|cvss|encryption|tls|jwt)\b',
            r'\b(sast|dast|sca|zero trust|defense in depth|least privilege)\b'
        ],
        "DEVOPS": [
            r'\b(github actions|jenkins|gitlab|argocd|helm|terraform|docker|kubernetes|k8s|ci/cd|pipeline)\b'
        ],
        "LINUX": [
            r'\b(linux|bash|shell|permissions|chmod|chown|systemd|process|cron|iptables|grep|sed|awk)\b'
        ],
        "NETWORKING": [
            r'\b(tcp|ip|dns|http|https|proxy|reverse proxy|nginx|apache|haproxy|firewall|subnet|route)\b'
        ],
        "CLOUD": [
            r'\b(gcp|aws|azure|cloud run|s3|ec2|iam|cloudtrail|kms|vpc|ingress|egress)\b'
        ],
        "PROGRAMMING": [
            r'\b(python|javascript|typescript|golang|go|java|c#|c\+\+|rust|php|ruby|sql|react|fastapi)\b'
        ],
        "OUT_OF_SCOPE": [
            r'\b(weather|recipe|cook|bake|sports|football|cricket|basketball|movie|actor|song|sing|joke|capital of|president of|horoscope|vacation|relationship advice)\b'
        ]
    }

    @staticmethod
    def classify_intent(prompt: str) -> str:
        """Determines the semantic intent category of the prompt."""
        p_lower = prompt.lower().strip()
        for intent, patterns in TaskLLMRouter.INTENT_PATTERNS.items():
            for pat in patterns:
                if re.search(pat, p_lower):
                    return intent
        return "GENERAL_TECH"

    @staticmethod
    def select_model(prompt: str) -> dict:
        """
        Analyzes prompt intent and selects the optimal specialized LLM.
        Returns dict with model_name, task_type, semantic_intent, and reason.
        """
        intent = TaskLLMRouter.classify_intent(prompt)
        p_lower = prompt.lower()
        is_code_task = intent in ("CODE_REMEDIATION", "CODE_GENERATION") or bool(re.search(r'```[a-z]*', p_lower))

        if is_code_task:
            selected_model = MODEL_CODE_REMEDIATION
            task_type = "CODE_REMEDIATION"
            reason = f"Semantic Intent classified as '{intent}' — dispatched to Code LLM"
        else:
            selected_model = MODEL_SECURITY_COPILOT
            task_type = "SECURITY_COPILOT"
            reason = f"Semantic Intent classified as '{intent}' — dispatched to Security LLM"

        logger.info(f"[llm_router] Prompt Intent: {intent} -> Model: {selected_model}")
        return {
            "model_name": selected_model,
            "task_type": task_type,
            "semantic_intent": intent,
            "reason": reason
        }
