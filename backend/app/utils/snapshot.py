"""
PDF Snapshot Generator using ReportLab.
Clean one-page branded portfolio snapshot.
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
from reportlab.graphics.shapes import Drawing, Circle, Rect, String, Line, Path
from reportlab.graphics import renderPDF


# ── Brand palette ──────────────────────────────────────────────────────────────
NAVY      = HexColor("#0f1e3c")
DARK_NAVY = HexColor("#060e1e")
BLUE      = HexColor("#3b82f6")
BLUE_MID  = HexColor("#2563eb")
BLUE_LIGHT= HexColor("#60a5fa")
AMBER     = HexColor("#f59e0b")
GREEN     = HexColor("#10b981")
RED       = HexColor("#ef4444")
PURPLE    = HexColor("#8b5cf6")
LIGHT_GRAY= HexColor("#f8fafc")
SLATE_800 = HexColor("#1e293b")
SLATE_700 = HexColor("#334155")
SLATE_600 = HexColor("#475569")
MID_GRAY  = HexColor("#64748b")
SLATE_200 = HexColor("#e2e8f0")
WHITE     = colors.white


# ── Public entry point ─────────────────────────────────────────────────────────

def generate_snapshot_pdf(analytics: dict, session_id: str, share_url: str | None = None) -> bytes:
    """Generate a clean one-page PDF snapshot. Returns raw bytes."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=0.55 * inch,
        leftMargin=0.55 * inch,
        topMargin=0.45 * inch,
        bottomMargin=0.45 * inch,
    )

    styles = _build_styles()
    story = []

    summary     = analytics.get("summary", {})
    risk        = analytics.get("risk_score", {})
    div_score   = analytics.get("diversification_score", {})
    conc        = analytics.get("concentration", {})
    bench       = analytics.get("benchmark", {})
    gains       = analytics.get("gains_summary", {})
    top_holdings= conc.get("top_holdings", [])[:6]
    date_str    = datetime.now().strftime("%B %d, %Y")

    # ── Header: logo + meta ────────────────────────────────────────────────
    story.append(_build_header(session_id, date_str, share_url, styles))
    story.append(Spacer(1, 0.12 * inch))

    # ── Two-column body ────────────────────────────────────────────────────
    left_col  = _build_left_column(summary, risk, div_score, gains, styles)
    right_col = _build_right_column(top_holdings, bench, styles)

    body = Table(
        [[left_col, right_col]],
        colWidths=[3.75 * inch, 3.75 * inch],
        hAlign="CENTER",
    )
    body.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING",  (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING",   (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 0),
    ]))
    story.append(body)

    story.append(Spacer(1, 0.1 * inch))
    story.append(HRFlowable(width="100%", thickness=0.5, color=SLATE_700))
    story.append(Spacer(1, 0.06 * inch))
    story.append(Paragraph(
        analytics.get("disclaimer", "For educational purposes only. Not financial advice."),
        styles["disclaimer"]
    ))

    doc.build(story)
    return buffer.getvalue()


# ── Header ─────────────────────────────────────────────────────────────────────

def _build_header(session_id: str, date_str: str, share_url: str | None, styles: dict):
    """Returns a Table row with logo on the left, meta on the right."""

    logo_drawing = _make_logo_drawing(size=38)

    # Logo cell: drawing + wordmark side by side
    logo_table = Table(
        [[logo_drawing, Paragraph("<b>folio</b>", styles["logo_word"])]],
        colWidths=[0.55 * inch, 1.2 * inch],
    )
    logo_table.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING",  (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING",   (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 0),
    ]))

    meta_lines = [
        Paragraph("Portfolio Analysis Snapshot", styles["subtitle"]),
        Paragraph(f"Generated {date_str} · Session: {session_id[:8]}…", styles["meta"]),
    ]
    if share_url:
        meta_lines.append(Paragraph(f"<a href='{share_url}' color='#3b82f6'>{share_url}</a>", styles["meta"]))

    meta_block = list(meta_lines)

    header = Table(
        [[logo_table, meta_block]],
        colWidths=[2.0 * inch, 5.5 * inch],
    )
    header.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING",  (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING",   (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 0),
        ("ALIGN", (1, 0), (1, 0), "RIGHT"),
    ]))
    return header


# ── Left column ────────────────────────────────────────────────────────────────

def _build_left_column(summary, risk, div_score, gains, styles) -> list:
    """Overview + risk/diversification + gains."""
    col = []

    # Section: Portfolio Overview
    col.append(Paragraph("Portfolio Overview", styles["section"]))
    col.append(Spacer(1, 0.04 * inch))

    overview_data = [
        [Paragraph("Total Value", styles["metric_label"]),
         Paragraph("Holdings", styles["metric_label"]),
         Paragraph("Sectors", styles["metric_label"])],
        [Paragraph(f"${summary.get('total_value', 0):,.0f}", styles["metric_value"]),
         Paragraph(str(summary.get("total_holdings", 0)), styles["metric_value"]),
         Paragraph(str(summary.get("unique_sectors", 0)), styles["metric_value"])],
    ]
    ov_table = Table(overview_data, colWidths=[1.2 * inch, 0.9 * inch, 0.9 * inch])
    ov_table.setStyle(_metric_style())
    col.append(ov_table)
    col.append(Spacer(1, 0.12 * inch))

    # Section: Risk & Diversification
    col.append(Paragraph("Risk & Diversification", styles["section"]))
    col.append(Spacer(1, 0.04 * inch))

    risk_color  = HexColor(risk.get("color", "#94a3b8")) if risk.get("color") else MID_GRAY
    div_color   = HexColor(div_score.get("color", "#94a3b8")) if div_score.get("color") else MID_GRAY

    rd_data = [
        [Paragraph("Risk Score", styles["metric_label"]),
         Paragraph("Risk Label", styles["metric_label"])],
        [Paragraph(f"{risk.get('score', '—')}/100", styles["metric_value"]),
         Paragraph(risk.get("label", "N/A"), _colored_style(styles["metric_value_sm"], risk_color))],
        [Paragraph("Diversification", styles["metric_label"]),
         Paragraph("Div. Label", styles["metric_label"])],
        [Paragraph(f"{div_score.get('score', '—')}/100", styles["metric_value"]),
         Paragraph(div_score.get("label", "N/A"), _colored_style(styles["metric_value_sm"], div_color))],
    ]
    rd_table = Table(rd_data, colWidths=[1.5 * inch, 1.5 * inch])
    rd_table.setStyle(_metric_style())
    col.append(rd_table)
    col.append(Spacer(1, 0.12 * inch))

    # Section: Gains / Losses (if available)
    if gains.get("available"):
        col.append(Paragraph("Unrealized Gains / Losses", styles["section"]))
        col.append(Spacer(1, 0.04 * inch))
        gl = gains.get("total_gain_loss", 0)
        gl_pct = gains.get("total_gain_loss_pct")
        gl_color = GREEN if gl >= 0 else RED
        sign = "+" if gl >= 0 else ""

        gl_data = [
            [Paragraph("Cost Basis", styles["metric_label"]),
             Paragraph("Market Value", styles["metric_label"])],
            [Paragraph(f"${gains.get('total_cost_basis', 0):,.0f}", styles["metric_value_sm"]),
             Paragraph(f"${gains.get('total_market_value', 0):,.0f}", styles["metric_value_sm"])],
            [Paragraph("Unrealized G/L", styles["metric_label"]),
             Paragraph("Winners / Losers", styles["metric_label"])],
            [Paragraph(
                f"{sign}${abs(gl):,.0f}" + (f" ({sign}{gl_pct:.1f}%)" if gl_pct is not None else ""),
                _colored_style(styles["metric_value_sm"], gl_color)
             ),
             Paragraph(
                f"{gains.get('positions_with_gains', 0)} / {gains.get('positions_with_losses', 0)}",
                styles["metric_value_sm"]
             )],
        ]
        gl_table = Table(gl_data, colWidths=[1.5 * inch, 1.5 * inch])
        gl_table.setStyle(_metric_style())
        col.append(gl_table)

    return col


# ── Right column ───────────────────────────────────────────────────────────────

def _build_right_column(top_holdings, bench, styles) -> list:
    """Top holdings + S&P 500 sector comparison."""
    col = []

    # Top holdings
    if top_holdings:
        col.append(Paragraph("Top Holdings", styles["section"]))
        col.append(Spacer(1, 0.04 * inch))
        th_data = [[
            Paragraph("Ticker", styles["th"]),
            Paragraph("Name", styles["th"]),
            Paragraph("Weight", styles["th"]),
        ]]
        for h in top_holdings:
            th_data.append([
                Paragraph(h.get("ticker", ""), styles["td_mono"]),
                Paragraph((h.get("name") or "")[:22], styles["td"]),
                Paragraph(f"{h.get('weight_pct', 0):.1f}%", styles["td_right"]),
            ])
        th_table = Table(th_data, colWidths=[0.65 * inch, 2.0 * inch, 0.65 * inch])
        th_table.setStyle(_data_style())
        col.append(th_table)
        col.append(Spacer(1, 0.12 * inch))

    # S&P 500 comparison
    if bench.get("available"):
        col.append(Paragraph("Portfolio vs S&P 500 Sectors", styles["section"]))
        col.append(Spacer(1, 0.04 * inch))

        bench_data = [[
            Paragraph("Sector", styles["th"]),
            Paragraph("You", styles["th"]),
            Paragraph("S&P", styles["th"]),
            Paragraph("Δ", styles["th"]),
        ]]
        sectors = [s for s in bench.get("sectors", []) if s["portfolio_pct"] > 0.1 or s["sp500_pct"] > 0.1]
        sectors = sorted(sectors, key=lambda x: x["portfolio_pct"], reverse=True)[:8]

        for item in sectors:
            delta = item["delta"]
            d_sign = "+" if delta >= 0 else ""
            status = item["status"]
            d_color = BLUE if status == "overweight" else PURPLE if status == "underweight" else SLATE_600

            bench_data.append([
                Paragraph(
                    item["sector"].replace("Consumer Discretionary", "Cons. Discret.")
                                  .replace("Consumer Staples", "Cons. Staples")
                                  .replace("Communication Services", "Comm. Services"),
                    styles["td"]
                ),
                Paragraph(f"{item['portfolio_pct']:.1f}%", styles["td_right"]),
                Paragraph(f"{item['sp500_pct']:.1f}%",     styles["td_right"]),
                Paragraph(f"{d_sign}{delta:.1f}%",          _colored_style(styles["td_right"], d_color)),
            ])

        bench_table = Table(bench_data, colWidths=[1.45 * inch, 0.6 * inch, 0.6 * inch, 0.65 * inch])
        bench_table.setStyle(_data_style())
        col.append(bench_table)

        # Legend
        col.append(Spacer(1, 0.05 * inch))
        col.append(Paragraph(
            "<font color='#3b82f6'>■</font> Overweight  "
            "<font color='#8b5cf6'>■</font> Underweight  "
            "<font color='#475569'>■</font> Neutral",
            styles["legend"]
        ))

    return col


# ── Logo drawing ───────────────────────────────────────────────────────────────

def _make_logo_drawing(size: int = 38) -> Drawing:
    """Recreate the Folio SVG logo as a ReportLab Drawing."""
    s = size / 92.0  # scale from 92px design
    d = Drawing(size, size)

    # Background circle
    d.add(Circle(46 * s, 46 * s, 46 * s, fillColor=HexColor("#0f1e3c"), strokeColor=None))

    # F bars (left side) — note ReportLab y=0 is bottom, so flip y
    def rect(x, y, w, h, fill):
        # SVG y from top → ReportLab y from bottom: new_y = size - (y + h)
        d.add(Rect(x * s, (92 - y - h) * s, w * s, h * s,
                   fillColor=fill, strokeColor=None, rx=3 * s, ry=3 * s))

    rect(10, 20, 34, 11, HexColor("#3b82f6"))
    rect(10, 37, 24, 11, HexColor("#60a5fa"))
    rect(10, 54, 15, 11, HexColor("#93c5fd"))

    # O donut arcs — approximate with a filled circle + donut hole
    # Use two segments: dark navy with circles
    pie_cx = 50 * s
    pie_cy = (92 - 46) * s
    pie_r  = 28 * s
    # Full circle for the O background
    d.add(Circle(pie_cx, pie_cy, pie_r, fillColor=HexColor("#2563eb"), strokeColor=None))
    # Lighter segment overlay (approximate)
    d.add(Circle(pie_cx, pie_cy, pie_r, fillColor=None,
                 strokeColor=HexColor("#60a5fa"), strokeWidth=pie_r * 0.45))
    # Donut hole
    d.add(Circle(pie_cx, pie_cy, 11 * s, fillColor=HexColor("#0f1e3c"), strokeColor=None))

    # Amber dot
    d.add(Circle(75 * s, (92 - 20) * s, 5 * s, fillColor=HexColor("#f59e0b"), strokeColor=None))

    return d


# ── Style helpers ──────────────────────────────────────────────────────────────

def _build_styles() -> dict:
    base = getSampleStyleSheet()
    return {
        "logo_word": ParagraphStyle(
            "logo_word", parent=base["Normal"],
            fontSize=20, fontName="Helvetica-Bold",
            textColor=WHITE, spaceAfter=0, leading=22,
        ),
        "subtitle": ParagraphStyle(
            "subtitle", parent=base["Normal"],
            fontSize=10, textColor=BLUE_LIGHT, spaceAfter=2,
        ),
        "meta": ParagraphStyle(
            "meta", parent=base["Normal"],
            fontSize=8, textColor=MID_GRAY, spaceAfter=0,
        ),
        "section": ParagraphStyle(
            "section", parent=base["Normal"],
            fontSize=9, fontName="Helvetica-Bold",
            textColor=BLUE_LIGHT, spaceBefore=2, spaceAfter=0,
            borderPadding=(0, 0, 2, 0),
        ),
        "metric_label": ParagraphStyle(
            "metric_label", parent=base["Normal"],
            fontSize=7, textColor=MID_GRAY, spaceAfter=0, leading=9,
        ),
        "metric_value": ParagraphStyle(
            "metric_value", parent=base["Normal"],
            fontSize=14, fontName="Helvetica-Bold",
            textColor=WHITE, spaceAfter=0, leading=16,
        ),
        "metric_value_sm": ParagraphStyle(
            "metric_value_sm", parent=base["Normal"],
            fontSize=11, fontName="Helvetica-Bold",
            textColor=WHITE, spaceAfter=0, leading=13,
        ),
        "th": ParagraphStyle(
            "th", parent=base["Normal"],
            fontSize=7, fontName="Helvetica-Bold",
            textColor=WHITE, spaceAfter=0, leading=9,
        ),
        "td": ParagraphStyle(
            "td", parent=base["Normal"],
            fontSize=8, textColor=HexColor("#cbd5e1"), spaceAfter=0, leading=10,
        ),
        "td_mono": ParagraphStyle(
            "td_mono", parent=base["Normal"],
            fontSize=8, fontName="Helvetica-Bold",
            textColor=BLUE_LIGHT, spaceAfter=0, leading=10,
        ),
        "td_right": ParagraphStyle(
            "td_right", parent=base["Normal"],
            fontSize=8, textColor=HexColor("#cbd5e1"),
            alignment=2, spaceAfter=0, leading=10,   # 2 = RIGHT
        ),
        "legend": ParagraphStyle(
            "legend", parent=base["Normal"],
            fontSize=7, textColor=MID_GRAY, spaceAfter=0, leading=9,
        ),
        "disclaimer": ParagraphStyle(
            "disclaimer", parent=base["Normal"],
            fontSize=7, textColor=MID_GRAY, spaceAfter=0, leading=9,
        ),
    }


def _colored_style(base_style: ParagraphStyle, color) -> ParagraphStyle:
    """Return a copy of base_style with a different textColor."""
    return ParagraphStyle(
        base_style.name + "_c",
        parent=base_style,
        textColor=color,
    )


def _metric_style() -> TableStyle:
    return TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), HexColor("#1e293b")),
        ("ALIGN",         (0, 0), (-1, -1), "LEFT"),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING",   (0, 0), (-1, -1), 6),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 6),
        ("BOX",           (0, 0), (-1, -1), 0.5, SLATE_700),
        ("INNERGRID",     (0, 0), (-1, -1), 0.25, SLATE_700),
        ("ROWBACKGROUND", (0, 0), (-1, -1), [HexColor("#1e293b"), HexColor("#172033")]),
    ])


def _data_style() -> TableStyle:
    return TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0),  NAVY),
        ("TEXTCOLOR",     (0, 0), (-1, 0),  WHITE),
        ("FONTNAME",      (0, 0), (-1, 0),  "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, -1), 8),
        ("ALIGN",         (0, 0), (-1, -1), "LEFT"),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",    (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING",   (0, 0), (-1, -1), 5),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 5),
        ("ROWBACKGROUND", (0, 1), (-1, -1), [WHITE, LIGHT_GRAY]),
        ("BOX",           (0, 0), (-1, -1), 0.5, SLATE_200),
        ("LINEBELOW",     (0, 0), (-1, 0),  1, BLUE),
    ])


def _generate_qr_image(url: str) -> io.BytesIO:
    qr = qrcode.make(url)
    buf = io.BytesIO()
    qr.save(buf, format="PNG")
    buf.seek(0)
    return buf
