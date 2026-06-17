import requests
import os
from dotenv import load_dotenv

load_dotenv()

def send_slack_alert(data, ai_results, action, reason):
    webhook_url = os.getenv("SLACK_WEBHOOK_URL")
    if not webhook_url:
        print("DEBUG: Slack Webhook URL is missing from .env!")
        return

    ai_text = ai_results[0].get("explanation", "No AI explanation.") if ai_results else "No AI analysis."
    payload = {
        "text": f"🚨 *SecureFlow Alert*\n*Repo:* {data.get('repo_name')}\n*Action:* {action}\n*Reason:* {reason}\n*AI Fix:* {ai_text[:200]}"
    }
    
    try:
        response = requests.post(webhook_url, json=payload)
        print(f"DEBUG: Slack API Response: {response.status_code}")
    except Exception as e:
        print(f"DEBUG: Slack Error: {e}")