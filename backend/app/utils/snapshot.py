"""
Folio PDF Snapshot Generator
Produces a one-page branded snapshot styled like the Simple View card.
"""

import io
from datetime import datetime

from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.colors import HexColor, white, Color
from reportlab.graphics.shapes import Drawing, Circle, Rect
from reportlab.graphics import renderPDF

# ── Palette (mirrors the web UI) ──────────────────────────────────────────────
BG          = HexColor("#0f172a")   # slate-950 page background
CARD_BG     = HexColor("#1e293b")   # slate-800 card background
CARD_BORDER = HexColor("#334155")   # slate-700
BLUE        = HexColor("#3b82f6")
BLUE_LIGHT  = HexColor("#60a5fa")
EMERALD     = HexColor("#10b981")
RED         = HexColor("#ef4444")
AMBER       = HexColor("#f59e0b")
PURPLE      = HexColor("#8b5cf6")
SLATE_300   = HexColor("#cbd5e1")
SLATE_400   = HexColor("#94a3b8")
SLATE_500   = HexColor("#64748b")
WHITE       = white


# ── Public entry point ─────────────────────────────────────────────────────────

def generate_snapshot_pdf(analytics: dict, session_id: str, share_url: str | None = None) -> bytes:
    """Generate a Folio-branded one-page PDF. Returns raw bytes."""
    buf = io.BytesIO()

    PAGE_W, PAGE_H = letter
    MARGIN = 0.55 * inch

    doc = SimpleDocTemplate(
        buf,
        pagesize=letter,
        rightMargin=MARGIN,
        leftMargin=MARGIN,
        topMargin=0.5 * inch,
        bottomMargin=0.4 * inch,
    )

    styles = _styles()
    story  = []

    summary      = analytics.get("summary", {})
    risk         = analytics.get("risk_score", {})
    div_s        = analytics.get("diversification_score", {})
    conc         = analytics.get("concentration", {})
    bench        = analytics.get("benchmark", {})
    gains        = analytics.get("gains_summary", {})
    top_holdings = conc.get("top_holdings", [])[:8]
    warnings     = conc.get("warnings", [])
    date_str     = datetime.now().strftime("%B %d, %Y")

    # ── Header row: logo + title + date ───────────────────────────────────────
    logo = _logo(36)
    hdr_left = Table(
        [[logo, Paragraph("<b>folio</b>", styles["logo_word"])]],
        colWidths=[0.52 * inch, 1.1 * inch],
    )
    hdr_left.setStyle(_bare())
    hdr_right = [
        Paragraph("Portfolio Analysis Snapshot", styles["hdr_subtitle"]),
        Paragraph(date_str, styles["hdr_meta"]),
    ]
    if share_url:
        hdr_right.append(Paragraph(f"<a href='{share_url}' color='#60a5fa'>{share_url}</a>", styles["hdr_meta"]))

    header = Table(
        [[hdr_left, hdr_right]],
        colWidths=[1.9 * inch, 5.6 * inch],
    )
    header.setStyle(TableStyle([
        *_bare_list(),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ALIGN",  (1, 0), (1, 0),  "RIGHT"),
    ]))
    story.append(header)
    story.append(Spacer(1, 0.14 * inch))

    # ── Divider ───────────────────────────────────────────────────────────────
    story.append(_hline())
    story.append(Spacer(1, 0.12 * inch))

    # ── Hero: total value + gain/loss ──────────────────────────────────────────
    tv = summary.get("total_value", 0)
    story.append(Paragraph("TOTAL PORTFOLIO VALUE", styles["hero_label"]))
    story.append(Paragraph(f"${tv:,.2f}", styles["hero_value"]))

    if gains.get("available"):
        gl     = gains.get("total_gain_loss", 0)
        gl_pct = gains.get("total_gain_loss_pct")
        pos    = gl >= 0
        sign   = "+" if pos else "−"
        color  = EMERALD if pos else RED
        arrow  = "▲" if pos else "▼"
        pct_str = f"  ({sign}{abs(gl_pct):.1f}%)" if gl_pct is not None else ""
        story.append(Paragraph(
            f"<font color='{'#10b981' if pos else '#ef4444'}'>"
            f"{arrow} {sign}${abs(gl):,.2f}{pct_str}</font>"
            f"   <font color='#64748b'>{summary.get('total_holdings', 0)} holdings · "
            f"{summary.get('unique_sectors', 0)} sectors</font>",
            styles["hero_sub"],
        ))
    else:
        story.append(Paragraph(
            f"<font color='#64748b'>{summary.get('total_holdings', 0)} holdings · "
            f"{summary.get('unique_sectors', 0)} sectors</font>",
            styles["hero_sub"],
        ))

    story.append(Spacer(1, 0.14 * inch))

    # ── Stats row: Risk | Diversification | Top-5 weight | S&P tilt ───────────
    risk_c   = HexColor(risk.get("color", "#94a3b8"))
    div_c    = HexColor(div_s.get("color", "#94a3b8"))
    top5_w   = conc.get("top5_weight_pct")
    sp_tilt  = _sp_tilt(bench)

    stats = Table(
        [[
            _stat_cell("Risk Level",        risk.get("label", "N/A"),   f"Score: {risk.get('score', '—')}/100",   risk_c,  styles),
            _stat_cell("Diversification",   div_s.get("label", "N/A"),  f"Score: {div_s.get('score', '—')}/100",  div_c,   styles),
            _stat_cell("Top-5 Weight",
                        f"{top5_w:.0f}%" if top5_w else "—",
                        conc.get("concentration_label", ""),
                        BLUE, styles),
            _stat_cell("vs S&P 500",        sp_tilt["label"],           sp_tilt["detail"],                        HexColor(sp_tilt["color"]), styles),
        ]],
        colWidths=[1.85 * inch] * 4,
    )
    stats.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), CARD_BG),
        ("BOX",           (0, 0), (-1, -1), 0.5,  CARD_BORDER),
        ("INNERGRID",     (0, 0), (-1, -1), 0.5,  CARD_BORDER),
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING",    (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING",   (0, 0), (-1, -1), 10),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 6),
        ("ROUNDEDCORNERS", [4]),
    ]))
    story.append(stats)
    story.append(Spacer(1, 0.14 * inch))

    # ── Two-column body ────────────────────────────────────────────────────────
    left  = _left_col(top_holdings, gains, styles)
    right = _right_col(bench, warnings, analytics.get("age_guidance"), styles)

    body = Table(
        [[left, right]],
        colWidths=[3.6 * inch, 3.9 * inch],
    )
    body.setStyle(TableStyle([
        *_bare_list(),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(body)

    story.append(Spacer(1, 0.1 * inch))
    story.append(_hline())
    story.append(Spacer(1, 0.06 * inch))
    story.append(Paragraph(
        analytics.get("disclaimer", "For educational purposes only. Not financial advice."),
        styles["disclaimer"],
    ))

    doc.build(
        story,
        onFirstPage=_draw_bg,
        onLaterPages=_draw_bg,
    )
    return buf.getvalue()


# ── Background canvas callback ─────────────────────────────────────────────────

def _draw_bg(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(BG)
    canvas.rect(0, 0, letter[0], letter[1], fill=True, stroke=False)
    canvas.restoreState()


# ── Section builders ───────────────────────────────────────────────────────────

def _left_col(top_holdings, gains, styles) -> list:
    col = []

    # Top holdings
    if top_holdings:
        col.append(Paragraph("TOP HOLDINGS", styles["section"]))
        col.append(Spacer(1, 0.05 * inch))

        rows = [[
            Paragraph("#",      styles["th"]),
            Paragraph("Ticker", styles["th"]),
            Paragraph("Name",   styles["th"]),
            Paragraph("Weight", styles["th"]),
        ]]
        for i, h in enumerate(top_holdings, 1):
            rows.append([
                Paragraph(str(i), styles["td_num"]),
                Paragraph(h.get("ticker", ""), styles["td_ticker"]),
                Paragraph((h.get("name") or "")[:24], styles["td"]),
                Paragraph(f"{h.get('weight_pct', 0):.1f}%", styles["td_right"]),
            ])
        t = Table(rows, colWidths=[0.22 * inch, 0.55 * inch, 2.1 * inch, 0.55 * inch])
        t.setStyle(_table_style())
        col.append(t)
        col.append(Spacer(1, 0.14 * inch))

    # Gains detail (if available)
    if gains.get("available"):
        col.append(Paragraph("GAINS & LOSSES", styles["section"]))
        col.append(Spacer(1, 0.05 * inch))
        gl = gains.get("total_gain_loss", 0)
        pos = gl >= 0
        sign = "+" if pos else "−"
        gl_pct = gains.get("total_gain_loss_pct")
        color_hex = "#10b981" if pos else "#ef4444"
        pct_str = f" ({sign}{abs(gl_pct):.1f}%)" if gl_pct is not None else ""

        rows = [
            [Paragraph("Cost Basis",   styles["kv_key"]),   Paragraph(f"${gains.get('total_cost_basis',  0):,.0f}", styles["kv_val"])],
            [Paragraph("Market Value", styles["kv_key"]),   Paragraph(f"${gains.get('total_market_value',0):,.0f}", styles["kv_val"])],
            [Paragraph("Unrealised",   styles["kv_key"]),
             Paragraph(f"<font color='{color_hex}'>{sign}${abs(gl):,.0f}{pct_str}</font>", styles["kv_val"])],
            [Paragraph("Winners / Losers", styles["kv_key"]),
             Paragraph(f"{gains.get('positions_with_gains',0)} / {gains.get('positions_with_losses',0)}", styles["kv_val"])],
        ]
        t = Table(rows, colWidths=[1.55 * inch, 1.85 * inch])
        t.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, -1), CARD_BG),
            ("BOX",           (0, 0), (-1, -1), 0.5, CARD_BORDER),
            ("INNERGRID",     (0, 0), (-1, -1), 0.25, CARD_BORDER),
            ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING",    (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING",   (0, 0), (-1, -1), 8),
            ("RIGHTPADDING",  (0, 0), (-1, -1), 8),
        ]))
        col.append(t)

    return col


def _right_col(bench, warnings, age_guidance, styles) -> list:
    col = []

    # Sector vs S&P
    if bench.get("available"):
        col.append(Paragraph("PORTFOLIO vs S&P 500  SECTORS", styles["section"]))
        col.append(Spacer(1, 0.05 * inch))

        sectors = [s for s in bench.get("sectors", [])
                   if s.get("portfolio_pct", 0) > 0.1 or s.get("sp500_pct", 0) > 0.1]
        sectors = sorted(sectors, key=lambda x: x.get("portfolio_pct", 0), reverse=True)[:8]

        rows = [[
            Paragraph("Sector",  styles["th"]),
            Paragraph("You",     styles["th"]),
            Paragraph("S&P 500", styles["th"]),
            Paragraph("Delta",   styles["th"]),
        ]]
        for s in sectors:
            delta   = s.get("delta", 0)
            d_sign  = "+" if delta >= 0 else ""
            status  = s.get("status", "")
            if status == "overweight":
                d_hex = "#3b82f6"
            elif status == "underweight":
                d_hex = "#8b5cf6"
            else:
                d_hex = "#64748b"
            short = (s.get("sector", "")
                     .replace("Consumer Discretionary", "Cons. Discret.")
                     .replace("Consumer Staples", "Cons. Staples")
                     .replace("Communication Services", "Comm. Services"))
            rows.append([
                Paragraph(short, styles["td"]),
                Paragraph(f"{s.get('portfolio_pct', 0):.1f}%", styles["td_right"]),
                Paragraph(f"{s.get('sp500_pct', 0):.1f}%",     styles["td_right"]),
                Paragraph(f"<font color='{d_hex}'>{d_sign}{delta:.1f}%</font>", styles["td_right"]),
            ])
        t = Table(rows, colWidths=[1.5 * inch, 0.65 * inch, 0.72 * inch, 0.75 * inch])
        t.setStyle(_table_style())
        col.append(t)
        col.append(Paragraph(
            "<font color='#3b82f6'>■</font> Overweight  "
            "<font color='#8b5cf6'>■</font> Underweight  "
            "<font color='#64748b'>■</font> Neutral",
            styles["legend"],
        ))
        col.append(Spacer(1, 0.14 * inch))

    # Warnings / insights
    if warnings:
        col.append(Paragraph("ACTIVE ALERTS", styles["section"]))
        col.append(Spacer(1, 0.04 * inch))
        for w in warnings[:4]:
            sev   = w.get("severity", "low")
            color = "#ef4444" if sev == "high" else "#f59e0b" if sev == "medium" else "#64748b"
            col.append(Paragraph(
                f"<font color='{color}'>●</font>  {w.get('title', '')}",
                styles["bullet"],
            ))
        col.append(Spacer(1, 0.1 * inch))

    # Age guidance
    if age_guidance:
        col.append(Paragraph("AGE-BASED CONTEXT", styles["section"]))
        col.append(Spacer(1, 0.04 * inch))
        col.append(Paragraph(
            f"Age {age_guidance['age']} · Actual equity {age_guidance['actual_equity_pct']}% · "
            f"Suggested ~{age_guidance['suggested_equity_pct']}% · {age_guidance['alignment']}",
            styles["insight"],
        ))

    return col


# ── Logo drawing ───────────────────────────────────────────────────────────────

def _logo(size: int = 36) -> Drawing:
    s  = size / 92.0
    d  = Drawing(size, size)

    d.add(Circle(46*s, 46*s, 46*s, fillColor=HexColor("#0f1e3c"), strokeColor=None))

    def rect(x, y, w, h, fill):
        d.add(Rect(x*s, (92-y-h)*s, w*s, h*s,
                   fillColor=fill, strokeColor=None, rx=3*s, ry=3*s))

    rect(10, 20, 34, 11, HexColor("#3b82f6"))
    rect(10, 37, 24, 11, HexColor("#60a5fa"))
    rect(10, 54, 15, 11, HexColor("#93c5fd"))

    px, py, pr = 50*s, (92-46)*s, 28*s
    d.add(Circle(px, py, pr,    fillColor=HexColor("#2563eb"), strokeColor=None))
    d.add(Circle(px, py, pr,    fillColor=None,
                 strokeColor=HexColor("#60a5fa"), strokeWidth=pr*0.45))
    d.add(Circle(px, py, 11*s,  fillColor=HexColor("#0f1e3c"), strokeColor=None))
    d.add(Circle(75*s, (92-20)*s, 5*s, fillColor=HexColor("#f59e0b"), strokeColor=None))

    return d


# ── Helpers ────────────────────────────────────────────────────────────────────

def _stat_cell(label, value, sub, color, styles) -> list:
    return [
        Paragraph(label.upper(), styles["stat_label"]),
        Paragraph(value,         _with_color(styles["stat_value"], color)),
        Paragraph(sub,           styles["stat_sub"]),
    ]


def _sp_tilt(bench) -> dict:
    if not bench.get("available"):
        return {"label": "N/A", "color": "#64748b", "detail": "No benchmark data"}
    over  = sum(1 for s in bench.get("sectors", []) if s.get("status") == "overweight")
    under = sum(1 for s in bench.get("sectors", []) if s.get("status") == "underweight")
    if over > under + 1:
        return {"label": "Growth Tilt",  "color": "#3b82f6", "detail": f"{over} sectors overweight"}
    if under > over + 1:
        return {"label": "Defensive",    "color": "#8b5cf6", "detail": f"{under} sectors underweight"}
    return {"label": "Balanced",         "color": "#10b981", "detail": "Close to S&P 500 weights"}


def _hline():
    from reportlab.platypus import HRFlowable
    return HRFlowable(width="100%", thickness=0.5, color=CARD_BORDER)


def _with_color(base: ParagraphStyle, color) -> ParagraphStyle:
    return ParagraphStyle(base.name + "_c", parent=base, textColor=color)


def _bare():
    return TableStyle(_bare_list())

def _bare_list():
    return [
        ("LEFTPADDING",   (0, 0), (-1, -1), 0),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 0),
        ("TOPPADDING",    (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]


def _table_style() -> TableStyle:
    return TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0),   HexColor("#0f1e3c")),
        ("TEXTCOLOR",     (0, 0), (-1, 0),   WHITE),
        ("FONTNAME",      (0, 0), (-1, 0),   "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, -1),  8),
        ("ALIGN",         (0, 0), (-1, -1),  "LEFT"),
        ("VALIGN",        (0, 0), (-1, -1),  "MIDDLE"),
        ("TOPPADDING",    (0, 0), (-1, -1),  4),
        ("BOTTOMPADDING", (0, 0), (-1, -1),  4),
        ("LEFTPADDING",   (0, 0), (-1, -1),  5),
        ("RIGHTPADDING",  (0, 0), (-1, -1),  5),
        ("BACKGROUND",    (0, 1), (-1, -1),  CARD_BG),
        ("ROWBACKGROUND", (0, 1), (-1, -1),  [CARD_BG, HexColor("#172033")]),
        ("BOX",           (0, 0), (-1, -1),  0.5, CARD_BORDER),
        ("LINEBELOW",     (0, 0), (-1, 0),   1,   BLUE),
        ("LINEBELOW",     (0, 1), (-1, -1),  0.25, CARD_BORDER),
    ])


# ── Styles ─────────────────────────────────────────────────────────────────────

def _styles() -> dict:
    from reportlab.lib.styles import getSampleStyleSheet
    base = getSampleStyleSheet()["Normal"]

    def s(name, **kw):
        return ParagraphStyle(name, parent=base, **kw)

    return {
        "logo_word": s("lw",
            fontSize=19, fontName="Helvetica-Bold",
            textColor=WHITE, leading=21),

        "hdr_subtitle": s("hs",
            fontSize=10, textColor=BLUE_LIGHT, spaceAfter=2),

        "hdr_meta": s("hm",
            fontSize=8, textColor=SLATE_500, spaceAfter=0),

        "hero_label": s("hl",
            fontSize=8, fontName="Helvetica-Bold",
            textColor=SLATE_400, spaceAfter=1,
            letterSpacing=1),

        "hero_value": s("hv",
            fontSize=30, fontName="Helvetica-Bold",
            textColor=WHITE, leading=34, spaceAfter=2),

        "hero_sub": s("hsu",
            fontSize=10, textColor=SLATE_300, spaceAfter=0),

        "section": s("sec",
            fontSize=8, fontName="Helvetica-Bold",
            textColor=BLUE_LIGHT, spaceAfter=0,
            letterSpacing=0.5),

        "stat_label": s("sl",
            fontSize=7, textColor=SLATE_400,
            leading=9, spaceAfter=1),

        "stat_value": s("sv",
            fontSize=13, fontName="Helvetica-Bold",
            textColor=WHITE, leading=15, spaceAfter=1),

        "stat_sub": s("ss",
            fontSize=7, textColor=SLATE_500,
            leading=9, spaceAfter=0),

        "th": s("th",
            fontSize=7, fontName="Helvetica-Bold",
            textColor=WHITE, leading=9),

        "td": s("td",
            fontSize=8, textColor=SLATE_300, leading=10),

        "td_num": s("tn",
            fontSize=7, textColor=SLATE_500, leading=10),

        "td_ticker": s("tck",
            fontSize=8, fontName="Helvetica-Bold",
            textColor=BLUE_LIGHT, leading=10),

        "td_right": s("tr",
            fontSize=8, textColor=SLATE_300,
            alignment=2, leading=10),

        "kv_key": s("kk",
            fontSize=8, textColor=SLATE_400, leading=10),

        "kv_val": s("kv",
            fontSize=9, fontName="Helvetica-Bold",
            textColor=WHITE, leading=11),

        "legend": s("leg",
            fontSize=7, textColor=SLATE_500, spaceAfter=0,
            spaceBefore=3),

        "bullet": s("bul",
            fontSize=8, textColor=SLATE_300, leading=11,
            leftIndent=4, spaceAfter=2),

        "insight": s("ins",
            fontSize=8, textColor=SLATE_300, leading=11),

        "disclaimer": s("dis",
            fontSize=7, textColor=SLATE_500, leading=9),
    }
