"""
Risk assessment questionnaire: single source of truth for the questions,
scoring, risk buckets, and target asset allocations. Kept server-side (not
hardcoded in the frontend) so copy/weights can be tuned without a frontend
deploy.
"""

QUESTIONS = [
    {
        "id": "time_horizon",
        "question": "When do you expect to need this money?",
        "choices": [
            {"value": 1, "label": "Less than 2 years"},
            {"value": 2, "label": "2–5 years"},
            {"value": 3, "label": "5–10 years"},
            {"value": 4, "label": "10–20 years"},
            {"value": 5, "label": "20+ years"},
        ],
    },
    {
        "id": "drop_reaction",
        "question": "Your portfolio drops 20% in a month. What do you do?",
        "choices": [
            {"value": 1, "label": "Sell everything immediately"},
            {"value": 2, "label": "Sell some to reduce risk"},
            {"value": 3, "label": "Do nothing and wait it out"},
            {"value": 4, "label": "Hold, and consider buying a little more"},
            {"value": 5, "label": "Buy more aggressively — it's a discount"},
        ],
    },
    {
        "id": "primary_goal",
        "question": "What best describes your main investing goal?",
        "choices": [
            {"value": 1, "label": "Preserve capital, avoid any loss"},
            {"value": 2, "label": "Generate steady income"},
            {"value": 3, "label": "Balanced growth and income"},
            {"value": 4, "label": "Grow wealth over the long term"},
            {"value": 5, "label": "Maximize long-term growth, big swings are fine"},
        ],
    },
    {
        "id": "experience",
        "question": "How would you describe your investing experience?",
        "choices": [
            {"value": 1, "label": "None — this is my first time"},
            {"value": 2, "label": "A little — mostly savings/CDs"},
            {"value": 3, "label": "Some — I own a few funds/ETFs"},
            {"value": 4, "label": "Experienced with stocks/ETFs"},
            {"value": 5, "label": "Very experienced, comfortable with volatility"},
        ],
    },
    {
        "id": "risk_capacity",
        "question": "What share of your savings could you invest without needing it for emergencies?",
        "choices": [
            {"value": 1, "label": "Under 5%"},
            {"value": 2, "label": "5–15%"},
            {"value": 3, "label": "15–30%"},
            {"value": 4, "label": "30–50%"},
            {"value": 5, "label": "50%+"},
        ],
    },
]

MIN_SCORE = len(QUESTIONS) * 1
MAX_SCORE = len(QUESTIONS) * 5

RISK_BUCKETS = [
    {
        "bucket": "Conservative",
        "min_score": 5,
        "max_score": 8,
        "description": "You prioritize protecting what you have over growth. A bond-heavy allocation aims to limit downside swings.",
        "allocation": {"US Equities": 20, "International Equities": 10, "Bonds": 65, "Commodities": 5},
    },
    {
        "bucket": "Moderate",
        "min_score": 9,
        "max_score": 12,
        "description": "You want some growth but with a meaningful cushion. A bond-tilted mix balances stability and upside.",
        "allocation": {"US Equities": 35, "International Equities": 15, "Bonds": 45, "Commodities": 5},
    },
    {
        "bucket": "Balanced",
        "min_score": 13,
        "max_score": 16,
        "description": "You're comfortable splitting the difference between growth and stability across stocks and bonds.",
        "allocation": {"US Equities": 45, "International Equities": 20, "Bonds": 30, "Commodities": 5},
    },
    {
        "bucket": "Growth",
        "min_score": 17,
        "max_score": 20,
        "description": "You're focused on long-term growth and can tolerate significant short-term swings for it.",
        "allocation": {"US Equities": 55, "International Equities": 25, "Bonds": 15, "Commodities": 5},
    },
    {
        "bucket": "Aggressive",
        "min_score": 21,
        "max_score": 25,
        "description": "You're maximizing long-term growth potential and are comfortable with large swings along the way.",
        "allocation": {"US Equities": 65, "International Equities": 30, "Bonds": 0, "Commodities": 5},
    },
]


def score_answers(answers: list[int]) -> dict:
    """
    answers: a list of 5 ints (1-5), one per question in QUESTIONS order.
    Returns {score, bucket, allocation, description}.
    """
    if len(answers) != len(QUESTIONS):
        raise ValueError(f"Expected {len(QUESTIONS)} answers, got {len(answers)}")
    for a in answers:
        if not isinstance(a, int) or a < 1 or a > 5:
            raise ValueError(f"Each answer must be an integer 1-5, got {a!r}")

    score = sum(answers)

    for bucket in RISK_BUCKETS:
        if bucket["min_score"] <= score <= bucket["max_score"]:
            return {
                "score": score,
                "bucket": bucket["bucket"],
                "allocation": bucket["allocation"],
                "description": bucket["description"],
            }

    # Should be unreachable given MIN_SCORE/MAX_SCORE bounds, but fall back
    # to the closest bucket rather than raising, in case bucket ranges are
    # ever retuned without covering the full 5-25 span.
    closest = min(RISK_BUCKETS, key=lambda b: min(abs(score - b["min_score"]), abs(score - b["max_score"])))
    return {
        "score": score,
        "bucket": closest["bucket"],
        "allocation": closest["allocation"],
        "description": closest["description"],
    }
