# Trust Scoring

TRUSTPASS uses an extendable weighted score out of 100. The score helps admins make review decisions and gives buyers a simplified trust level without exposing sensitive internal evidence.

## Initial Weights

- Core business identity completeness: 15
- Tax and registration documents: 20
- Bank/account proof: 10
- Address proof: 10
- References validated: 15
- Case studies present or verified: 10
- Category-specific compliance documents: 15
- Responsiveness and onboarding completion: 5

## Trust Levels

- `premium_verified`: 90 to 100
- `trusted`: 80 to 89
- `verified`: 70 to 79
- `in_review`: 40 to 69
- `unverified`: 0 to 39

## Recalculation Triggers

- Document approved, rejected, expired, or replaced.
- Verification check passed, failed, waived, or marked not applicable.
- Reference validation changes.
- Case study validation changes.
- Vendor submits or resubmits onboarding.
- Badge expiry or renewal events.

## Persistence

- Current vendor score lives on `vendor_profiles`.
- Per-request score lives on `verification_requests`.
- Check-level evidence lives on `verification_checks`.
- Historical recalculations live on `trust_score_snapshots`.

## Buyer Exposure

Buyers can see trust level, active badges, approved verification status, and simplified category summaries. Buyers cannot see private document metadata, object keys, internal notes, failed evidence details, or audit diffs.

