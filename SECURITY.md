# Security Policy

## Supported Versions

TRUSTPASS is currently pre-1.0. Security fixes are accepted against the `main`
branch and the currently deployed public demo environment.

## Reporting a Vulnerability

Please use GitHub private vulnerability reporting or a private repository
security advisory for this repository when available.

If private reporting is unavailable, open a minimal GitHub issue asking the
maintainer to enable a private disclosure channel. Do not include exploit
details, secrets, tokens, personally identifiable information, or live customer
data in public issues.

Useful reports include:

- affected route, workflow, or component
- impact and who can trigger it
- minimal reproduction steps using dummy data
- logs, request IDs, or screenshots with secrets removed
- whether the issue affects the public Pages gateway, Render API, database,
  GitHub Actions, or local development only

## Demo Data Boundary

The public TRUSTPASS deployment is intended to use synthetic seed, QA, and proof
records until real customer onboarding is explicitly enabled. Treat any unknown
or real-looking organization data in the public demo environment as a security
and privacy review issue.

## Scope

In scope:

- authentication and authorization bypasses
- tenant isolation failures
- document metadata or object-key exposure
- buyer/private review data leakage
- audit log tampering or missing audit events for privileged actions
- public gateway write access without admin authorization
- secrets in source, workflows, logs, or generated artifacts
- production deployments using `AUTH_MODE=development_headers` for real customer
  data

Out of scope:

- denial-of-service testing against live hosted services
- social engineering
- physical attacks
- scanner-only reports without a concrete vulnerable path
