# TRUSTPASS PRD

## Product Summary

TRUSTPASS is a B2B vendor trust, verification, and onboarding platform for SMEs, agencies, consultants, logistics vendors, and service providers. Vendors use it to become procurement-ready. Buyers use it to discover, evaluate, shortlist, and onboard verified vendors with less friction and less trust risk.

This MVP is not a generic CRM or marketplace. It is a trust infrastructure product centered on verified vendor profiles, compliance documents, admin review workflows, buyer-safe trust summaries, and recurring monetization.

## Goals

- Help vendors create credible procurement-ready business profiles.
- Let vendors upload required business and compliance documents.
- Give admins a clear review queue and verification workflow.
- Produce trust scores, checklist progress, and trust badges.
- Let buyers search, evaluate, shortlist, and request additional information from vendors.
- Establish billing-ready architecture for subscriptions, verification packs, buyer access, and future integrations.

## Non-Goals

- Live payment processing in the first implementation pass.
- Fully automated third-party compliance verification.
- Public marketplace ranking algorithms beyond simple filters and trust status.
- Native mobile apps.
- Storing raw uploaded files in PostgreSQL.

## Users

### Vendor User

Primary jobs:

- Create and maintain an organization profile.
- Complete onboarding steps.
- Upload and replace required documents.
- Submit for verification.
- Track checklist progress, document status, trust score, and badges.
- Respond to buyer requests.

### Buyer User

Primary jobs:

- Search vendors by category, location, capability, badge, and trust status.
- View buyer-safe trust profile summaries.
- Shortlist vendors.
- Request clarification or additional documents.
- Track request status.

### Admin Reviewer

Primary jobs:

- Review submitted documents.
- Run manual verification checks.
- Request changes or approve vendors.
- Manage checklist and badge rules.
- Review notes, activity, and audit history.

### Super Admin

Primary jobs:

- Manage internal users and platform-level settings.
- Oversee organizations, billing state, badge definitions, and checklist catalogs.
- Access metrics and audit logs.

## Core MVP Modules

### Authentication And RBAC

- Supabase Auth handles credentials, sessions, password reset, and external auth identity.
- TRUSTPASS stores app users, memberships, roles, invitations, and role-gated access rules.
- Supported roles: vendor, buyer, admin, super_admin.

### Organization Management

- Organizations are the tenant boundary.
- Types: vendor, buyer, internal.
- Organizations have multiple users through memberships.
- Vendor and buyer profile tables extend organization records.

### Vendor Onboarding Wizard

Steps:

1. Basic business details.
2. Contact persons.
3. Service categories and capabilities.
4. Compliance and business documents.
5. References and case studies.
6. Review and submit.

Success criteria:

- Vendor can save progress.
- Vendor can see missing required items.
- Vendor can submit only when minimum required fields are complete.
- Submission creates or updates a verification request.

### Document Vault

- Vendors upload PDF, PNG, JPG, and JPEG files.
- Metadata is stored in PostgreSQL.
- Files are stored in local storage for development or S3-compatible storage for production.
- Access uses signed URLs.
- Documents have statuses, expiry dates, replacement history, and rejection notes.

### Verification Workflow

Lifecycle:

- `draft`
- `submitted`
- `under_review`
- `changes_requested`
- `approved`
- `rejected`
- `expired`

Admins can review documents, complete checks, leave notes, request changes, approve, reject, and assign badges. Score recalculation happens when review evidence changes.

### Trust Profile

Buyer-safe vendor profile showing:

- Organization summary.
- Capabilities and service categories.
- Region coverage.
- Verification status.
- Trust level and active badges.
- Approved references and case studies.

Private documents, storage keys, internal notes, and audit details are not exposed to buyers.

### Buyer Dashboard

- Search and filter vendors.
- View vendor details.
- Shortlist vendors.
- Create clarification or document requests.
- Track active requests.

### Admin Console

- Review queue.
- Verification detail.
- Document review panel.
- Verification decision panel.
- Checklist manager.
- Badge manager.
- Metrics dashboard.
- Organization management.
- Notes and audit logs.

### Notifications

MVP notification categories:

- Vendor status updates.
- Document rejection or approval.
- Expiry reminders.
- Admin review alerts.
- Buyer request notifications.
- Weekly digest hooks.

Channels:

- In-app.
- Email through adapter interface.

### Billing Architecture

MVP plan families:

- Vendor Basic.
- Vendor Growth.
- Vendor Premium.
- Buyer Team.
- Verification Pack one-time purchase.

Billing is adapter-driven and supports Stripe, Razorpay, manual, and mock providers. Live payments can be enabled after plan enforcement and webhook handling are tested.

## User Flows

### Vendor Onboarding

1. Vendor signs up.
2. Vendor creates or joins a vendor organization.
3. Vendor completes profile basics and contacts.
4. Vendor selects categories and capabilities.
5. Vendor uploads required documents.
6. Vendor adds references and case studies.
7. Vendor reviews checklist.
8. Vendor submits verification request.
9. Admin reviews and decides.
10. Vendor receives status, score, and badge results.

### Buyer Shortlist

1. Buyer signs up or accepts invite.
2. Buyer searches vendors.
3. Buyer filters by category, region, capability, trust status, badge, and team size.
4. Buyer opens vendor trust profile.
5. Buyer shortlists vendor.
6. Buyer requests clarification or additional document summary.
7. Vendor responds.
8. Buyer tracks status.

### Admin Review

1. Admin opens review queue.
2. Admin reviews vendor profile, checklist, and documents.
3. Admin approves or rejects documents.
4. Admin completes verification checks.
5. System recalculates trust score.
6. Admin approves, rejects, or requests changes.
7. System creates notifications, badge assignments, activity logs, and audit events.

## Acceptance Criteria

- Vendor can complete onboarding and submit a verification request.
- Admin can review documents and approve or reject a request.
- Trust score recalculates from weighted checks.
- Approved vendors can receive active badges.
- Buyer can search, view buyer-safe profile data, shortlist, and request clarification.
- Notifications are generated for critical workflow events.
- Billing tables and service interfaces support future live provider integrations.
- Seed data makes the demo usable immediately after setup.

