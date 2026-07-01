# QA Checklist

## Backend

- Health endpoint returns `200`.
- Readiness endpoint checks database connectivity.
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

