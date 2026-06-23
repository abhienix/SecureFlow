"""
Slack notifier for SecureFlow.

Sends a Slack message whenever a scan result comes in — but only when
policy.yaml says we should.

How it works, in plain steps:
1. Read the "notifications" section from policy.yaml (slack on/off,
   on_block on/off, on_allow on/off).
2. Look at the action this scan ended with (ALLOW or BLOCK).
3. If policy.yaml says skip this kind of result, do nothing.
4. Otherwise, build the message and post it to the Slack webhook.
"""

import requests
import os
from dotenv import load_dotenv

from policy_engine import load_policy_file

load_dotenv()

SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL")


def _notifications_allow(action: str) -> bool:
    """
    Check policy.yaml's "notifications" block to see if this action
    (ALLOW or BLOCK) should trigger a Slack message.

    If anything goes wrong reading the file, default to "yes, notify" —
    we'd rather get one extra Slack message than silently miss a real
    BLOCK because policy.yaml had a typo.
    """
    try:
        policy = load_policy_file()
    except Exception as e:
        print(f"could not read policy.yaml for notification settings, defaulting to notify: {e}")
        return True

    notif = policy.get("notifications", {})

    if not notif.get("slack", True):
        return False

    if action == "BLOCK":
        return notif.get("on_block", True)

    if action == "ALLOW":
        return notif.get("on_allow", True)

    # Any other action value (shouldn't normally happen) — notify by default.
    return True


def send_slack_alert(scan_data: dict, ai_results: list, action: str, reason: str):
    if not SLACK_WEBHOOK_URL:
        print("no SLACK_WEBHOOK_URL set, skipping notification")
        return

    if not _notifications_allow(action):
        print(f"policy.yaml notifications settings say skip Slack for action={action}")
        return

    emoji = "\U0001F6A8" if action == "BLOCK" else "\u2705"

    vuln_blocks = []
    for ai in ai_results:
        vuln_blocks.append(
            f"*{ai.get('cve_id', 'unknown')}* in `{ai.get('package', 'unknown')}`\n"
            f"_{ai.get('explanation', 'no explanation')}_\n"
            f"*Fix:* {ai.get('fix', 'no fix suggested')}\n"
            f"*Risk Score:* {ai.get('risk_score', 'N/A')}/10"
        )

    # Code-scan blocks (Gitleaks/Semgrep) don't have per-CVE ai_results —
    # they have a single explanation/fix instead. Fall back to that so
    # those blocks still produce a readable message instead of an empty one.
    if not vuln_blocks and (scan_data.get("ai_explanation") or reason):
        vuln_blocks.append(
            f"_{scan_data.get('ai_explanation', reason)}_\n"
            f"*Fix:* {scan_data.get('ai_fix', 'see pipeline logs for details')}"
        )

    message_text = (
        f"{emoji} *Deployment {action}*\n"
        f"Repo: `{scan_data.get('repo_name', 'unknown')}` | "
        f"Branch: `{scan_data.get('branch', 'unknown')}` | "
        f"Commit: `{scan_data.get('commit_sha', 'unknown')[:8]}`\n"
        f"Reason: {reason}\n\n"
        + "\n\n".join(vuln_blocks)
    )

    try:
        response = requests.post(SLACK_WEBHOOK_URL, json={"text": message_text}, timeout=10)
        print(f"slack notification sent, status: {response.status_code}")
    except Exception as e:
        print(f"slack notification failed: {e}")