from sqlalchemy import Column, String, Float, Integer, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Session(Base):
    __tablename__ = "sessions"

    id = Column(String, primary_key=True, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    age = Column(Integer, nullable=True)
    total_value = Column(Float, nullable=True)
    filename = Column(String, nullable=True)

    holdings = relationship("Holding", back_populates="session", cascade="all, delete-orphan")
    analytics_cache = relationship(
        "AnalyticsCache", back_populates="session", uselist=False, cascade="all, delete-orphan"
    )


class Holding(Base):
    __tablename__ = "holdings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String, ForeignKey("sessions.id"), nullable=False, index=True)

    # Core fields (always populated)
    ticker = Column(String, nullable=False)
    name = Column(String, nullable=True)
    shares = Column(Float, nullable=True)
    market_value = Column(Float, nullable=False)
    weight = Column(Float, nullable=False)  # 0.0 – 1.0

    # Optional cost fields
    cost_basis = Column(Float, nullable=True)
    gain_loss = Column(Float, nullable=True)
    gain_loss_pct = Column(Float, nullable=True)

    # Market data (from yfinance)
    asset_class = Column(String, nullable=True)   # Stock, ETF, Mutual Fund, etc.
    sector = Column(String, nullable=True)
    industry = Column(String, nullable=True)
    dividend_yield = Column(Float, nullable=True)
    expense_ratio = Column(Float, nullable=True)  # ETFs only
    beta = Column(Float, nullable=True)
    current_price = Column(Float, nullable=True)
    broad_market = Column(Integer, nullable=True, default=0)  # bool stored as int
    etf_theme = Column(String, nullable=True)

    session = relationship("Session", back_populates="holdings")


class AnalyticsCache(Base):
    __tablename__ = "analytics_cache"

    session_id = Column(String, ForeignKey("sessions.id"), primary_key=True)
    analytics_json = Column(Text, nullable=False)
    computed_at = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("Session", back_populates="analytics_cache")
