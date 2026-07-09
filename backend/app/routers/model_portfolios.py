from fastapi import APIRouter, HTTPException

from app.data.model_portfolios import MODEL_PORTFOLIOS
from app.services.model_portfolios.engine import (
    get_allocation_breakdown,
    get_blended_expense_ratio,
    get_performance,
)

router = APIRouter(prefix="/api/model-portfolios", tags=["model-portfolios"])

_BY_ID = {p["id"]: p for p in MODEL_PORTFOLIOS}

_VALID_PERIODS = {"1y", "2y", "3y", "5y"}


def _serialize(portfolio: dict) -> dict:
    return {
        "id": portfolio["id"],
        "name": portfolio["name"],
        "risk_bucket": portfolio["risk_bucket"],
        "description": portfolio["description"],
        "holdings": portfolio["holdings"],
        "tags": portfolio["tags"],
        "blended_expense_ratio": get_blended_expense_ratio(portfolio),
        "allocation_breakdown": get_allocation_breakdown(portfolio),
    }


@router.get("")
def list_model_portfolios():
    return [_serialize(p) for p in MODEL_PORTFOLIOS]


@router.get("/{portfolio_id}")
def get_model_portfolio(portfolio_id: str):
    portfolio = _BY_ID.get(portfolio_id)
    if portfolio is None:
        raise HTTPException(status_code=404, detail="Model portfolio not found.")
    return _serialize(portfolio)


@router.get("/{portfolio_id}/performance")
def get_model_portfolio_performance(portfolio_id: str, period: str = "3y"):
    portfolio = _BY_ID.get(portfolio_id)
    if portfolio is None:
        raise HTTPException(status_code=404, detail="Model portfolio not found.")
    if period not in _VALID_PERIODS:
        period = "3y"

    result = get_performance(portfolio, period)
    if result is None:
        raise HTTPException(
            status_code=502,
            detail="Market data is temporarily unavailable. Please try again in a moment.",
        )
    return result
