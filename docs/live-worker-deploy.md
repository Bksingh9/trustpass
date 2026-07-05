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

The workflow can use an existing Cloudflare D1 database ID, or it can resolve an
existing database by name and create it when it does not exist.

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
- `live_base_url`: the deployed Worker URL, for example
  `https://trustpass-live.<account>.workers.dev/`

The workflow resolves or creates the D1 database, installs the live app, builds
the Worker bundle, patches the generated `dist/server/wrangler.json` with the
real Worker and D1 binding, applies the D1 migrations, deploys the Worker, runs
the deployed E2E proof, then publishes the GitHub Pages gateway preconnected to
the deployed Worker URL.

## Acceptance Proof

The deployed proof checks:

- `GET /api/health`
- `GET /api/readiness`
- CORS preflight for the public Pages origin
- root app renders the live operations UI
- no seeded demo/vendor strings are present
- live vendor, buyer, document, buyer request, and verification decision writes
- final persistence read
- matching `x-request-id`, `request_logs`, and `audit_events`

After the Worker is live, set repository variable `TRUSTPASS_LIVE_BASE_URL` to
the same Worker URL. The existing `TRUSTPASS Live App` workflow will then run
the deployed-live acceptance check on future pushes, and ordinary Pages builds
will keep embedding that URL as the default public gateway connection.

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

## References

- [Cloudflare Workers GitHub Actions](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/)
- [Cloudflare D1 database API](https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/list/)
- [Cloudflare D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/)
- [GitHub Pages documentation](https://docs.github.com/en/pages)
