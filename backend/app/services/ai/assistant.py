"""
Portfolio AI Assistant using Anthropic claude-sonnet.

Constraints enforced in the system prompt:
  - Only answers questions about the user's uploaded portfolio.
  - Never makes specific buy/sell recommendations.
  - Frames all insights as educational observations.
  - Declines off-topic requests gracefully.
"""

import json
import logging
from typing import AsyncIterator

import anthropic

from app.config import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are PortfolioLens Assistant, an educational portfolio analysis tool.

You have access to the user's portfolio analytics below. Your job is to explain what the numbers mean, highlight observations, and answer questions about their specific holdings.

STRICT RULES:
1. Only answer questions related to the portfolio data provided. Decline off-topic questions politely.
2. Never say "you should buy", "you should sell", "invest in", or make specific investment recommendations.
3. Frame everything as educational observations: use phrases like "your data shows", "this may suggest", "one observation is", "from a diversification perspective", "historically, portfolios with...".
4. Never predict future performance of any security.
5. Always remind users you are not a licensed financial advisor if they ask for direct advice.
6. Be concise. Answer in 3–6 sentences unless a detailed breakdown is genuinely useful.
7. When citing numbers, use the exact values from the portfolio data provided.

PORTFOLIO DATA:
{portfolio_context}
"""


def build_portfolio_context(analytics: dict) -> str:
    """Build a text summary of portfolio analytics for the AI context window."""
    s = analytics.get("summary", {})
    risk = analytics.get("risk_score", {})
    div = analytics.get("diversification_score", {})
    conc = analytics.get("concentration", {})
    bench = analytics.get("benchmark", {})

    lines = [
        f"PORTFOLIO SUMMARY",
        f"  Total Value: ${s.get('total_value', 0):,.2f}",
        f"  Number of Holdings: {s.get('total_holdings', 0)}",
        f"  Unique Sectors: {s.get('unique_sectors', 0)}",
        f"",
        f"RISK & DIVERSIFICATION",
        f"  Risk Score: {risk.get('score', 'N/A')}/100 — {risk.get('label', 'N/A')}",
        f"  Weighted Beta: {risk.get('weighted_beta', 'N/A')}",
        f"  Diversification Score: {div.get('score', 'N/A')}/100 — {div.get('label', 'N/A')}",
        f"  Concentration (HHI): {conc.get('hhi_score', 'N/A')} — {conc.get('concentration_label', 'N/A')}",
        f"  Top 5 Holdings: {conc.get('top5_weight_pct', 'N/A')}% of portfolio",
        f"",
        f"TOP 10 HOLDINGS",
    ]

    for h in conc.get("top_holdings", [])[:10]:
        lines.append(
            f"  {h['ticker']} ({h.get('name', 'N/A')[:30]}): "
            f"{h.get('weight_pct', 0):.1f}% — {h.get('sector', 'Unknown')}"
        )

    lines.append("")
    lines.append("SECTOR ALLOCATION")
    for item in analytics.get("sector_breakdown", []):
        lines.append(f"  {item['sector']}: {item['weight_pct']}%")

    lines.append("")
    lines.append("ASSET CLASS ALLOCATION")
    for item in analytics.get("asset_class_breakdown", []):
        lines.append(f"  {item['asset_class']}: {item['weight_pct']}%")

    if bench.get("available"):
        lines.append("")
        lines.append("BENCHMARK DEVIATION vs S&P 500 (top deviations)")
        for item in bench.get("sectors", [])[:5]:
            direction = "overweight" if item["delta"] > 0 else "underweight"
            lines.append(
                f"  {item['sector']}: {item['portfolio_pct']}% vs S&P500 {item['sp500_pct']}% "
                f"({direction} by {abs(item['delta']):.1f}%)"
            )

    warnings = conc.get("warnings", [])
    if warnings:
        lines.append("")
        lines.append("ACTIVE WARNINGS")
        for w in warnings:
            lines.append(f"  [{w['severity'].upper()}] {w['title']}")

    gains = analytics.get("gains_summary", {})
    if gains.get("available"):
        lines.append("")
        lines.append("GAINS / LOSSES")
        lines.append(f"  Total Cost Basis: ${gains['total_cost_basis']:,.2f}")
        lines.append(f"  Total Market Value: ${gains['total_market_value']:,.2f}")
        lines.append(f"  Unrealized Gain/Loss: ${gains['total_gain_loss']:,.2f} ({gains['total_gain_loss_pct']:+.1f}%)")
        lines.append(f"  Positions with gains: {gains['positions_with_gains']}")
        lines.append(f"  Positions with losses: {gains['positions_with_losses']}")

    age_guidance = analytics.get("age_guidance")
    if age_guidance:
        lines.append("")
        lines.append(f"AGE-BASED CONTEXT (Age: {age_guidance['age']})")
        lines.append(f"  Actual Equity: {age_guidance['actual_equity_pct']}%")
        lines.append(f"  Suggested Equity: ~{age_guidance['suggested_equity_pct']}%")
        lines.append(f"  Alignment: {age_guidance['alignment']}")

    return "\n".join(lines)


async def stream_chat_response(
    user_message: str,
    conversation_history: list[dict],
    analytics: dict,
) -> AsyncIterator[str]:
    """
    Stream chat response tokens using Anthropic's streaming API.
    conversation_history: list of {role, content} dicts.
    """
    if not settings.anthropic_api_key:
        yield "PortfolioLens Assistant requires an Anthropic API key. Please add ANTHROPIC_API_KEY to your .env file."
        return

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    portfolio_context = build_portfolio_context(analytics)
    system = SYSTEM_PROMPT.format(portfolio_context=portfolio_context)

    # Build message history — cap at last 20 messages to stay within context
    messages = conversation_history[-20:] + [{"role": "user", "content": user_message}]

    try:
        with client.messages.stream(
            model="claude-sonnet-4-20250514",
            max_tokens=800,
            system=system,
            messages=messages,
        ) as stream:
            for text in stream.text_stream:
                yield text
    except anthropic.AuthenticationError:
        yield "Invalid Anthropic API key. Please check your ANTHROPIC_API_KEY in .env."
    except anthropic.RateLimitError:
        yield "Rate limit reached. Please wait a moment and try again."
    except Exception as e:
        logger.error(f"AI assistant error: {e}")
        yield "The AI assistant encountered an error. Please try again."
