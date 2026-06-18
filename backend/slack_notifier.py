import requests
import os
from dotenv import load_dotenv

load_dotenv()

SLACK_WEBHOOK_URL = os.getenv("SLACK_WEBHOOK_URL")

def send_slack_alert(scan_data: dict, ai_results: list, action: str, reason: str):
    if not SLACK_WEBHOOK_URL:
        print("no SLACK_WEBHOOK_URL set, skipping notification")
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