"""Deterministic Pipeline State Machine.

Every pipeline is treated as a finite state machine. Stages transition
through a strict, validated sequence: WAITING -> RUNNING -> {PASSED|FAILED|BLOCKED|SKIPPED|CANCELLED}.

The backend is the single source of truth for execution order.
The frontend ONLY renders what the backend reports.
"""

import enum
from datetime import datetime
from typing import Optional


class StageStatus(str, enum.Enum):
    WAITING = "WAITING"
    RUNNING = "RUNNING"
    PASSED = "PASSED"
    FAILED = "FAILED"
    BLOCKED = "BLOCKED"
    SKIPPED = "SKIPPED"
    CANCELLED = "CANCELLED"

    @classmethod
    def is_terminal(cls, status: str) -> bool:
        return status in (cls.PASSED.value, cls.FAILED.value, cls.BLOCKED.value, cls.SKIPPED.value, cls.CANCELLED.value)

    @classmethod
    def is_failure(cls, status: str) -> bool:
        return status in (cls.FAILED.value, cls.BLOCKED.value)

    @classmethod
    def normalize(cls, raw: Optional[str]) -> str:
        if not raw:
            return StageStatus.WAITING.value
        upper = raw.strip().upper()
        mapping = {
            "PASS": StageStatus.PASSED.value,
            "ALLOW": StageStatus.PASSED.value,
            "SCANNED": StageStatus.PASSED.value,
            "SUCCESS": StageStatus.PASSED.value,
            "COMPLETE": StageStatus.PASSED.value,
            "PASSED": StageStatus.PASSED.value,
            "FAIL": StageStatus.FAILED.value,
            "FAILED": StageStatus.FAILED.value,
            "BLOCK": StageStatus.BLOCKED.value,
            "BLOCKED": StageStatus.BLOCKED.value,
            "SKIP": StageStatus.SKIPPED.value,
            "SKIPPED": StageStatus.SKIPPED.value,
            "CANCEL": StageStatus.CANCELLED.value,
            "CANCELLED": StageStatus.CANCELLED.value,
            "CANCELED": StageStatus.CANCELLED.value,
            "RUN": StageStatus.RUNNING.value,
            "RUNNING": StageStatus.RUNNING.value,
            "QUEUED": StageStatus.RUNNING.value,
            "PENDING": StageStatus.WAITING.value,
            "WAITING": StageStatus.WAITING.value,
        }
        return mapping.get(upper, StageStatus.WAITING.value)


# Immutable stage order — this is the ONLY source of truth for sequence
STAGE_ORDER = [
    "checkout",
    "code_scan",
    "docker",
    "trivy",
    "policy",
    "deploy_staging",
    "zap",
    "zap_gate",
    "deploy_prod",
]

STAGE_DEFINITIONS = {
    "checkout":       {"label": "Checkout",        "icon": "GitBranch",   "deps": []},
    "code_scan":      {"label": "Code Scan",        "icon": "Shield",      "deps": ["checkout"]},
    "docker":         {"label": "Docker Build",     "icon": "Box",         "deps": ["checkout", "code_scan"]},
    "trivy":          {"label": "Trivy CVE",        "icon": "ScanSearch",  "deps": ["checkout", "code_scan", "docker"]},
    "policy":         {"label": "Policy Gate",      "icon": "Lock",        "deps": ["checkout", "code_scan", "docker", "trivy"]},
    "deploy_staging": {"label": "Deploy Staging",   "icon": "Server",      "deps": ["checkout", "code_scan", "docker", "trivy", "policy"]},
    "zap":            {"label": "OWASP ZAP",        "icon": "Bug",         "deps": ["checkout", "code_scan", "docker", "trivy", "policy", "deploy_staging"]},
    "zap_gate":       {"label": "ZAP Gate",         "icon": "ShieldCheck", "deps": ["checkout", "code_scan", "docker", "trivy", "policy", "deploy_staging", "zap"]},
    "deploy_prod":    {"label": "Deploy Prod",      "icon": "Rocket",      "deps": ["checkout", "code_scan", "docker", "trivy", "policy", "deploy_staging", "zap", "zap_gate"]},
}


def validate_stage_order(stage_key: str) -> bool:
    return stage_key in STAGE_ORDER


class PipelineStateMachine:
    """Validates and enforces stage transitions."""

    VALID_TRANSITIONS = {
        StageStatus.WAITING:  {StageStatus.RUNNING, StageStatus.SKIPPED, StageStatus.CANCELLED},
        StageStatus.RUNNING:  {StageStatus.PASSED, StageStatus.FAILED, StageStatus.BLOCKED, StageStatus.CANCELLED},
        StageStatus.PASSED:   set(),
        StageStatus.FAILED:   set(),
        StageStatus.BLOCKED:  set(),
        StageStatus.SKIPPED:  set(),
        StageStatus.CANCELLED: set(),
    }

    @staticmethod
    def can_transition(from_status: str, to_status: str) -> bool:
        from_enum = StageStatus(from_status)
        to_enum = StageStatus(to_status)
        return to_enum in PipelineStateMachine.VALID_TRANSITIONS.get(from_enum, set())

    @staticmethod
    def compute_stage_status(
        stage_key: str,
        raw_result: Optional[str],
        all_steps: dict,
        pipeline_status: Optional[str] = None,
        action_taken: Optional[str] = None,
    ) -> str:
        """Deterministically compute the correct status for a stage given all inputs."""
        normalized = StageStatus.normalize(raw_result)

        # Terminal overrides
        if normalized in (StageStatus.PASSED.value, StageStatus.FAILED.value, StageStatus.CANCELLED.value):
            return normalized

        if normalized == StageStatus.BLOCKED.value or (action_taken == "BLOCK" and normalized == StageStatus.WAITING.value):
            return StageStatus.BLOCKED.value

        if normalized == StageStatus.SKIPPED.value:
            return StageStatus.SKIPPED.value

        if normalized == StageStatus.RUNNING.value:
            return StageStatus.RUNNING.value

        # Compute from dependencies
        deps = STAGE_DEFINITIONS.get(stage_key, {}).get("deps", [])
        for dep_key in deps:
            dep_raw = all_steps.get(dep_key, {}) if isinstance(all_steps, dict) else {}
            if isinstance(dep_raw, dict):
                dep_result = StageStatus.normalize(dep_raw.get("result"))
            elif isinstance(dep_raw, str):
                dep_result = StageStatus.normalize(dep_raw)
            else:
                dep_result = StageStatus.WAITING.value

            if dep_result == StageStatus.FAILED.value:
                return StageStatus.SKIPPED.value
            if dep_result == StageStatus.BLOCKED.value:
                return StageStatus.SKIPPED.value
            if dep_result == StageStatus.WAITING.value:
                return StageStatus.WAITING.value
            if dep_result == StageStatus.RUNNING.value:
                return StageStatus.WAITING.value

        # All deps passed, stage not started yet
        if normalized == StageStatus.WAITING.value:
            if pipeline_status in ("complete", "timeout", "superseded"):
                return StageStatus.SKIPPED.value
            return StageStatus.WAITING.value

        return StageStatus.WAITING.value


# Standardized log template for each stage
def build_stage_log(stage_key: str, status: str, detail: str, findings: Optional[list] = None) -> str:
    lines = [
        f"=== STAGE: {STAGE_DEFINITIONS.get(stage_key, {}).get('label', stage_key)} ===",
        f"Status: {status}",
        f"Timestamp: {datetime.utcnow().isoformat()}Z",
        f"Detail: {detail}",
    ]
    if findings:
        lines.append(f"Findings: {len(findings)} item(s)")
        for f in findings[:5]:
            lines.append(f"  - {f}")
    return "\n".join(lines)
