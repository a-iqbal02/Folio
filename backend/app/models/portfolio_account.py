import uuid

from sqlalchemy import Column, String, Float, Integer, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Portfolio(Base):
    """A user-owned, persisted portfolio. Structurally mirrors the anonymous
    Session/Holding/AnalyticsCache tables in models/portfolio.py, kept as a
    separate table set so the guest upload flow never has to reason about
    ownership."""

    __tablename__ = "portfolios"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    name = Column(String, nullable=False, default="My Portfolio")
    source_session_id = Column(String, ForeignKey("sessions.id"), nullable=True)
    age = Column(Integer, nullable=True)
    goals = Column(Text, nullable=True)
    total_value = Column(Float, nullable=True)
    filename = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    holdings = relationship(
        "PortfolioHolding", back_populates="portfolio", cascade="all, delete-orphan"
    )
    analytics_cache = relationship(
        "PortfolioAnalyticsCache", back_populates="portfolio", uselist=False, cascade="all, delete-orphan"
    )
    transactions = relationship(
        "Transaction", back_populates="portfolio", cascade="all, delete-orphan"
    )


class PortfolioHolding(Base):
    __tablename__ = "portfolio_holdings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    portfolio_id = Column(String, ForeignKey("portfolios.id"), nullable=False, index=True)

    ticker = Column(String, nullable=False)
    name = Column(String, nullable=True)
    shares = Column(Float, nullable=True)
    market_value = Column(Float, nullable=False)
    weight = Column(Float, nullable=False)

    cost_basis = Column(Float, nullable=True)
    gain_loss = Column(Float, nullable=True)
    gain_loss_pct = Column(Float, nullable=True)

    asset_class = Column(String, nullable=True)
    sector = Column(String, nullable=True)
    industry = Column(String, nullable=True)
    dividend_yield = Column(Float, nullable=True)
    expense_ratio = Column(Float, nullable=True)
    beta = Column(Float, nullable=True)
    current_price = Column(Float, nullable=True)
    broad_market = Column(Integer, nullable=True, default=0)
    etf_theme = Column(String, nullable=True)

    portfolio = relationship("Portfolio", back_populates="holdings")


class PortfolioAnalyticsCache(Base):
    __tablename__ = "portfolio_analytics_cache"

    portfolio_id = Column(String, ForeignKey("portfolios.id"), primary_key=True)
    analytics_json = Column(Text, nullable=False)
    computed_at = Column(DateTime(timezone=True), server_default=func.now())

    portfolio = relationship("Portfolio", back_populates="analytics_cache")


class Transaction(Base):
    """Audit/history log of portfolio snapshot events (upload, refresh, manual
    edit, claim) — not lot-level buy/sell tracking. Brokerage exports Folio
    ingests are point-in-time holdings snapshots, not trade histories."""

    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    portfolio_id = Column(String, ForeignKey("portfolios.id"), nullable=False, index=True)
    event_type = Column(String, nullable=False)  # "upload" | "refresh" | "manual_edit" | "claim"
    total_value_snapshot = Column(Float, nullable=True)
    note = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    portfolio = relationship("Portfolio", back_populates="transactions")
