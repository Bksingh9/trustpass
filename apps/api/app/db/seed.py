from __future__ import annotations

from datetime import date, datetime, timezone
from uuid import NAMESPACE_URL, uuid5

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.audit import ActivityLog, AuditEvent
from app.models.billing import PaymentRecord, Subscription
from app.models.buyer import BuyerProfile, BuyerVendorRequest, Shortlist
from app.models.document import Document, DocumentType
from app.models.enums import (
    AuditAction,
    BuyerRequestStatus,
    DocumentStatus,
    MembershipRole,
    NotificationChannel,
    NotificationStatus,
    OrganizationType,
    PaymentProvider,
    PaymentStatus,
    SubscriptionStatus,
    VerificationCheckStatus,
    VerificationStatus,
    VisibilityLevel,
)
from app.models.identity import Membership, Role, User
from app.models.notification import Notification
from app.models.organization import Contact, Organization
from app.models.vendor import (
    Capability,
    CaseStudy,
    ServiceCategory,
    VendorCapability,
    VendorProfile,
    VendorReference,
)
from app.models.verification import (
    BadgeAssignment,
    ChecklistItem,
    ComplianceChecklist,
    TrustBadge,
    TrustScoreSnapshot,
    VendorChecklistProgress,
    VerificationCheck,
    VerificationRequest,
)


def _exists(db: Session, model: type, **filters: object) -> bool:
    statement = select(model)
    for field, value in filters.items():
        statement = statement.where(getattr(model, field) == value)
    return db.execute(statement).scalar_one_or_none() is not None


def stable_seed_id(kind: str, key: str):
    return uuid5(NAMESPACE_URL, f"trustpass:seed:{kind}:{key}")


def seed(db: Session) -> None:
    if _exists(db, Organization, slug="atlas-freight-partners"):
        return

    now = datetime.now(timezone.utc)

    roles = [
        Role(name=MembershipRole.vendor, display_name="Vendor", permissions=["vendor:read", "vendor:write"]),
        Role(name=MembershipRole.buyer, display_name="Buyer", permissions=["buyer:read", "buyer:write"]),
        Role(name=MembershipRole.admin, display_name="Admin", permissions=["admin:review"]),
        Role(name=MembershipRole.super_admin, display_name="Super Admin", permissions=["admin:*"]),
    ]
    db.add_all(roles)

    internal = Organization(id=stable_seed_id("organization", "trustpass-ops"), name="TRUSTPASS Operations", slug="trustpass-ops", type=OrganizationType.internal)
    buyer = Organization(
        id=stable_seed_id("organization", "brightline-procurement"),
        name="Brightline Procurement",
        slug="brightline-procurement",
        type=OrganizationType.buyer,
        country="IN",
        region="Maharashtra",
        city="Mumbai",
        industry="Manufacturing",
    )
    vendors = [
        Organization(
            id=stable_seed_id("organization", "atlas-freight-partners"),
            name="Atlas Freight Partners",
            slug="atlas-freight-partners",
            type=OrganizationType.vendor,
            country="IN",
            region="Maharashtra",
            city="Mumbai",
            industry="Logistics",
        ),
        Organization(
            id=stable_seed_id("organization", "northstar-digital-studio"),
            name="Northstar Digital Studio",
            slug="northstar-digital-studio",
            type=OrganizationType.vendor,
            country="IN",
            region="Karnataka",
            city="Bengaluru",
            industry="Digital services",
        ),
        Organization(
            id=stable_seed_id("organization", "clearpath-advisory"),
            name="Clearpath Advisory",
            slug="clearpath-advisory",
            type=OrganizationType.vendor,
            country="IN",
            region="Delhi",
            city="Delhi",
            industry="Consulting",
        ),
    ]
    db.add_all([internal, buyer, *vendors])
    db.flush()

    admin_1 = User(id=stable_seed_id("user", "seed-admin-1"), auth_subject_id="seed-admin-1", email="admin1@trustpass.local", full_name="Asha Reviewer")
    admin_2 = User(id=stable_seed_id("user", "seed-admin-2"), auth_subject_id="seed-admin-2", email="admin2@trustpass.local", full_name="Rohan Admin")
    buyer_user = User(id=stable_seed_id("user", "seed-buyer-1"), auth_subject_id="seed-buyer-1", email="buyer@brightline.local", full_name="Maya Procurement")
    vendor_users = [
        User(id=stable_seed_id("user", "seed-vendor-1"), auth_subject_id="seed-vendor-1", email="ops@atlas.local", full_name="Kabir Atlas"),
        User(id=stable_seed_id("user", "seed-vendor-2"), auth_subject_id="seed-vendor-2", email="hello@northstar.local", full_name="Isha Northstar"),
        User(id=stable_seed_id("user", "seed-vendor-3"), auth_subject_id="seed-vendor-3", email="partners@clearpath.local", full_name="Dev Clearpath"),
    ]
    db.add_all([admin_1, admin_2, buyer_user, *vendor_users])
    db.flush()

    db.add_all(
        [
            Membership(organization_id=internal.id, user_id=admin_1.id, role=MembershipRole.admin),
            Membership(organization_id=internal.id, user_id=admin_2.id, role=MembershipRole.super_admin),
            Membership(organization_id=buyer.id, user_id=buyer_user.id, role=MembershipRole.buyer),
            *[
                Membership(organization_id=vendor.id, user_id=user.id, role=MembershipRole.vendor)
                for vendor, user in zip(vendors, vendor_users, strict=True)
            ],
        ]
    )

    logistics = ServiceCategory(name="Logistics", slug="logistics")
    digital = ServiceCategory(name="Digital services", slug="digital-services")
    consulting = ServiceCategory(name="Consulting", slug="consulting")
    db.add_all([logistics, digital, consulting])
    db.flush()

    capabilities = [
        Capability(service_category_id=logistics.id, name="Freight forwarding", slug="freight-forwarding"),
        Capability(service_category_id=digital.id, name="Web application delivery", slug="web-app-delivery"),
        Capability(service_category_id=consulting.id, name="Operations advisory", slug="operations-advisory"),
    ]
    db.add_all(capabilities)
    db.flush()

    doc_types = [
        DocumentType(id=stable_seed_id("document_type", "business_registration"), code="business_registration", name="Business registration", category="identity", is_required=True),
        DocumentType(id=stable_seed_id("document_type", "tax_registration"), code="tax_registration", name="Tax registration", category="tax", is_required=True),
        DocumentType(id=stable_seed_id("document_type", "bank_proof"), code="bank_proof", name="Bank proof", category="finance", is_required=True),
        DocumentType(id=stable_seed_id("document_type", "address_proof"), code="address_proof", name="Address proof", category="identity", is_required=True),
        DocumentType(id=stable_seed_id("document_type", "insurance"), code="insurance", name="Insurance certificate", category="compliance", requires_expiry_date=True),
        DocumentType(id=stable_seed_id("document_type", "category_compliance"), code="category_compliance", name="Category compliance", category="compliance"),
    ]
    db.add_all(doc_types)
    db.flush()

    profiles = [
        VendorProfile(
            organization_id=vendors[0].id,
            business_summary="Regional logistics provider with freight and warehousing capabilities.",
            regions_served=["IN-West", "IN-South"],
            onboarding_status=VerificationStatus.approved,
            current_trust_score=88,
            current_trust_level="trusted",
            public_profile_enabled=True,
            public_slug="atlas-freight-partners",
        ),
        VendorProfile(
            organization_id=vendors[1].id,
            business_summary="Digital services studio for B2B web and product delivery.",
            regions_served=["IN-South", "Remote"],
            onboarding_status=VerificationStatus.under_review,
            current_trust_score=73,
            current_trust_level="verified",
            public_profile_enabled=True,
            public_slug="northstar-digital-studio",
        ),
        VendorProfile(
            organization_id=vendors[2].id,
            business_summary="Operations consulting partner for process improvement.",
            regions_served=["IN-North", "Remote"],
            onboarding_status=VerificationStatus.changes_requested,
            current_trust_score=42,
            current_trust_level="in_review",
            public_profile_enabled=False,
            public_slug="clearpath-advisory",
        ),
    ]
    db.add_all(profiles)

    db.add(
        BuyerProfile(
            organization_id=buyer.id,
            procurement_summary="Evaluates verified vendors for operations, digital, and logistics teams.",
            preferred_categories=["logistics", "digital-services"],
            regions_of_interest=["IN-West", "IN-South"],
            minimum_trust_level="verified",
        )
    )

    for vendor, user, capability in zip(vendors, vendor_users, capabilities, strict=True):
        db.add(Contact(organization_id=vendor.id, full_name=user.full_name or "Primary contact", email=user.email, contact_type="primary", is_primary=True))
        db.add(VendorCapability(organization_id=vendor.id, service_category_id=capability.service_category_id, capability_id=capability.id))

    checklist = ComplianceChecklist(name="Default vendor verification", is_default=True, created_by_user_id=admin_2.id)
    db.add(checklist)
    db.flush()

    checklist_items = [
        ChecklistItem(compliance_checklist_id=checklist.id, document_type_id=doc_type.id, name=doc_type.name, category=doc_type.category, weight=15 if doc_type.code == "business_registration" else 10)
        for doc_type in doc_types
    ]
    db.add_all(checklist_items)
    db.flush()

    approved_badge = TrustBadge(code="verified", name="Verified", minimum_score=70, icon_name="badge-check", color="green")
    trusted_badge = TrustBadge(code="trusted", name="Trusted", minimum_score=80, icon_name="shield-check", color="emerald")
    db.add_all([approved_badge, trusted_badge])
    db.flush()

    for index, vendor in enumerate(vendors):
        request_status = [
            VerificationStatus.approved,
            VerificationStatus.under_review,
            VerificationStatus.changes_requested,
        ][index]
        request = VerificationRequest(
            organization_id=vendor.id,
            submitted_by_user_id=vendor_users[index].id,
            assigned_reviewer_user_id=admin_1.id,
            status=request_status,
            current_score=profiles[index].current_trust_score,
            score_breakdown={"identity": 15, "tax": 20 if index < 2 else 0, "references": 15 if index == 0 else 0},
            score_reasons=["Seeded demo verification state"],
            submitted_at=now,
            decided_at=now if request_status == VerificationStatus.approved else None,
        )
        db.add(request)
        db.flush()

        document_status = DocumentStatus.approved if index == 0 else DocumentStatus.under_review
        for doc_type in doc_types[: 4 if index < 2 else 2]:
            document = Document(
                organization_id=vendor.id,
                document_type_id=doc_type.id,
                uploaded_by_user_id=vendor_users[index].id,
                reviewed_by_user_id=admin_1.id if index == 0 else None,
                file_name=f"{vendor.slug}-{doc_type.code}.pdf",
                safe_file_name=f"{vendor.slug}-{doc_type.code}.pdf",
                storage_provider="local",
                storage_object_key=f"seed/{vendor.slug}/{doc_type.code}.pdf",
                mime_type="application/pdf",
                file_size_bytes=120000,
                status=document_status,
                visibility=VisibilityLevel.private,
                issued_at=date(2026, 1, 1),
                expires_at=date(2027, 1, 1) if doc_type.requires_expiry_date else None,
                submitted_at=now,
                reviewed_at=now if index == 0 else None,
            )
            db.add(document)
            db.flush()
            db.add(
                VerificationCheck(
                    verification_request_id=request.id,
                    organization_id=vendor.id,
                    checklist_item_id=checklist_items[0].id,
                    document_id=document.id,
                    category=doc_type.category,
                    label=doc_type.name,
                    weight=10,
                    status=VerificationCheckStatus.passed if index == 0 else VerificationCheckStatus.pending,
                    score_awarded=10 if index == 0 else 0,
                    evidence_summary=f"{doc_type.name} metadata seeded",
                    reviewed_by_user_id=admin_1.id if index == 0 else None,
                    reviewed_at=now if index == 0 else None,
                )
            )

        db.add(
            VendorChecklistProgress(
                organization_id=vendor.id,
                checklist_item_id=checklist_items[0].id,
                status=VerificationCheckStatus.passed if index == 0 else VerificationCheckStatus.pending,
                completed_at=now if index == 0 else None,
            )
        )
        db.add(
            TrustScoreSnapshot(
                organization_id=vendor.id,
                verification_request_id=request.id,
                score=profiles[index].current_trust_score,
                trust_level=profiles[index].current_trust_level or "unverified",
                breakdown=request.score_breakdown,
                reasons=request.score_reasons,
                evidence_refs={"verification_request_id": str(request.id)},
                created_at=now,
            )
        )

        if index == 0:
            db.add(BadgeAssignment(organization_id=vendor.id, trust_badge_id=trusted_badge.id, verification_request_id=request.id, assigned_by_user_id=admin_1.id, assigned_at=now))

    db.add(
        CaseStudy(
            organization_id=vendors[0].id,
            title="Regional warehouse rollout",
            client_name="Confidential manufacturing buyer",
            industry="Manufacturing",
            summary="Scaled warehousing and freight lanes across western India.",
            outcomes="Reduced onboarding cycle and improved delivery SLA tracking.",
            visibility=VisibilityLevel.buyer_summary,
            is_verified=True,
            verified_by_user_id=admin_1.id,
            verified_at=now,
        )
    )
    db.add(
        VendorReference(
            organization_id=vendors[0].id,
            reference_name="Procurement Lead",
            reference_company="Confidential buyer",
            reference_email="reference@example.com",
            relationship="Client",
            visibility=VisibilityLevel.private,
            validation_status=VerificationCheckStatus.passed,
            validated_by_user_id=admin_1.id,
            validated_at=now,
        )
    )

    db.add(Shortlist(buyer_organization_id=buyer.id, vendor_organization_id=vendors[0].id, created_by_user_id=buyer_user.id, notes="Strong logistics fit"))
    db.add(
        BuyerVendorRequest(
            buyer_organization_id=buyer.id,
            vendor_organization_id=vendors[1].id,
            requested_by_user_id=buyer_user.id,
            subject="Need SOC process summary",
            message="Please share a buyer-safe summary of your delivery and security process.",
            status=BuyerRequestStatus.open,
        )
    )

    db.add_all(
        [
            Notification(organization_id=vendors[1].id, user_id=vendor_users[1].id, channel=NotificationChannel.in_app, status=NotificationStatus.queued, subject="Verification under review", body="Your verification request is being reviewed."),
            Notification(organization_id=internal.id, user_id=admin_1.id, channel=NotificationChannel.in_app, status=NotificationStatus.queued, subject="New review assigned", body="Northstar Digital Studio is ready for review."),
        ]
    )

    db.add(Subscription(organization_id=vendors[0].id, plan_code="vendor_growth", plan_name="Vendor Growth", status=SubscriptionStatus.active, provider=PaymentProvider.mock, feature_flags={"verification": True, "badges": True}))
    db.add(PaymentRecord(organization_id=vendors[0].id, provider=PaymentProvider.mock, payment_type="subscription", amount_cents=9900, currency="USD", status=PaymentStatus.succeeded, description="Seed subscription payment", paid_at=now))

    db.add(ActivityLog(organization_id=vendors[0].id, actor_user_id=admin_1.id, action="approve", summary="Vendor verification approved", entity_type="verification_request", created_at=now))
    db.add(AuditEvent(organization_id=vendors[0].id, actor_user_id=admin_1.id, action=AuditAction.approve, entity_type="verification_request", metadata_json={"seed": True}, created_at=now))

    db.commit()


def main() -> None:
    with SessionLocal() as db:
        seed(db)


if __name__ == "__main__":
    main()
