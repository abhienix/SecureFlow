import os

BLOCK_SEVERITIES = ["CRITICAL", "HIGH"]
CVSS_THRESHOLD = float(os.getenv("CVSS_THRESHOLD", "7.0"))

def evaluate_severity(findings: dict) -> dict:
    vulnerabilities = findings.get("Results", [])
    
    critical_found = []
    
    for result in vulnerabilities:
        vulns = result.get("Vulnerabilities", [])
        if not vulns:
            continue
        for vuln in vulns:
            severity = vuln.get("Severity", "").upper()
            cvss = vuln.get("CVSS", {})
            score = 0.0
            
            if isinstance(cvss, dict):
                for source in cvss.values():
                    score = max(score, source.get("V3Score", 0.0))
            
            if severity in BLOCK_SEVERITIES or score >= CVSS_THRESHOLD:
                critical_found.append({
                    "id": vuln.get("VulnerabilityID"),
                    "package": vuln.get("PkgName"),
                    "severity": severity,
                    "score": score,
                    "fix": vuln.get("FixedVersion", "no fix available"),
                    "description": vuln.get("Description", "")[:200]
                })
    
    if critical_found:
        return {
            "action": "BLOCK",
            "reason": f"{len(critical_found)} critical/high vulnerabilities found",
            "vulnerabilities": critical_found
        }
    
    return {
        "action": "ALLOW",
        "reason": "no critical vulnerabilities found",
        "vulnerabilities": []
    }