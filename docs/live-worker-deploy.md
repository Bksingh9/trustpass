# TRUSTPASS Live Worker Deploy

GitHub Pages is the public static gateway. It cannot run the TRUSTPASS API or
write to a database, so the live end-to-end path is deployed separately as a
Cloudflare Worker with a D1 database.

## Required GitHub Setup

Add these repository secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

The token must be allowed to deploy Workers and apply D1 migrations for the
target account.

Before attempting deployment, the workflow verifies the Cloudflare API token and
checks D1 account access so missing or under-scoped secrets fail before database
creation, migrations, or Worker upload.

The workflow can use an existing Cloudflare D1 database ID, or it can resolve an
existing database by name and create it when it does not exist.

The repository variable `TRUSTPASS_LIVE_BASE_URL` must eventually point to the
deployed HTTPS Worker URL. Do not set it to GitHub Pages or localhost. The
`TRUSTPASS Live App` workflow intentionally fails its `Deployed live E2E` job
until that variable is configured, because a skipped deployed proof would make
the repository look live when only the local D1 proof has passed.

Cloudflare's Worker CI/CD guide documents the same secret boundary for
non-interactive Wrangler deploys. Cloudflare's D1 migration guide documents
`migrations_dir` inside the D1 binding, which is why the workflow patches the
generated Wrangler config after the app build.

## Manual Deploy

Run the GitHub Actions workflow named `Deploy TRUSTPASS Live Worker` from the
Actions tab.

Use these inputs:

- `worker_name`: default `trustpass-live`
- `d1_database_name`: the D1 database name; default `trustpass-live`
- `d1_database_id`: optional existing D1 database ID; leave blank to resolve or
  create by name
- `d1_primary_location_hint`: optional D1 location hint
- `live_base_url`: optional deployed Worker URL. Leave blank to parse the URL
  from Wrangler deploy output.

The workflow resolves or creates the D1 database, installs the live app, builds
the Worker bundle, patches the generated `dist/server/wrangler.json` with the
real Worker and D1 binding, applies the D1 migrations, deploys the Worker,
resolves and validates the HTTPS Worker URL, runs the deployed E2E proof against
that URL, persists
`TRUSTPASS_LIVE_BASE_URL` for future pushes when the GitHub token has variable
write access, then publishes the GitHub Pages gateway preconnected to the
deployed Worker URL.

## Acceptance Proof

The deployed proof checks:

- `GET /api/health`
- `GET /api/readiness`
- health identity `service: trustpass-live` and `runtime: sites-worker-d1`
- CORS preflight for the public Pages origin
- root app renders the live operations UI
- no seeded demo/vendor strings are present
- live vendor, buyer, document, buyer request, and verification decision writes
- final persistence read
- matching `x-request-id`, `request_logs`, and `audit_events`

The deploy workflow uploads a `trustpass-live-deployment-proof` artifact with a
machine-readable JSON summary of the live E2E run and the Wrangler deploy log.
The proof includes the resolved base URL, run ID, request IDs, created entity
IDs/names, final persisted record counts, readiness evidence, and completed
checks.

After the Worker is live, set repository variable `TRUSTPASS_LIVE_BASE_URL` to
the same Worker URL if the deploy workflow could not save it automatically. The
existing `TRUSTPASS Live App` workflow will then run the deployed-live
acceptance check on future pushes, and ordinary Pages builds will keep embedding
that URL as the default public gateway connection.

## Public Site Wiring

Open `https://bksingh9.github.io/trustpass/`, enter the Worker URL in the live
API connection field, and save it. The gateway will then call the Worker API
instead of serving any local seeded state.

When repository variable `TRUSTPASS_LIVE_BASE_URL` is set before the Pages
workflow runs, the public gateway is preconnected to that Worker URL. The manual
connection form remains available as an override for testing a different live
host.

The deploy workflow also publishes the gateway immediately after live E2E passes,
using its `live_base_url` input. That means a successful production deploy does
not require a separate Pages rebuild before the public site can use the live API.
It also attempts to save the same URL as repository variable
`TRUSTPASS_LIVE_BASE_URL` so future push workflows keep testing the deployed
API.
After publishing, the workflow verifies the public GitHub Pages URL itself and
uploads `trustpass-public-gateway-proof`, which confirms the gateway is live,
preconnected to the Worker URL, free of seeded demo strings, and still serving
`/api/health` as a static 404 rather than a fake API.

Use the manual `Verify TRUSTPASS Live URL` workflow to re-run the deployed API
and public gateway proofs against any Worker URL without redeploying. It rejects
GitHub Pages and localhost before running the E2E proof, then uploads separate
`trustpass-live-url-api-proof` and `trustpass-live-url-public-gateway-proof`
artifacts.

## References

- [Cloudflare Workers GitHub Actions](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/)
- [Cloudflare D1 database API](https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/list/)
- [Cloudflare D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/)
- [GitHub Pages documentation](https://docs.github.com/en/pages)
