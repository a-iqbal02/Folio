"""
PDF Snapshot Generator using ReportLab.
Generates a clean, branded portfolio summary PDF.
Intentionally omits sensitive data — shows only analysis and metrics.
"""

import io
import qrcode
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib.colors import HexColor


# Brand colors
NAVY = HexColor("#0f1e3c")
BLUE = HexColor("#3b82f6")
GREEN = HexColor("#10b981")
AMBER = HexColor("#f59e0b")
RED = HexColor("#ef4444")
LIGHT_GRAY = HexColor("#f8fafc")
MID_GRAY = HexColor("#64748b")


def generate_snapshot_pdf(analytics: dict, session_id: str, share_url: str | None = None) -> bytes:
    """
    Generate a PDF snapshot of portfolio analytics.
    Returns raw PDF bytes.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=0.75 * inch,
        leftMargin=0.75 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
    )

    styles = _build_styles()
    story = []

    # Header
    story.append(Paragraph("Folio", styles["brand"]))
    story.append(Paragraph("Portfolio Analysis Snapshot", styles["subtitle"]))
    story.append(Paragraph(
        f"Generated {datetime.now().strftime('%B %d, %Y')} · Session: {session_id[:8]}...",
        styles["meta"]
    ))
    story.append(HRFlowable(width="100%", thickness=1, color=BLUE, spaceAfter=16))

    # Summary row
    summary = analytics.get("summary", {})
    story.append(Paragraph("Portfolio Overview", styles["section_header"]))

    summary_data = [
        ["Total Value", "Holdings", "Sectors", ""],
        [
            f"${summary.get('total_value', 0):,.0f}",
            str(summary.get("total_holdings", 0)),
            str(summary.get("unique_sectors", 0)),
            "",
        ],
    ]
    story.append(_metric_table(summary_data))
    story.append(Spacer(1, 0.2 * inch))

    # Risk + Diversification
    risk = analytics.get("risk_score", {})
    div = analytics.get("diversification_score", {})
    story.append(Paragraph("Risk & Diversification", styles["section_header"]))

    rd_data = [
        ["Risk Score", "Risk Label", "Diversification Score", "Diversification Label"],
        [
            f"{risk.get('score', 'N/A')}/100",
            risk.get("label", "N/A"),
            f"{div.get('score', 'N/A')}/100",
            div.get("label", "N/A"),
        ],
    ]
    story.append(_metric_table(rd_data))
    story.append(Spacer(1, 0.2 * inch))

    # Top Holdings
    conc = analytics.get("concentration", {})
    top_holdings = conc.get("top_holdings", [])[:10]
    if top_holdings:
        story.append(Paragraph("Top Holdings", styles["section_header"]))
        th_data = [["Ticker", "Name", "Weight", "Sector"]]
        for h in top_holdings:
            th_data.append([
                h.get("ticker", ""),
                (h.get("name") or "")[:28],
                f"{h.get('weight_pct', 0):.1f}%",
                (h.get("sector") or "Unknown")[:20],
            ])
        story.append(_data_table(th_data))
        story.append(Spacer(1, 0.2 * inch))

    # Sector Allocation
    sectors = analytics.get("sector_breakdown", [])
    if sectors:
        story.append(Paragraph("Sector Allocation", styles["section_header"]))
        sec_data = [["Sector", "Portfolio %", "# Holdings"]]
        for s in sectors[:12]:
            sec_data.append([
                s.get("sector", "Unknown"),
                f"{s.get('weight_pct', 0):.1f}%",
                str(s.get("count", 0)),
            ])
        story.append(_data_table(sec_data))
        story.append(Spacer(1, 0.2 * inch))

    # Benchmark comparison
    bench = analytics.get("benchmark", {})
    if bench.get("available"):
        story.append(Paragraph("vs S&P 500 Sector Weights", styles["section_header"]))
        bench_data = [["Sector", "Your Portfolio", "S&P 500", "Delta", "Status"]]
        for item in bench.get("sectors", [])[:10]:
            bench_data.append([
                item["sector"],
                f"{item['portfolio_pct']:.1f}%",
                f"{item['sp500_pct']:.1f}%",
                f"{item['delta']:+.1f}%",
                item["status"].capitalize(),
            ])
        story.append(_data_table(bench_data))
        story.append(Spacer(1, 0.2 * inch))

    # Warnings
    warnings = conc.get("warnings", [])
    if warnings:
        story.append(Paragraph("Concentration Observations", styles["section_header"]))
        for w in warnings:
            story.append(Paragraph(f"• {w['title']}", styles["warning_title"]))
            story.append(Paragraph(w["description"], styles["warning_body"]))
            story.append(Spacer(1, 0.1 * inch))

    # QR code / share link
    if share_url:
        story.append(HRFlowable(width="100%", thickness=1, color=MID_GRAY, spaceBefore=16, spaceAfter=8))
        story.append(Paragraph(f"Share URL: {share_url}", styles["meta"]))
        try:
            qr_img = _generate_qr_image(share_url)
            from reportlab.platypus import Image as RLImage
            story.append(RLImage(qr_img, width=1.2 * inch, height=1.2 * inch))
        except Exception:
            pass

    # Disclaimer
    story.append(Spacer(1, 0.2 * inch))
    story.append(HRFlowable(width="100%", thickness=0.5, color=MID_GRAY))
    story.append(Spacer(1, 0.1 * inch))
    story.append(Paragraph(
        analytics.get("disclaimer", "For educational purposes only."),
        styles["disclaimer"]
    ))

    doc.build(story)
    return buffer.getvalue()


def _generate_qr_image(url: str) -> io.BytesIO:
    qr = qrcode.make(url)
    buf = io.BytesIO()
    qr.save(buf, format="PNG")
    buf.seek(0)
    return buf


def _build_styles() -> dict:
    base = getSampleStyleSheet()
    return {
        "brand": ParagraphStyle("brand", parent=base["Title"], fontSize=22, textColor=NAVY, spaceAfter=4),
        "subtitle": ParagraphStyle("subtitle", parent=base["Normal"], fontSize=13, textColor=BLUE, spaceAfter=4),
        "meta": ParagraphStyle("meta", parent=base["Normal"], fontSize=9, textColor=MID_GRAY, spaceAfter=8),
        "section_header": ParagraphStyle("section_header", parent=base["Heading2"], fontSize=12, textColor=NAVY, spaceBefore=12, spaceAfter=6),
        "warning_title": ParagraphStyle("warning_title", parent=base["Normal"], fontSize=10, textColor=RED, spaceBefore=4),
        "warning_body": ParagraphStyle("warning_body", parent=base["Normal"], fontSize=9, textColor=colors.black, spaceAfter=4, leftIndent=12),
        "disclaimer": ParagraphStyle("disclaimer", parent=base["Normal"], fontSize=8, textColor=MID_GRAY, spaceAfter=0),
    }


def _metric_table(data: list[list]) -> Table:
    t = Table(data, colWidths=[1.8 * inch] * 4)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), LIGHT_GRAY),
        ("TEXTCOLOR", (0, 0), (-1, 0), MID_GRAY),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, 0), 8),
        ("FONTNAME", (0, 1), (-1, 1), "Helvetica-Bold"),
        ("FONTSIZE", (0, 1), (-1, 1), 14),
        ("TEXTCOLOR", (0, 1), (-1, 1), NAVY),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ROWBACKGROUND", (0, 1), (-1, 1), colors.white),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("BOX", (0, 0), (-1, -1), 0.5, HexColor("#e2e8f0")),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, HexColor("#e2e8f0")),
    ]))
    return t


def _data_table(data: list[list]) -> Table:
    t = Table(data, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("ROWBACKGROUND", (0, 1), (-1, -1), [colors.white, LIGHT_GRAY]),
        ("ALIGN", (0, 0), (-1, -1), "LEFT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("BOX", (0, 0), (-1, -1), 0.5, HexColor("#e2e8f0")),
        ("LINEBELOW", (0, 0), (-1, 0), 1, BLUE),
    ]))
    return t
