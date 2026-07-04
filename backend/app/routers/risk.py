import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.risk_profile import RiskProfile
from app.models.user import User
from app.services.auth.dependencies import get_current_user, get_current_user_optional
from app.services.risk.scoring import QUESTIONS, score_answers

router = APIRouter(prefix="/api/risk", tags=["risk"])


class SubmitRequest(BaseModel):
    answers: list[int] = Field(min_length=5, max_length=5)

    @field_validator("answers")
    @classmethod
    def _validate_answers(cls, v: list[int]) -> list[int]:
        for a in v:
            if a < 1 or a > 5:
                raise ValueError("Each answer must be between 1 and 5.")
        return v


@router.get("/questions")
def get_questions():
    return {"questions": QUESTIONS}


@router.post("/submit")
def submit_answers(
    req: SubmitRequest,
    user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    try:
        result = score_answers(req.answers)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    if user is not None:
        profile = db.get(RiskProfile, user.id)
        if profile is None:
            profile = RiskProfile(user_id=user.id)
            db.add(profile)
        profile.score = result["score"]
        profile.bucket = result["bucket"]
        profile.answers_json = json.dumps(req.answers)
        db.commit()

    return result


@router.get("/me")
def get_my_risk_profile(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.get(RiskProfile, user.id)
    if profile is None:
        raise HTTPException(status_code=404, detail="You haven't taken the risk assessment yet.")

    from app.services.risk.scoring import RISK_BUCKETS

    bucket_info = next((b for b in RISK_BUCKETS if b["bucket"] == profile.bucket), None)
    return {
        "score": profile.score,
        "bucket": profile.bucket,
        "allocation": bucket_info["allocation"] if bucket_info else None,
        "description": bucket_info["description"] if bucket_info else None,
        "answers": json.loads(profile.answers_json),
        "computed_at": profile.computed_at,
    }
