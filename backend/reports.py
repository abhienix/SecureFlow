"""
Export API for SecureFlow enterprise pipeline and security reports.

Provides /api/v1/reports/pipeline/{scan_id}/json and
/api/v1/reports/pipeline/{scan_id}/pdf endpoints. Parses real scan findings
from all four security engines (Gitleaks, Semgrep, Trivy, OWASP ZAP), pipeline
step executions, and AI remediation patches.
"""

import io
import json
import logging
from datetime import datetime, timezone

import os

from fastapi import APIRouter, Depends, HTTPException, Query, Header
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

logger = logging.getLogger("secureflow.reports")

router = APIRouter(prefix="/api/v1/reports", tags=["reports"])

EXPORT_PASSWORD = os.getenv("EXPORT_PASSWORD", "xoxo")


def _verify_export_password(password: str = "", x_password: str = ""):
    """Verify that password equals 'xoxo' before allowing export downloads."""
    pwd = (password or x_password or "").strip().lower()
    if pwd != EXPORT_PASSWORD.lower():
        raise HTTPException(
            status_code=403,
            detail="Access Denied: Invalid export password. Enter password 'xoxo' to download report.",
        )


def _utc_iso(dt):
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


def _mask_secret(val: str) -> str:
    """Mask sensitive secret strings so reports can be shared safely."""
    if not val:
        return ""
    if len(val) <= 6:
        return "*" * len(val)
    return val[:3] + "*" * (len(val) - 6) + val[-3:]


async def _fetch_scan(scan_id: str, db: AsyncSession):
    """Load a ScanResult row from database by primary key, github_run_id, or fallback."""
    from models import ScanResult

    clean_id = str(scan_id).replace("run-", "").strip()

    # 1. Try integer primary key
    if clean_id.isdigit():
        stmt = select(ScanResult).where(ScanResult.id == int(clean_id))
        result = await db.execute(stmt)
        scan = result.scalar_one_or_none()
        if scan:
            return scan

    # 2. Try github_run_id string
    stmt = select(ScanResult).where(ScanResult.github_run_id == str(scan_id))
    result = await db.execute(stmt)
    scan = result.scalar_one_or_none()
    if scan:
        return scan

    # 3. Fallback: return most recent scan row
    stmt = select(ScanResult).order_by(ScanResult.id.desc()).limit(1)
    result = await db.execute(stmt)
    scan = result.scalar_one_or_none()

    if scan is None:
        raise HTTPException(status_code=404, detail="No scan records found in database")

    return scan


def _build_report_dict(scan) -> dict:
    """Parse real scan findings and pipeline steps into a detailed audit dict."""
    raw_findings = scan.findings if isinstance(scan.findings, dict) else {}
    pipeline_steps = scan.pipeline_steps if isinstance(scan.pipeline_steps, dict) else {}

    # ── 1. Parse Gitleaks Secret Findings ─────────────────────────────────────
    gitleaks_raw = raw_findings.get("gitleaks") or []
    if isinstance(gitleaks_raw, dict):
        gitleaks_raw = gitleaks_raw.get("findings") or gitleaks_raw.get("results") or [gitleaks_raw]
    if not isinstance(gitleaks_raw, list):
        gitleaks_raw = []

    parsed_gitleaks = []
    for item in gitleaks_raw:
        if not isinstance(item, dict):
            continue
        parsed_gitleaks.append({
            "rule_id": item.get("RuleID") or item.get("rule") or "Secret Finding",
            "description": item.get("Description") or "Hardcoded credential committed in source",
            "file": item.get("File") or item.get("file") or "source",
            "start_line": item.get("StartLine") or item.get("line") or 1,
            "end_line": item.get("EndLine") or item.get("line") or 1,
            "secret_masked": _mask_secret(item.get("Secret") or item.get("match") or ""),
            "author": item.get("Author") or "unknown",
            "commit": item.get("Commit") or (scan.commit_sha[:8] if scan.commit_sha else "HEAD"),
            "severity": "HIGH",
            "cvss_score": 8.5,
            "remediation": "Rotate exposed credential immediately and remove from commit history.",
        })

    # ── 2. Parse Semgrep SAST Code Scans ─────────────────────────────────────
    semgrep_raw = raw_findings.get("semgrep") or []
    if isinstance(semgrep_raw, dict):
        semgrep_raw = semgrep_raw.get("results") or semgrep_raw.get("findings") or [semgrep_raw]
    if not isinstance(semgrep_raw, list):
        semgrep_raw = []

    parsed_semgrep = []
    for item in semgrep_raw:
        if not isinstance(item, dict):
            continue
        extra = item.get("extra", {}) if isinstance(item.get("extra"), dict) else {}
        metadata = extra.get("metadata", {}) if isinstance(extra.get("metadata"), dict) else {}

        parsed_semgrep.append({
            "check_id": item.get("check_id") or item.get("rule_id") or "Semgrep Insecure Pattern",
            "file": item.get("path") or "source",
            "start_line": item.get("start", {}).get("line") or 1,
            "end_line": item.get("end", {}).get("line") or 1,
            "message": extra.get("message") or "Insecure code pattern detected by Semgrep",
            "lines_snippet": extra.get("lines") or "",
            "severity": (extra.get("severity") or "HIGH").upper(),
            "cvss_score": 7.5 if (extra.get("severity") or "").upper() in ("ERROR", "HIGH") else 5.0,
            "cwe": metadata.get("cwe") or "CWE-79 / CWE-89",
            "owasp": metadata.get("owasp") or "A03:2021-Injection",
            "remediation": extra.get("message") or "Refactor code to avoid dynamic input execution.",
        })

    # ── 3. Parse Trivy Container / Dependency Vulns ──────────────────────────
    trivy_raw = raw_findings.get("trivy") or {}
    trivy_results = trivy_raw.get("Results") if isinstance(trivy_raw, dict) else []
    if not isinstance(trivy_results, list):
        trivy_results = []

    parsed_trivy = []
    for res in trivy_results:
        if not isinstance(res, dict):
            continue
        target_name = res.get("Target") or "Container Image / Lockfile"
        vulns = res.get("Vulnerabilities") or []
        if not isinstance(vulns, list):
            continue
        for v in vulns:
            if not isinstance(v, dict):
                continue
            cvss_val = 7.0
            cvss_obj = v.get("CVSS", {})
            if isinstance(cvss_obj, dict):
                for s_data in cvss_obj.values():
                    if isinstance(s_data, dict) and s_data.get("V3Score"):
                        cvss_val = float(s_data["V3Score"])
                        break

            parsed_trivy.append({
                "cve_id": v.get("VulnerabilityID") or "CVE-UNKNOWN",
                "package_name": v.get("PkgName") or "package",
                "installed_version": v.get("InstalledVersion") or "current",
                "fixed_version": v.get("FixedVersion") or "upgrade available",
                "severity": (v.get("Severity") or "MEDIUM").upper(),
                "cvss_score": cvss_val,
                "target": target_name,
                "title": v.get("Title") or "Vulnerability in dependency package",
                "description": v.get("Description") or "",
                "primary_url": v.get("PrimaryURL") or "",
                "remediation": f"Upgrade {v.get('PkgName') or 'package'} to {v.get('FixedVersion') or 'latest patched version'}",
            })

    # ── 4. Parse OWASP ZAP DAST Security Alerts ──────────────────────────────
    zap_raw = (
        raw_findings.get("zap")
        or raw_findings.get("zap_findings")
        or raw_findings.get("dast_findings")
        or {}
    )
    zap_alerts = zap_raw.get("alerts") if isinstance(zap_raw, dict) else []
    if not isinstance(zap_alerts, list):
        zap_alerts = []

    parsed_zap = []
    for alert in zap_alerts:
        if not isinstance(alert, dict):
            continue
        parsed_zap.append({
            "plugin_id": alert.get("pluginId") or "ZAP-ALERT",
            "alert_name": alert.get("alert") or alert.get("name") or "Web Application Security Finding",
            "risk": (alert.get("risk") or "HIGH").upper(),
            "confidence": alert.get("confidence") or "High",
            "target_url": alert.get("url") or "Staging Endpoint",
            "parameter": alert.get("param") or "HTTP Header / Body",
            "attack": alert.get("attack") or "",
            "evidence": alert.get("evidence") or "",
            "solution": alert.get("solution") or "Configure security headers and validate input parameters.",
            "cwe_id": alert.get("cweid") or "CWE-693",
            "wasc_id": alert.get("wascid") or "",
        })

    # Combine all findings for high-level statistics
    total_findings_count = len(parsed_gitleaks) + len(parsed_semgrep) + len(parsed_trivy) + len(parsed_zap)

    critical_count = sum(1 for item in parsed_trivy if item["severity"] == "CRITICAL")
    high_count = (
        len(parsed_gitleaks) +
        sum(1 for item in parsed_semgrep if item["severity"] in ("HIGH", "ERROR")) +
        sum(1 for item in parsed_trivy if item["severity"] == "HIGH") +
        sum(1 for item in parsed_zap if item["risk"] in ("HIGH", "CRITICAL"))
    )
    medium_count = (
        sum(1 for item in parsed_semgrep if item["severity"] in ("MEDIUM", "WARNING")) +
        sum(1 for item in parsed_trivy if item["severity"] == "MEDIUM") +
        sum(1 for item in parsed_zap if item["risk"] == "MEDIUM")
    )
    low_count = (
        sum(1 for item in parsed_semgrep if item["severity"] in ("LOW", "INFO")) +
        sum(1 for item in parsed_trivy if item["severity"] in ("LOW", "UNKNOWN")) +
        sum(1 for item in parsed_zap if item["risk"] in ("LOW", "INFORMATIONAL"))
    )

    # ── Gate Status & Pass Label ──────────────────────────────────────────────
    action_taken = (scan.action_taken or "ALLOW").upper()
    is_blocked = action_taken == "BLOCK" or scan.status == "FAILED"
    gate_decision = "BLOCKED xoxo" if is_blocked else "PASSED xoxo"
    gate_color = "#EF4444" if is_blocked else "#10B981"

    # Standardized 9 pipeline steps breakdown
    stage_names = [
        ("checkout", "Code Checkout"),
        ("code_scan", "SAST & Secret Scan"),
        ("docker", "Docker Container Build"),
        ("trivy", "SCA Vulnerability Scan"),
        ("policy", "Policy Engine Gate"),
        ("deploy_staging", "Deploy to Staging"),
        ("zap", "OWASP ZAP DAST Scan"),
        ("zap_gate", "DAST Gate Check"),
        ("deploy_prod", "Deploy to Production"),
    ]

    formatted_pipeline_steps = []
    for key, label in stage_names:
        step_data = pipeline_steps.get(key, {})
        if not isinstance(step_data, dict):
            step_data = {}
        formatted_pipeline_steps.append({
            "stage_key": key,
            "label": label,
            "result": (step_data.get("result") or ("PASS" if not is_blocked else "SKIPPED")).upper(),
            "detail": step_data.get("detail") or "Completed execution",
        })

    return {
        "scan_id": str(scan.id),
        "gate_decision": gate_decision,
        "gate_color": gate_color,
        "action_taken": action_taken,
        "status": scan.status or "complete",
        "repo_name": scan.repo_name or "abhienix/SecureFlow",
        "branch": scan.branch or "main",
        "commit_sha": scan.commit_sha or "HEAD",
        "commit_message": scan.commit_message or "Commit update",
        "severity": scan.severity or "CLEAN",
        "risk_score": scan.risk_score or (85 if is_blocked else 12),
        "started_at": _utc_iso(scan.started_at),
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "summary": {
            "total_findings": total_findings_count,
            "critical": critical_count,
            "high": high_count,
            "medium": medium_count,
            "low": low_count,
            "gitleaks_count": len(parsed_gitleaks),
            "semgrep_count": len(parsed_semgrep),
            "trivy_count": len(parsed_trivy),
            "zap_count": len(parsed_zap),
        },
        "pipeline_execution_steps": formatted_pipeline_steps,
        "gitleaks_findings": parsed_gitleaks,
        "semgrep_findings": parsed_semgrep,
        "trivy_findings": parsed_trivy,
        "zap_findings": parsed_zap,
        "ai_remediation": {
            "ai_explanation": scan.ai_explanation or "All findings evaluated against policy rules.",
            "ai_fix": scan.ai_fix or "No code patch required. Repository complies with policy.yaml rules.",
        },
    }


async def _get_db():
    """Placeholder — replaced at app startup by main.py dependency override."""
    raise NotImplementedError("Dependency override not applied")


@router.get("/pipeline/{scan_id}/json")
async def export_pipeline_json(
    scan_id: str,
    password: str = Query("", alias="password"),
    x_export_password: str = Header("", alias="X-Export-Password"),
    db: AsyncSession = Depends(_get_db),
):
    """
    Download a complete pipeline audit report as detailed structured JSON.
    Requires password 'xoxo' to export.
    """
    _verify_export_password(password, x_export_password)
    scan = await _fetch_scan(scan_id, db)
    report = _build_report_dict(scan)

    content = json.dumps(report, indent=2, default=str)
    filename = f"secureflow-detailed-report-{scan_id.replace('run-', '')}.json"

    return StreamingResponse(
        io.BytesIO(content.encode()),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/pipeline/{scan_id}/pdf")
async def export_pipeline_pdf(
    scan_id: str,
    password: str = Query("", alias="password"),
    x_export_password: str = Header("", alias="X-Export-Password"),
    db: AsyncSession = Depends(_get_db),
):
    """
    Download a formatted, publication-ready PDF of the pipeline security report.
    Requires password 'xoxo' to export.
    """
    _verify_export_password(password, x_export_password)
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
    except ImportError:
        raise HTTPException(
            status_code=501,
            detail="PDF export requires 'reportlab'. Install it: pip install reportlab",
        )

    scan = await _fetch_scan(scan_id, db)
    report = _build_report_dict(scan)

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=1.5 * cm,
        rightMargin=1.5 * cm,
        topMargin=1.5 * cm,
        bottomMargin=1.5 * cm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "SFTitle", parent=styles["Title"],
        fontSize=18, textColor=colors.HexColor("#0f172a"), alignment=0, spaceAfter=4
    )
    subtitle_style = ParagraphStyle(
        "SFSubtitle", parent=styles["Normal"],
        fontSize=10, textColor=colors.HexColor("#64748b"), spaceAfter=12
    )
    heading_style = ParagraphStyle(
        "SFHeading", parent=styles["Heading2"],
        fontSize=12, textColor=colors.HexColor("#0f172a"), spaceBefore=10, spaceAfter=6
    )
    body_style = ParagraphStyle(
        "SFBody", parent=styles["Normal"],
        fontSize=9, textColor=colors.HexColor("#334155"), leading=13
    )

    story = []

    # ── Header Title & Badge ──────────────────────────────────────────────────
    story.append(Paragraph("SecureFlow Enterprise DevSecOps Audit Report", title_style))
    story.append(Paragraph(f"Repository: {report['repo_name']} | Generated: {report['exported_at']}", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#cbd5e1"), spaceAfter=12))

    # ── Executive Metadata & Status Badge ─────────────────────────────────────
    meta_data = [
        ["Audit Run ID", f"#{report['scan_id']}", "Pipeline Decision", report["gate_decision"]],
        ["Repository", report["repo_name"], "Action Enforced", report["action_taken"]],
        ["Branch / Ref", report["branch"], "Risk Score", f"{report['risk_score']} / 100"],
        ["Commit SHA", report["commit_sha"][:12], "Highest Severity", report["severity"]],
        ["Commit Msg", (report["commit_message"] or "—")[:40], "Total Findings", str(report["summary"]["total_findings"])],
    ]

    meta_table = Table(meta_data, colWidths=[3.5 * cm, 5 * cm, 3.5 * cm, 5 * cm])
    meta_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f8fafc")),
        ("BACKGROUND", (2, 0), (2, -1), colors.HexColor("#f8fafc")),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#0f172a")),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
        ("FONTNAME", (3, 0), (3, 0), "Helvetica-Bold"),
        ("TEXTCOLOR", (3, 0), (3, 0), colors.HexColor(report["gate_color"])),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 0.4 * cm))

    # ── Severity Matrix Table ─────────────────────────────────────────────────
    story.append(Paragraph("Vulnerability Severity Breakdown", heading_style))
    summary_data = [
        ["Engine", "Gitleaks (Secrets)", "Semgrep (SAST)", "Trivy (SCA)", "OWASP ZAP (DAST)", "Total"],
        ["Count", str(report["summary"]["gitleaks_count"]), str(report["summary"]["semgrep_count"]), str(report["summary"]["trivy_count"]), str(report["summary"]["zap_count"]), str(report["summary"]["total_findings"])],
    ]
    summary_table = Table(summary_data, colWidths=[3 * cm, 3.2 * cm, 3.2 * cm, 3.2 * cm, 3.2 * cm, 2.2 * cm])
    summary_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8.5),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 0.4 * cm))

    # ── Pipeline Execution Stages Table ───────────────────────────────────────
    story.append(Paragraph("Pipeline Execution Timeline", heading_style))
    stage_rows = [["Stage Name", "Key", "Status Result", "Execution Detail"]]
    for step in report["pipeline_execution_steps"]:
        stage_rows.append([
            step["label"],
            step["stage_key"],
            step["result"],
            step["detail"][:55],
        ])

    stage_table = Table(stage_rows, colWidths=[4.5 * cm, 3 * cm, 3 * cm, 7.5 * cm])
    stage_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#e2e8f0")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    story.append(stage_table)
    story.append(Spacer(1, 0.4 * cm))

    # ── Detailed Findings Section ──────────────────────────────────────────────
    all_findings_rows = [["Type", "CVE / Check ID", "Target / Location", "Severity", "Remediation / Solution"]]

    for g in report["gitleaks_findings"]:
        all_findings_rows.append([
            "Secret",
            g["rule_id"],
            f"{g['file']}:{g['start_line']}",
            g["severity"],
            g["remediation"][:50],
        ])
    for s in report["semgrep_findings"]:
        all_findings_rows.append([
            "SAST",
            s["check_id"][:20],
            f"{s['file']}:{s['start_line']}",
            s["severity"],
            s["remediation"][:50],
        ])
    for t in report["trivy_findings"]:
        all_findings_rows.append([
            "SCA",
            t["cve_id"],
            f"{t['package_name']} ({t['installed_version']})",
            t["severity"],
            t["remediation"][:50],
        ])
    for z in report["zap_findings"]:
        all_findings_rows.append([
            "DAST",
            z["plugin_id"],
            z["target_url"][:25],
            z["risk"],
            z["solution"][:50],
        ])

    story.append(Paragraph("Security Findings Details", heading_style))

    if len(all_findings_rows) == 1:
        story.append(Paragraph("<b>✅ ZERO VULNERABILITIES DETECTED.</b> All scanners returned clean results.", body_style))
    else:
        findings_table = Table(all_findings_rows[:35], colWidths=[2 * cm, 4 * cm, 4.5 * cm, 2 * cm, 5.5 * cm])
        findings_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 7.5),
            ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#e2e8f0")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ]))
        story.append(findings_table)

    story.append(Spacer(1, 0.4 * cm))

    # ── AI Remediation & Analysis Section ─────────────────────────────────────
    story.append(Paragraph("AI Copilot Analysis & Code Remediation", heading_style))
    ai_exp = Paragraph(f"<b>Root Cause Analysis:</b> {report['ai_remediation']['ai_explanation']}", body_style)
    ai_fix = Paragraph(f"<b>Suggested Code Patch:</b> {report['ai_remediation']['ai_fix']}", body_style)
    story.append(ai_exp)
    story.append(Spacer(1, 0.2 * cm))
    story.append(ai_fix)

    doc.build(story)
    buffer.seek(0)

    filename = f"secureflow-report-{scan_id.replace('run-', '')}.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
