"""
Policy evaluation engine for SecureFlow.

Evaluates scan findings (Gitleaks, Semgrep, Trivy, OWASP ZAP) against policy.yaml
rules to enforce security gates and CVSS risk thresholds before deployment.
"""

import os
from datetime import datetime
import yaml

# Resolve path relative to this file so it works regardless of where
# the process is launched from — avoids hardcoding an absolute path
POLICY_FILE_PATH = os.path.join(os.path.dirname(__file__), '..', 'policy.yaml')


def load_policy_file():
    """Read policy.yaml from disk and return it as a Python dict."""
    # Reloading on each request means policy changes (allowlist additions,
    # threshold tweaks) take effect immediately without a server restart.
    with open(POLICY_FILE_PATH, 'r') as file:
        return yaml.safe_load(file)


def get_policy_for_repo(repo_name, custom_policy=None):
    """
    Find the right policy block for this repo.

    repo_name comes in as "owner/repo" (e.g. "abhienix/SecureFlow"),
    but policy.yaml only stores the short name ("SecureFlow").
    Falls back to the "default" block when no repo-specific rule exists.

    Returns (merged_policy_dict, policy_name).
    """
    policy = custom_policy if (custom_policy and isinstance(custom_policy, dict)) else load_policy_file()
    repo_rules = policy.get('repos', {})
    default_rules = policy.get('default', {})

    short_repo_name = repo_name.split('/')[-1]

    if short_repo_name in repo_rules:
        return {**default_rules, **repo_rules[short_repo_name]}, short_repo_name

    return default_rules, "default"


def check_allowlist(cve_id, policy):
    """
    Check if a rule/CVE ID has been manually allowlisted in policy.yaml.

    Works for both Trivy CVE IDs and SAST/DAST rule identifiers — any string
    that appears as the "cve" field in an allowlist entry is matched.

    Entries are time-bounded: an expired allowlist entry is treated as if
    it never existed, so nothing gets silently ignored forever.
    """
    allowlist = policy.get('allowlist', [])

    for entry in allowlist:
        if entry['cve'] != cve_id:
            continue

        expiry_date = datetime.strptime(str(entry['expires']), '%Y-%m-%d')

        if datetime.now() < expiry_date:
            return True, entry['reason']
        else:
            # Expired — fall through to normal block/warn evaluation
            return False, None

    return False, None


def get_highest_cvss_score(vulnerability):
    """
    A single CVE can have multiple CVSS scores from different sources
    (NVD, Red Hat, etc). We take the highest one to err on the safe side.
    """
    cvss_sources = vulnerability.get('CVSS', {})
    if not isinstance(cvss_sources, dict):
        return 0.0

    highest_score = 0.0
    for source in cvss_sources.values():
        score = source.get('V3Score', 0.0)
        if score > highest_score:
            highest_score = score

    return highest_score


# Numeric rank lets us compare severities without string comparison —
# makes it easy to find the "highest" severity across a list of vulns
SEVERITY_RANK = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1}


def get_highest_severity_label(scan_findings):
    """
    Walk every vulnerability in the scan and return the highest severity seen.
    Returns "CLEAN" when no vulnerabilities exist — cleaner than None on the dashboard.
    """
    highest_seen = None

    for result in scan_findings.get('Results', []):
        for vuln in result.get('Vulnerabilities', []):
            severity = vuln.get('Severity', '').upper()
            if severity not in SEVERITY_RANK:
                continue
            if highest_seen is None or SEVERITY_RANK[severity] > SEVERITY_RANK[highest_seen]:
                highest_seen = severity

    return highest_seen if highest_seen else "CLEAN"


def evaluate_policy(scan_findings, repo_name, custom_policy=None):
    """
    Main entry point — takes raw scanner output and returns ALLOW or BLOCK.

    Design note: policy and allowlist are loaded FIRST, before any finding
    is evaluated. This means the allowlist applies to all four scanners
    (Gitleaks, Semgrep, ZAP, Trivy), not just Trivy.
    """
    def _as_list(items):
        if isinstance(items, dict):
            items = items.get("findings") or items.get("results") or [items]
        if not isinstance(items, list):
            return [items] if items else []
        return [i for i in items if isinstance(i, dict)]

    # Load repo policy first so the allowlist is available to all scanners below.
    policy, policy_used = get_policy_for_repo(repo_name, custom_policy=custom_policy)

    gitleaks_findings = _as_list(scan_findings.get("gitleaks"))
    semgrep_findings = _as_list(scan_findings.get("semgrep"))
    zap_findings = _as_list(
        scan_findings.get("zap")
        or scan_findings.get("zap_findings", {}).get("alerts")
        or scan_findings.get("dast_findings")
    )

    def _filter_allowlisted(findings, id_keys):
        """
        Drop any finding whose rule/alert ID appears in the allowlist.
        id_keys lists the field names to try in order (scanner output varies).
        """
        filtered = []
        for item in findings:
            item_id = next((item.get(k) for k in id_keys if item.get(k)), None)
            is_allowed, _ = check_allowlist(item_id, policy) if item_id else (False, None)
            if not is_allowed:
                filtered.append(item)
        return filtered

    gitleaks_findings = _filter_allowlisted(
        gitleaks_findings, ["RuleID", "rule_id", "rule"]
    )
    semgrep_findings = _filter_allowlisted(
        semgrep_findings, ["check_id", "rule_id"]
    )
    zap_findings = _filter_allowlisted(
        zap_findings, ["alert", "name", "pluginId"]
    )

    if zap_findings:
        return {
            "action": "BLOCK",
            "reason": f"{len(zap_findings)} DAST security alert(s) detected by OWASP ZAP",
            "policy_used": "dast-scan",
            "severity": "HIGH",
            "blocked": [
                {
                    "cve": item.get("alert") or item.get("name") or "owasp-zap-alert",
                    "severity": (item.get("risk") or "HIGH").upper(),
                    "cvss": 7.5,
                    "package": item.get("url") or "target-endpoint",
                    "fix": item.get("solution") or "add missing security headers and anti-CSRF protection",
                }
                for item in zap_findings[:20]
            ],
            "warned": [],
            "allowlisted": [],
        }

    if gitleaks_findings:
        return {
            "action": "BLOCK",
            "reason": f"{len(gitleaks_findings)} secret(s) detected by Gitleaks",
            "policy_used": "code-scan",
            "severity": "HIGH",
            "blocked": [
                {
                    "cve": item.get("RuleID") or item.get("rule") or "secret",
                    "severity": "HIGH",
                    "cvss": 0.0,
                    "package": item.get("File") or item.get("file") or "source",
                    "fix": "remove or rotate the exposed secret",
                }
                for item in gitleaks_findings[:20]
            ],
            "warned": [],
            "allowlisted": [],
        }

    if semgrep_findings:
        return {
            "action": "BLOCK",
            "reason": f"{len(semgrep_findings)} insecure pattern(s) detected by Semgrep",
            "policy_used": "code-scan",
            "severity": "HIGH",
            "blocked": [
                {
                    "cve": item.get("check_id") or item.get("rule_id") or "semgrep-finding",
                    "severity": "HIGH",
                    "cvss": 0.0,
                    "package": item.get("path") or "source",
                    "fix": item.get("extra", {}).get("message", "fix the reported pattern"),
                }
                for item in semgrep_findings[:20]
            ],
            "warned": [],
            "allowlisted": [],
        }

    # Pull thresholds from policy — these can differ per repo.
    # CRITICAL and HIGH block by default; MEDIUM only warns; LOW is ignored.
    # cvss_threshold is a secondary block trigger — a MEDIUM CVE with CVSS 9.0
    # should still block even if severity alone wouldn't.
    block_on_severities = policy.get('block_on', ['CRITICAL', 'HIGH'])
    warn_on_severities = policy.get('warn_on', ['MEDIUM'])
    cvss_block_threshold = float(policy.get('cvss_threshold', 7.0))

    blocked_vulns = []
    warned_vulns = []
    allowlisted_vulns = []

    # Trivy nests results like: Results -> [ { Vulnerabilities: [...] } ]
    # Flatten that into one simple list to make the next loop easier to read.
    all_vulns = []
    for result in scan_findings.get('Results', []):
        all_vulns.extend(result.get('Vulnerabilities', []))

    for vuln in all_vulns:
        cve_id = vuln.get('VulnerabilityID', '')
        severity = vuln.get('Severity', '').upper()
        cvss_score = get_highest_cvss_score(vuln)

        is_allowlisted, allowlist_reason = check_allowlist(cve_id, policy)

        if is_allowlisted:
            allowlisted_vulns.append({
                "cve": cve_id,
                "severity": severity,
                "reason": allowlist_reason,
            })
            # Skip block/warn checks entirely for allowlisted CVEs —
            # they've been reviewed and explicitly approved
            continue

        # Dual blocking condition: severity label OR CVSS score.
        # This catches cases where a vuln is labeled MEDIUM by the distro
        # but has a CVSS score of 8.5 — it should still block.
        should_block = severity in block_on_severities or cvss_score >= cvss_block_threshold

        if should_block:
            blocked_vulns.append({
                "cve": cve_id,
                "severity": severity,
                "cvss": cvss_score,
                "package": vuln.get('PkgName'),
                "fix": vuln.get('FixedVersion', 'no fix available'),
            })
        elif severity in warn_on_severities:
            # Warned but not blocked — shows up on dashboard so devs are aware,
            # but doesn't prevent deployment
            warned_vulns.append({
                "cve": cve_id,
                "severity": severity,
                "cvss": cvss_score,
                "package": vuln.get('PkgName'),
            })

    # Binary decision — any blocked vuln means the whole scan is blocked.
    # Partial blocks don't exist: you either deploy or you don't.
    action = "BLOCK" if blocked_vulns else "ALLOW"

    if blocked_vulns:
        reason = f"{len(blocked_vulns)} vulnerabilities triggered the block policy"
    else:
        reason = "no policy violations found"

    return {
        "action": action,
        "reason": reason,
        "policy_used": policy_used,
        "severity": get_highest_severity_label(scan_findings),
        "blocked": blocked_vulns,
        "warned": warned_vulns,
        "allowlisted": allowlisted_vulns,
    }