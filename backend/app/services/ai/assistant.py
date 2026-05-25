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

SYSTEM_PROMPT = """You are Folio Assistant, an educational portfolio analysis tool.

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


# Model fallback chain. Tries each in order until one works.
# Keeps the assistant alive even if one model name is retired or
# unavailable to a given key.
MODEL_CHAIN = [
    "claude-sonnet-4-6",
    "claude-haiku-4-5-20251001",
    "claude-3-5-sonnet-latest",
    "claude-3-5-sonnet-20241022",
]


async def stream_chat_response(
    user_message: str,
    conversation_history: list[dict],
    analytics: dict,
) -> AsyncIterator[str]:
    """
    Stream chat response tokens using Anthropic's API.

    Robustness:
      - Tries a chain of model names so a single retired model does not
        break the assistant.
      - Falls back to a non-streaming call if streaming fails.
      - Surfaces the real error class to the user instead of a generic
        message, so misconfigurations are diagnosable.
    """
    if not settings.anthropic_api_key:
        yield (
            "The AI assistant is not configured yet. The site owner needs to "
            "add a valid ANTHROPIC_API_KEY in the server environment."
        )
        return

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    portfolio_context = build_portfolio_context(analytics)
    system = SYSTEM_PROMPT.format(portfolio_context=portfolio_context)
    messages = conversation_history[-20:] + [{"role": "user", "content": user_message}]

    last_error: Exception | None = None

    for model in MODEL_CHAIN:
        # Attempt 1: streaming
        try:
            produced = False
            with client.messages.stream(
                model=model,
                max_tokens=800,
                system=system,
                messages=messages,
            ) as stream:
                for text in stream.text_stream:
                    produced = True
                    yield text
            if produced:
                return
        except anthropic.AuthenticationError:
            yield (
                "The AI assistant could not authenticate. The API key on the "
                "server appears to be invalid or expired."
            )
            return
        except anthropic.RateLimitError:
            yield "The AI assistant is rate limited right now. Please wait a moment and try again."
            return
        except anthropic.BadRequestError as e:
            # 400 can mean malformed messages OR a billing/credit issue.
            # Detect billing errors specifically so the user gets a useful message.
            err_str = str(e).lower()
            if "credit balance" in err_str or "too low" in err_str or "billing" in err_str:
                yield (
                    "The AI assistant is currently unavailable — the API account has run out of credits. "
                    "Please contact the site owner to top up credits at console.anthropic.com/billing."
                )
            else:
                logger.error(f"BadRequestError on {model}: {e}")
                yield (
                    "The AI assistant received a malformed request. "
                    "This can happen if a previous response was empty. "
                    "Please refresh and try again."
                )
            return
        except anthropic.NotFoundError as e:
            # Model name not available to this key; try the next model.
            last_error = e
            logger.warning(f"Model {model} not available, trying next. {e}")
            continue
        except Exception as e:
            last_error = e
            logger.warning(f"Streaming failed on {model}: {e}. Trying non-streaming.")

        # Attempt 2: non-streaming fallback for this same model
        try:
            resp = client.messages.create(
                model=model,
                max_tokens=800,
                system=system,
                messages=messages,
            )
            text = "".join(
                block.text for block in resp.content if getattr(block, "type", "") == "text"
            )
            if text:
                yield text
                return
        except anthropic.NotFoundError as e:
            last_error = e
            continue
        except Exception as e:
            last_error = e
            logger.warning(f"Non-streaming also failed on {model}: {e}")
            continue

    # Every model failed. Surface a useful, specific message.
    logger.error(f"All models failed in chain. Last error: {last_error}")
    yield (
        "The AI assistant could not reach a working model. "
        f"(Technical detail: {type(last_error).__name__ if last_error else 'unknown'}). "
        "If you are the site owner, verify the API key and that your account "
        "has access to a current Claude model."
    )
