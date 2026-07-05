# TRUSTPASS Live Operations

This app is the live, persistent TRUSTPASS operations surface for OpenAI Sites.
It uses a D1 binding named `DB` and stores vendor organizations, document
metadata, buyer requests, verification decisions, audit events, and request
logs.

It intentionally starts empty, with no vendor or buyer records. Use the UI or
`/api/trustpass` actions to create live records and verify the end-to-end flow.

## Local Commands

```bash
pnpm install
pnpm run build
pnpm run dev
pnpm run e2e:live -- --base-url http://localhost:4175/
```

## API Actions

`GET /api/health` reports the Worker surface and live-mode flag.

`GET /api/readiness` verifies the D1 binding and required schema tables.

`POST /api/trustpass` accepts:

- `create_vendor`
- `create_buyer`
- `add_document`
- `create_buyer_request`
- `decide_verification`

Every API response includes an `x-request-id`, every request is persisted to
`request_logs`, and every write action creates an `audit_events` row carrying
the same request ID for operational sanity checks.

## Live Acceptance Gate

Set the repository variable `TRUSTPASS_LIVE_BASE_URL` to the deployed Worker URL
after a real host is available. The `TRUSTPASS Live App` workflow will run the
same end-to-end proof against that deployed URL.

The GitHub Pages URL is not a valid value for `TRUSTPASS_LIVE_BASE_URL`; it is a
static demo and does not expose `/api/health`, `/api/readiness`, or D1-backed
write APIs.
