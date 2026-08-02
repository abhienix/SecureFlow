import json


def parse_zap_report(report_path: str):
    """
    Parse ZAP JSON report into SecureFlow findings.
    """

    with open(report_path, "r") as f:
        report = json.load(f)

    findings = []

    sites = report.get("site", [])

    for site in sites:
        for alert in site.get("alerts", []):

            findings.append(
                {
                    "name": alert.get("name"),
                    "risk": alert.get("riskdesc"),
                    "confidence": alert.get("confidence"),
                    "description": alert.get("desc"),
                    "solution": alert.get("solution"),
                    "reference": alert.get("reference"),
                    "instances": len(alert.get("instances", [])),
                }
            )

    return findings
