"""
Policy engine for SecureFlow.

This file decides whether a Docker image scan should be ALLOWED or BLOCKED,
based on rules written in policy.yaml.

How it works, in plain steps:
1. Load policy.yaml (rules per repo, plus a fallback "default" rule).
2. Look at every vulnerability Trivy found.
3. Check each one against the rules: is it allowlisted? does its severity
   block? does its CVSS score cross the threshold?
4. If anything is blocked, the final action is BLOCK. Otherwise ALLOW.
"""

import os
from datetime import datetime
import yaml

# Resolve path relative to this file so it works regardless of where
# the process is launched from — avoids hardcoding an absolute path
POLICY_FILE_PATH = os.path.join(os.path.dirname(__file__), '..', 'policy.yaml')


def load_policy_file():
    """Read policy.yaml from disk and return it as a Python dict."""
    # We reload from disk on every request rather than caching at startup —
    # this means policy changes take effect immediately without restarting
    # the server, which matters when you need to quickly allowlist a CVE
    with open(POLICY_FILE_PATH, 'r') as file:
        return yaml.safe_load(file)


def get_policy_for_repo(repo_name):
    """
    Find the right policy block for this repo.

    repo_name usually comes in as "owner/repo" (e.g. "abhienix/SecureFlow"),
    but policy.yaml only lists the short repo name ("SecureFlow").
    So we strip the owner part before looking it up.

    If there's no specific rule for this repo, fall back to "default".
    """
    policy = load_policy_file()
    repo_rules = policy.get('repos', {})
    default_rules = policy.get('default', {})

    short_repo_name = repo_name.split('/')[-1]

    if short_repo_name in repo_rules:
        # Merge repo-specific rules on top of defaults using dict unpacking —
        # this way a repo only needs to override what's different, and inherits
        # everything else from default. Avoids duplicating the full policy per repo.
        return {**default_rules, **repo_rules[short_repo_name]}

    return default_rules


def check_allowlist(cve_id, policy):
    """
    Check if a specific CVE has been allowlisted (manually approved as
    "known, can't fix yet, ok to ignore for now") in policy.yaml.

    Each allowlist entry has an expiry date - once it expires, the CVE
    goes back to being treated normally. This stops old exceptions from
    being forgotten forever.
    """
    allowlist = policy.get('allowlist', [])

    for entry in allowlist:
        if entry['cve'] != cve_id:
            continue

        expiry_date = datetime.strptime(str(entry['expires']), '%Y-%m-%d')

        if datetime.now() < expiry_date:
            # Still within the approved window — treat as safe
            return True, entry['reason']
        else:
            # Allowlist entry expired — don't silently keep ignoring this CVE.
            # Returning False here means it goes back through normal block/warn logic.
            return False, None

    return False, None


def get_highest_cvss_score(vulnerability):
    """
    A single CVE can have multiple CVSS scores from different sources
    (NVD, Red Hat, etc). We just take the highest one to be safe.
    """
    cvss_sources = vulnerability.get('CVSS', {})
    if not isinstance(cvss_sources, dict):
        return 0.0

    highest_score = 0.0
    for source in cvss_sources.values():
        # V3Score is the CVSS v3 rating — we prefer v3 over v2 since it's
        # more accurate for modern vulnerability scoring
        score = source.get('V3Score', 0.0)
        if score > highest_score:
            highest_score = score

    return highest_score


# Numeric rank lets us compare severities without string comparison —
# makes it easy to find the "highest" severity across a list of vulns
SEVERITY_RANK = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1}


def get_highest_severity_label(scan_findings):
    """
    Looks at every vulnerability in the scan and returns the single most
    severe one found, as a clean label - e.g. "CRITICAL", "HIGH".

    If there are no vulnerabilities at all, returns "CLEAN" instead of
    "unknown" - a scan with nothing wrong should say so plainly.
    """
    highest_seen = None

    for result in scan_findings.get('Results', []):
        for vuln in result.get('Vulnerabilities', []):
            severity = vuln.get('Severity', '').upper()
            if severity not in SEVERITY_RANK:
                continue
            if highest_seen is None or SEVERITY_RANK[severity] > SEVERITY_RANK[highest_seen]:
                highest_seen = severity

    # "CLEAN" is more meaningful than "UNKNOWN" or None for the dashboard —
    # a scan with zero vulnerabilities should be immediately recognizable
    return highest_seen if highest_seen else "CLEAN"


def evaluate_policy(scan_findings, repo_name):
    """
    Main entry point. Takes Trivy's scan output and decides ALLOW or BLOCK.
    """
    gitleaks_findings = scan_findings.get("gitleaks") or []
    semgrep_findings = scan_findings.get("semgrep") or []

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

    policy = get_policy_for_repo(repo_name)

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

    # Record which policy was actually applied — useful for audit trails
    # and for understanding why two repos might get different decisions
    # on the same CVE
    short_repo_name = repo_name.split('/')[-1]
    all_repo_rules = load_policy_file().get('repos', {})
    policy_used = short_repo_name if short_repo_name in all_repo_rules else "default"

    return {
        "action": action,
        "reason": reason,
        "policy_used": policy_used,
        "severity": get_highest_severity_label(scan_findings),
        "blocked": blocked_vulns,
        "warned": warned_vulns,
        "allowlisted": allowlisted_vulns,
    }