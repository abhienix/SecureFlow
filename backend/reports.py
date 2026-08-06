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
    """Load a ScanResult row from the database by scan_id string."""
    from models import ScanResult

    stmt = select(ScanResult).where(ScanResult.scan_id == scan_id)
    result = await db.execute(stmt)
    scan = result.scalar_one_or_none()

    if scan is None:
        raise HTTPException(status_code=404, detail=f"Scan '{scan_id}' not found")

    return scan


def _build_report_dict(scan) -> dict:
    """Serialize a ScanResult row into a clean dict suitable for JSON export."""
    raw_findings = scan.raw_findings or {}
    policy_result = scan.policy_result or {}

    trivy_vulns = 0
    if raw_findings.get("trivy", {}).get("Results"):
        trivy_vulns = len(raw_findings["trivy"]["Results"][0].get("Vulnerabilities") or [])

    return {
        "scan_id": str(scan.scan_id),
        "repo_name": scan.repo_name,
        "commit_sha": scan.commit_sha,
        "status": scan.status,
        "action_taken": scan.action_taken,
        "severity": scan.severity,
        "risk_score": scan.risk_score,
        "started_at": _utc_iso(scan.started_at),
        "completed_at": _utc_iso(scan.completed_at),
        "policy_result": policy_result,
        "blocked_findings": policy_result.get("blocked", []),
        "warned_findings": policy_result.get("warned", []),
        "allowlisted_findings": policy_result.get("allowlisted", []),
        "raw_findings_summary": {
            "trivy_vulns": trivy_vulns,
            "gitleaks_secrets": len(raw_findings.get("gitleaks") or []),
            "semgrep_findings": len(raw_findings.get("semgrep") or []),
            "zap_alerts": len((raw_findings.get("zap") or {}).get("alerts", [])),
        },
        "exported_at": datetime.now(timezone.utc).isoformat(),
    }


async def _get_db():
    """Placeholder — replaced at startup by the real get_db dependency from main."""
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
    filename = f"secureflow-report-{scan_id[:8]}.json"

    return StreamingResponse(
        io.BytesIO(content.encode()),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/pipeline/{scan_id}/pdf")
async def export_pipeline_pdf(scan_id: str, db: AsyncSession = Depends(_get_db)):
    """
    Download a formatted PDF of the pipeline security report.
    Includes blocked/warned findings with CVSS scores and suggested fixes.
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
        ["Scan ID", report["scan_id"]],
        ["Repository", report["repo_name"] or "—"],
        ["Commit", (report["commit_sha"] or "—")[:12]],
        ["Status", report["status"] or "—"],
        ["Decision", report["action_taken"] or "—"],
        ["Severity", report["severity"] or "—"],
        ["Risk Score", str(report["risk_score"] or 0)],
        ["Started", report["started_at"] or "—"],
        ["Completed", report["completed_at"] or "—"],
        ["Exported", report["exported_at"]],
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

    for section_title, section_key in [
        ("Blocked Findings", "blocked_findings"),
        ("Warned Findings", "warned_findings"),
    ]:
        findings = report.get(section_key, [])
        story.append(Paragraph(section_title, heading_style))

        if not findings:
            story.append(Paragraph("No findings in this category.", body_style))
            story.append(Spacer(1, 0.3 * cm))
            continue

        table_data = [["CVE / Rule", "Package", "Severity", "CVSS", "Fix"]]
        for f in findings[:30]:
            table_data.append([
                f.get("cve") or "—",
                f.get("package") or "—",
                f.get("severity") or "—",
                str(f.get("cvss") or "—"),
                (f.get("fix") or "—")[:60],
            ])

        findings_table = Table(
            table_data,
            colWidths=[3.5 * cm, 3.5 * cm, 2 * cm, 1.5 * cm, 5.5 * cm],
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

    filename = f"secureflow-report-{scan_id[:8]}.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
