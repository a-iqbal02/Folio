from sqlalchemy import Column, String, Float, Integer, DateTime
from sqlalchemy.sql import func

from app.database import Base


class EtfPriceCache(Base):
    """Server-side cache of live-fetched ETF price/return data, refreshed on
    a background schedule (see services/market/price_refresh.py) so the
    screener doesn't hammer Stooq/Yahoo on every request."""

    __tablename__ = "etf_price_cache"

    ticker = Column(String, primary_key=True)
    last_price = Column(Float, nullable=True)
    return_1y_pct = Column(Float, nullable=True)
    return_ytd_pct = Column(Float, nullable=True)
    as_of = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    fetch_ok = Column(Integer, default=1)  # 0 if the last fetch attempt failed
