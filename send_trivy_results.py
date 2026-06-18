import json
import requests

# Load real Trivy output
with open("trivy-results.json") as f:
    trivy_data = json.load(f)

payload = {
    "commit_sha": "real-trivy-scan-001",
    "repo_name": "SecureFlow",
    "branch": "main",
    "scan_type": "trivy",
    "severity": "MEDIUM",
    "findings": {
        "Results": trivy_data.get("Results", [])
    }
}

response = requests.post(
    "http://localhost:8000/api/scan-results",
    json=payload
)

print("Status:", response.status_code)
print("Response:", response.text[:500])