from __future__ import annotations

from enum import Enum


class OrganizationType(str, Enum):
    vendor = "vendor"
    buyer = "buyer"
    internal = "internal"


class UserStatus(str, Enum):
    invited = "invited"
    active = "active"
    disabled = "disabled"


class MembershipRole(str, Enum):
    vendor = "vendor"
    buyer = "buyer"
    admin = "admin"
    super_admin = "super_admin"


class MembershipStatus(str, Enum):
    invited = "invited"
    active = "active"
    suspended = "suspended"
    removed = "removed"


class DocumentStatus(str, Enum):
    draft = "draft"
    uploaded = "uploaded"
    submitted = "submitted"
    under_review = "under_review"
    approved = "approved"
    rejected = "rejected"
    expired = "expired"
    replaced = "replaced"


class VerificationStatus(str, Enum):
    draft = "draft"
    submitted = "submitted"
    under_review = "under_review"
    changes_requested = "changes_requested"
    approved = "approved"
    rejected = "rejected"
    expired = "expired"


class VerificationCheckStatus(str, Enum):
    pending = "pending"
    passed = "passed"
    failed = "failed"
    waived = "waived"
    not_applicable = "not_applicable"


class BuyerRequestStatus(str, Enum):
    open = "open"
    responded = "responded"
    closed = "closed"
    cancelled = "cancelled"


class NotificationChannel(str, Enum):
    email = "email"
    in_app = "in_app"


class NotificationStatus(str, Enum):
    queued = "queued"
    sent = "sent"
    failed = "failed"
    read = "read"


class SubscriptionStatus(str, Enum):
    trialing = "trialing"
    active = "active"
    past_due = "past_due"
    cancelled = "cancelled"
    expired = "expired"


class PaymentStatus(str, Enum):
    pending = "pending"
    succeeded = "succeeded"
    failed = "failed"
    refunded = "refunded"


class PaymentProvider(str, Enum):
    stripe = "stripe"
    razorpay = "razorpay"
    manual = "manual"
    mock = "mock"


class AuditAction(str, Enum):
    create = "create"
    update = "update"
    delete = "delete"
    invite = "invite"
    login = "login"
    upload = "upload"
    submit = "submit"
    review = "review"
    approve = "approve"
    reject = "reject"
    request_changes = "request_changes"
    shortlist = "shortlist"
    request_info = "request_info"
    billing_event = "billing_event"
    system_event = "system_event"


class VisibilityLevel(str, Enum):
    private = "private"
    buyer_summary = "buyer_summary"
    public = "public"

