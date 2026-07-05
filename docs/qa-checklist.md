# QA Checklist

## Backend

- Health endpoint returns `200`.
- Readiness endpoint checks database connectivity.
- Demo workflow health returns `200` at `/api/v1/demo/health` without requiring database connectivity.
- API errors follow the common error format.
- Supabase auth boundary is respected.
- RBAC blocks unauthorized vendor, buyer, admin, and super admin actions.
- Tenant-owned records are filtered by organization.
- Audit events are written for important state changes.

## Vendor Flow

- Signup/login works through Supabase.
- Vendor organization can be created.
- Onboarding progress can be saved.
- Documents can be uploaded with allowed file types only.
- Replacement documents keep history.
- Vendor can submit verification only after required data is present.

## Admin Flow

- Review queue shows submitted and under-review requests.
- Admin can approve or reject documents.
- Admin can complete weighted checks.
- Trust score recalculates after review changes.
- Approval assigns badges according to thresholds.
- Rejection and change requests notify vendors.

## Buyer Flow

- Buyer search uses buyer-safe fields only.
- Buyer search never exposes private document metadata or admin review notes.
- Filters work for category, location, trust status, badge, capability, and team size.
- Buyer can shortlist a vendor.
- Buyer can request clarification or additional document summary.
- Vendor receives buyer request notification.

## Billing And Notifications

- Plans are returned by billing API.
- Mock checkout returns a consistent provider result.
- Notification records are generated for workflow events.
- Celery scheduled tasks can run without crashing.

## Smoke Test

1. Start Compose.
2. Open API docs.
3. Open web app.
4. Confirm landing, vendor, buyer, and admin pages render.
5. Run backend tests.

## End-to-End Demo Contract

1. Reset demo state through `/api/v1/demo/reset`.
2. Submit vendor renewal through `/api/v1/demo/vendor/renewal`.
3. Search buyer-safe vendors through `/api/v1/demo/buyers/search`.
4. Create a shortlist through `/api/v1/demo/buyers/shortlists`.
5. Create a buyer request through `/api/v1/demo/buyers/requests`.
6. Approve a review through `/api/v1/demo/admin/reviews/{review_id}/approve`.
7. Submit a contact request through `/api/v1/demo/contact/demo-requests`.
8. Confirm audit-style events are present in `/api/v1/demo/state`.

## Real-Data API Contract

1. Run PostgreSQL migrations and `python -m app.db.seed`.
2. Set `TRUSTPASS_REAL_DB_TESTS=1`.
3. Run `pytest tests/test_real_data_e2e.py`.
4. Confirm the test uses `/api/v1/buyers`, `/api/v1/documents`, `/api/v1/vendors`, `/api/v1/verification`, and `/api/v1/audit`.
5. Confirm no `/api/v1/demo/*` route is used by the real-data E2E.
6. Confirm responses include `x-request-id`.
7. Confirm audit events include `upload`, `review`, `submit`, and `approve`.
8. Confirm activity logs include `upload_document`, `submit_verification`, and `decide_verification`.

## No-Cloudflare Render Live Contract

1. Deploy `render.yaml` with the `trustpass-api` service and `trustpass-postgres` database.
2. Confirm production env has `ENABLE_DEMO_ROUTES=false` and `TRUSTPASS_SEED_ON_START=true` for bootstrap verification.
3. Set repository variable `TRUSTPASS_API_BASE_URL` to the deployed API URL.
4. Run `.github/workflows/verify-deployed-api.yml` or `python apps/api/scripts/e2e_deployed_real_api.py --base-url <api-url>`.
5. Confirm `/api/v1/health` and `/api/v1/readiness` pass on the public HTTPS API.
6. Confirm `/api/v1/demo/health` returns `404`.
7. Confirm the deployed proof creates live shortlist, buyer request, document, review, verification decision, audit events, and activity logs through production routes.
8. Confirm every proof response has an `x-request-id`.

## API-Backed Browser Demo

1. Start FastAPI on `http://127.0.0.1:8000`.
2. Build and serve Pages locally on `http://127.0.0.1:4174`.
3. Open `/?api=http%3A%2F%2F127.0.0.1%3A8000%2Fapi%2Fv1#/`.
4. Confirm the home screen shows `API connected`.
5. Use the UI to submit renewal, shortlist, request, approve, and submit a demo request.
6. Confirm `/api/v1/demo/state` reflects `submitted`, one shortlist, one buyer request, one demo request, approved review, and audit events.

## Optional Worker/D1 Live Contract

1. Run `npm run e2e:live` from `apps/live` against the deployed Worker URL.
2. Confirm `/api/health` returns `service: trustpass-live`, `runtime: sites-worker-d1`, and `demo_data_enabled: false`.
3. Confirm `/api/readiness` reports D1 connected with no missing tables.
4. Confirm the E2E creates a vendor, buyer, document, buyer request, and verification decision.
5. Confirm buyer requests are linked to buyer organization IDs, not free-text-only buyers.
6. Confirm `/api/operational-proof` reports D1 counts, request logs, audit events, trust score snapshots, and notifications.
7. Confirm `TRUSTPASS_LIVE_BASE_URL` is a deployed HTTPS Worker URL, not GitHub Pages or localhost.
8. Confirm the public gateway verifier passes and keeps `https://bksingh9.github.io/trustpass/api/health` as a static `404`.
9. Confirm the public gateway live write proof creates a vendor, buyer, document, buyer request, and verification decision through the deployed Worker and then re-reads request logs, audit events, trust score snapshots, and notifications.
