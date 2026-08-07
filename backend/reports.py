"""
Export API for SecureFlow pipeline and security reports.

Provides /api/v1/reports/pipeline/{scan_id}/json and
/api/v1/reports/pipeline/{scan_id}/pdf endpoints so teams
can download audit evidence without needing dashboard access.
"""

import io
import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

logger = logging.getLogger("secureflow.reports")

router = APIRouter(prefix="/api/v1/reports", tags=["reports"])


def _utc_iso(dt):
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


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
        raise HTTPException(status_code=404, detail=f"No scan records found in database")

    return scan


def _build_report_dict(scan) -> dict:
    """Serialize a ScanResult row into a clean dict suitable for JSON export."""
    raw_findings = scan.findings if isinstance(scan.findings, dict) else {}
    pipeline_steps = scan.pipeline_steps if isinstance(scan.pipeline_steps, dict) else {}

    # Extract finding details safely
    gitleaks_secrets = raw_findings.get("gitleaks") or []
    semgrep_issues = raw_findings.get("semgrep") or []
    trivy_results = raw_findings.get("trivy", {}).get("Results") or []
    trivy_vulns = []
    if trivy_results and isinstance(trivy_results, list):
        trivy_vulns = trivy_results[0].get("Vulnerabilities") or []
    zap_alerts = (raw_findings.get("zap") or {}).get("alerts") or []

    blocked_findings = []
    for s in gitleaks_secrets:
        if isinstance(s, dict):
            blocked_findings.append({
                "cve": s.get("RuleID") or s.get("rule") or "Secret",
                "package": s.get("File") or s.get("file") or "Source Code",
                "severity": "HIGH",
                "cvss": 8.0,
                "fix": "Rotate secret and remove from commit history",
            })
    for s in semgrep_issues:
        if isinstance(s, dict):
            blocked_findings.append({
                "cve": s.get("check_id") or s.get("rule_id") or "Semgrep Flaw",
                "package": s.get("path") or "Source Code",
                "severity": "HIGH",
                "cvss": 7.5,
                "fix": s.get("extra", {}).get("message") or "Fix insecure code pattern",
            })
    for v in trivy_vulns:
        if isinstance(v, dict):
            sev = (v.get("Severity") or "LOW").upper()
            if sev in ("CRITICAL", "HIGH"):
                blocked_findings.append({
                    "cve": v.get("VulnerabilityID") or "CVE",
                    "package": v.get("PkgName") or "Dependency",
                    "severity": sev,
                    "cvss": v.get("PrimaryURL") or 7.0,
                    "fix": f"Upgrade to {v.get('FixedVersion') or 'latest version'}",
                })

    return {
        "scan_id": str(scan.id),
        "repo_name": scan.repo_name,
        "branch": scan.branch,
        "commit_sha": scan.commit_sha,
        "commit_message": scan.commit_message,
        "status": scan.status,
        "action_taken": scan.action_taken or "ALLOW",
        "severity": scan.severity or "CLEAN",
        "risk_score": scan.risk_score or 0,
        "started_at": _utc_iso(scan.started_at),
        "ai_explanation": scan.ai_explanation,
        "ai_fix": scan.ai_fix,
        "pipeline_steps": pipeline_steps,
        "blocked_findings": blocked_findings,
        "warned_findings": [],
        "allowlisted_findings": [],
        "findings_summary": {
            "gitleaks_secrets": len(gitleaks_secrets),
            "semgrep_issues": len(semgrep_issues),
            "trivy_vulns": len(trivy_vulns),
            "zap_alerts": len(zap_alerts),
        },
        "exported_at": datetime.now(timezone.utc).isoformat(),
    }


async def _get_db():
    """Placeholder — replaced at app startup by main.py dependency override."""
    raise NotImplementedError("Dependency override not applied")


@router.get("/pipeline/{scan_id}/json")
async def export_pipeline_json(scan_id: str, db: AsyncSession = Depends(_get_db)):
    """
    Download a complete pipeline audit report as structured JSON.
    Suitable for importing into external SIEM or compliance tools.
    """
    scan = await _fetch_scan(scan_id, db)
    report = _build_report_dict(scan)

    content = json.dumps(report, indent=2, default=str)
    filename = f"secureflow-report-{scan_id.replace('run-', '')}.json"

    return StreamingResponse(
        io.BytesIO(content.encode()),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/pipeline/{scan_id}/pdf")
async def export_pipeline_pdf(scan_id: str, db: AsyncSession = Depends(_get_db)):
    """
    Download a formatted PDF of the pipeline security report.
    Includes metadata, risk scores, and blocked/warned findings table.
    """
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
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
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "SFTitle", parent=styles["Title"],
        fontSize=18, textColor=colors.HexColor("#1e293b"),
    )
    heading_style = ParagraphStyle(
        "SFHeading", parent=styles["Heading2"],
        fontSize=13, textColor=colors.HexColor("#0f172a"),
    )
    body_style = styles["Normal"]

    story = []

    story.append(Paragraph("SecureFlow Pipeline Security Report", title_style))
    story.append(Spacer(1, 0.4 * cm))

    meta_data = [
        ["Scan ID", f"#{report['scan_id']}"],
        ["Repository", report["repo_name"] or "—"],
        ["Branch", report["branch"] or "main"],
        ["Commit", (report["commit_sha"] or "—")[:12]],
        ["Status", report["status"] or "—"],
        ["Gate Action", report["action_taken"] or "—"],
        ["Severity", report["severity"] or "—"],
        ["Risk Score", f"{report['risk_score']} / 100"],
        ["Started At", report["started_at"] or "—"],
        ["Exported At", report["exported_at"]],
    ]

    meta_table = Table(meta_data, colWidths=[5 * cm, 11 * cm])
    meta_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f1f5f9")),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#475569")),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 0.5 * cm))

    findings = report.get("blocked_findings", [])
    story.append(Paragraph("Security Findings & Flaws", heading_style))

    if not findings:
        story.append(Paragraph("No security findings or policy violations detected for this pipeline run.", body_style))
        story.append(Spacer(1, 0.3 * cm))
    else:
        table_data = [["CVE / Rule", "Package / Target", "Severity", "Fix Suggestion"]]
        for f in findings[:30]:
            table_data.append([
                str(f.get("cve") or "—"),
                str(f.get("package") or "—"),
                str(f.get("severity") or "—"),
                str(f.get("fix") or "—")[:65],
            ])

        findings_table = Table(
            table_data,
            colWidths=[4 * cm, 4 * cm, 2.5 * cm, 5.5 * cm],
        )
        findings_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#e2e8f0")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(findings_table)
        story.append(Spacer(1, 0.4 * cm))

    doc.build(story)
    buffer.seek(0)

    filename = f"secureflow-report-{scan_id.replace('run-', '')}.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
