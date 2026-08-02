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
    @staticmethod
    def select_model(prompt: str) -> dict:
        """
        Analyzes prompt intent and selects the optimal specialized LLM.
        Returns dict with model_name, task_type, and reason.
        """
        p_lower = prompt.lower()

        # Keywords indicating code patch synthesis or Docker/code refactoring
        code_patch_keywords = [
            "code patch", "fix vulnerability", "remediate", "dockerfile", "patch snippet",
            "fix sql injection", "refactor", "sanitize input", "parameterized query",
            "suppression rule", "cwe fix", "owasp remediation", "diff"
        ]

        is_code_task = any(kw in p_lower for kw in code_patch_keywords) or bool(re.search(r'```[a-z]*', p_lower))

        if is_code_task:
            logger.info(f"[llm_router] Routing to Code Remediation Model: {MODEL_CODE_REMEDIATION}")
            return {
                "model_name": MODEL_CODE_REMEDIATION,
                "task_type": "CODE_REMEDIATION",
                "reason": "Task detected as code patch synthesis / refactoring"
            }
        else:
            logger.info(f"[llm_router] Routing to Security Copilot Model: {MODEL_SECURITY_COPILOT}")
            return {
                "model_name": MODEL_SECURITY_COPILOT,
                "task_type": "SECURITY_COPILOT",
                "reason": "Task detected as pipeline audit or security reasoning"
            }
