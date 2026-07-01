from __future__ import annotations

from dataclasses import dataclass

from app.models.enums import VerificationCheckStatus


DEFAULT_WEIGHTS = {
    "business_identity": 15,
    "tax_registration": 20,
    "bank_account": 10,
    "address_proof": 10,
    "references": 15,
    "case_studies": 10,
    "category_compliance": 15,
    "responsiveness": 5,
}


@dataclass(frozen=True)
class ScoreInput:
    category: str
    status: VerificationCheckStatus
    weight: int


@dataclass(frozen=True)
class ScoreResult:
    score: int
    trust_level: str
    breakdown: dict[str, int]
    reasons: list[str]


def trust_level_for_score(score: int) -> str:
    if score >= 90:
        return "premium_verified"
    if score >= 80:
        return "trusted"
    if score >= 70:
        return "verified"
    if score >= 40:
        return "in_review"
    return "unverified"


def calculate_trust_score(checks: list[ScoreInput]) -> ScoreResult:
    breakdown: dict[str, int] = {}
    reasons: list[str] = []

    for check in checks:
        awarded = check.weight if check.status == VerificationCheckStatus.passed else 0
        breakdown[check.category] = breakdown.get(check.category, 0) + awarded
        if awarded:
            reasons.append(f"{check.category}: passed")

    score = min(100, sum(breakdown.values()))
    return ScoreResult(
        score=score,
        trust_level=trust_level_for_score(score),
        breakdown=breakdown,
        reasons=reasons,
    )

