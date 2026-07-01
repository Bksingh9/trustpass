from __future__ import annotations

from app.models.enums import VerificationCheckStatus
from app.services.trust_scoring import ScoreInput, calculate_trust_score, trust_level_for_score


def test_trust_level_thresholds() -> None:
    assert trust_level_for_score(95) == "premium_verified"
    assert trust_level_for_score(82) == "trusted"
    assert trust_level_for_score(72) == "verified"
    assert trust_level_for_score(41) == "in_review"
    assert trust_level_for_score(10) == "unverified"


def test_calculate_trust_score_awards_only_passed_checks() -> None:
    result = calculate_trust_score(
        [
            ScoreInput("identity", VerificationCheckStatus.passed, 15),
            ScoreInput("tax", VerificationCheckStatus.failed, 20),
            ScoreInput("references", VerificationCheckStatus.passed, 15),
        ]
    )

    assert result.score == 30
    assert result.trust_level == "unverified"
    assert result.breakdown == {"identity": 15, "tax": 0, "references": 15}
    assert result.reasons == ["identity: passed", "references: passed"]


def test_calculate_trust_score_caps_at_100() -> None:
    result = calculate_trust_score(
        [
            ScoreInput("identity", VerificationCheckStatus.passed, 60),
            ScoreInput("compliance", VerificationCheckStatus.passed, 60),
        ]
    )

    assert result.score == 100
    assert result.trust_level == "premium_verified"

