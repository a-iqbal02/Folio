from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey
from sqlalchemy.sql import func

from app.database import Base


class RiskProfile(Base):
    """A user's latest risk-assessment result. One row per user (upserted on
    resubmission, not versioned/history-tracked)."""

    __tablename__ = "risk_profiles"

    user_id = Column(String, ForeignKey("users.id"), primary_key=True)
    score = Column(Integer, nullable=False)
    bucket = Column(String, nullable=False)
    answers_json = Column(Text, nullable=False)
    computed_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
