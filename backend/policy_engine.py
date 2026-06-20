import yaml
import os
from datetime import datetime

POLICY_PATH = os.path.join(os.path.dirname(__file__), '..', 'policy.yaml')

def load_policy():
    with open(POLICY_PATH, 'r') as f:
        return yaml.safe_load(f)

def get_repo_policy(repo_name: str) -> dict:
    policy = load_policy()
    repos = policy.get('repos', {})
    short_name = repo_name.split('/')[-1]
    if short_name in repos:
        repo_policy = repos[short_name]
        default = policy.get('default', {})
        return {**default, **repo_policy}
    return policy.get('default', {})

def is_allowlisted(cve_id: str, repo_policy: dict) -> dict:
    allowlist = repo_policy.get('allowlist', [])
    for item in allowlist:
        if item['cve'] == cve_id:
            expires_str = str(item['expires'])
            expires = datetime.strptime(expires_str, '%Y-%m-%d')
            if datetime.now() < expires:
                return {
                    "allowlisted": True,
                    "reason": item['reason'],
                    "expires": item['expires']
                }
    return {"allowlisted": False}

def evaluate_policy(findings: dict, repo_name: str) -> dict:
    repo_policy = get_repo_policy(repo_name)
    block_on = repo_policy.get('block_on', ['CRITICAL', 'HIGH'])
    warn_on = repo_policy.get('warn_on', ['MEDIUM'])
    cvss_threshold = float(repo_policy.get('cvss_threshold', 7.0))

    blocked = []
    warned = []
    allowlisted = []

    vulnerabilities = []
    for result in findings.get('Results', []):
        for vuln in result.get('Vulnerabilities', []):
            vulnerabilities.append(vuln)

    for vuln in vulnerabilities:
        cve_id = vuln.get('VulnerabilityID', '')
        severity = vuln.get('Severity', '').upper()
        cvss = 0.0
        cvss_data = vuln.get('CVSS', {})
        if isinstance(cvss_data, dict):
            for source in cvss_data.values():
                cvss = max(cvss, source.get('V3Score', 0.0))

        allow_check = is_allowlisted(cve_id, repo_policy)
        if allow_check['allowlisted']:
            allowlisted.append({
                "cve": cve_id,
                "severity": severity,
                "reason": allow_check['reason'],
                "expires": allow_check['expires']
            })
            continue

        if severity in block_on or cvss >= cvss_threshold:
            blocked.append({
                "cve": cve_id,
                "severity": severity,
                "cvss": cvss,
                "package": vuln.get('PkgName'),
                "fix": vuln.get('FixedVersion', 'no fix available')
            })
        elif severity in warn_on:
            warned.append({
                "cve": cve_id,
                "severity": severity,
                "cvss": cvss,
                "package": vuln.get('PkgName')
            })

    action = "BLOCK" if blocked else "ALLOW"
    reason = f"{len(blocked)} vulnerabilities triggered block policy" if blocked else "no policy violations found"

    policy_used = repo_name.split('/')[-1] if repo_name.split('/')[-1] in load_policy().get('repos', {}) else "default"

    return {
        "action": action,
        "reason": reason,
        "policy_used": policy_used,
        "blocked": blocked,
        "warned": warned,
        "allowlisted": allowlisted
    }