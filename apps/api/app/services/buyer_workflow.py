from __future__ import annotations

from uuid import UUID

from sqlalchemy import exists, select
from sqlalchemy.orm import Session

from app.core.errors import TrustPassError
from app.models.buyer import BuyerVendorRequest, Shortlist
from app.models.enums import AuditAction, BuyerRequestStatus, OrganizationType
from app.models.organization import Organization
from app.models.vendor import Capability, ServiceCategory, VendorCapability, VendorProfile
from app.models.verification import BadgeAssignment, TrustBadge
from app.schemas.buyer import BuyerVendorRequestCreate, ShortlistCreate
from app.services.audit import record_activity, record_audit_event


def search_vendors(
    db: Session,
    *,
    q: str | None = None,
    category: str | None = None,
    location: str | None = None,
    trust_level: str | None = None,
    badge: str | None = None,
    capability: str | None = None,
) -> list[dict]:
    statement = (
        select(Organization, VendorProfile)
        .join(VendorProfile, VendorProfile.organization_id == Organization.id)
        .where(
            Organization.type == OrganizationType.vendor,
            Organization.status == "active",
            Organization.deleted_at.is_(None),
            VendorProfile.public_profile_enabled.is_(True),
        )
        .order_by(VendorProfile.current_trust_score.desc(), Organization.name.asc())
    )

    if q:
        statement = statement.where(Organization.name.ilike(f"%{q}%"))
    if location:
        statement = statement.where(
            (Organization.city.ilike(f"%{location}%"))
            | (Organization.region.ilike(f"%{location}%"))
            | (Organization.country.ilike(f"%{location}%"))
        )
    if trust_level:
        statement = statement.where(VendorProfile.current_trust_level == trust_level)
    if category:
        statement = statement.where(
            exists()
            .where(VendorCapability.organization_id == Organization.id)
            .where(VendorCapability.service_category_id == ServiceCategory.id)
            .where(ServiceCategory.slug == category)
        )
    if capability:
        statement = statement.where(
            exists()
            .where(VendorCapability.organization_id == Organization.id)
            .where(VendorCapability.capability_id == Capability.id)
            .where(Capability.slug == capability)
        )
    if badge:
        statement = statement.where(
            exists()
            .where(BadgeAssignment.organization_id == Organization.id)
            .where(BadgeAssignment.trust_badge_id == TrustBadge.id)
            .where(BadgeAssignment.revoked_at.is_(None))
            .where(TrustBadge.code == badge)
        )

    rows = db.execute(statement).all()
    results: list[dict] = []
    for org, profile in rows:
        badges = db.execute(
            select(TrustBadge.name)
            .join(BadgeAssignment, BadgeAssignment.trust_badge_id == TrustBadge.id)
            .where(BadgeAssignment.organization_id == org.id, BadgeAssignment.revoked_at.is_(None))
            .order_by(TrustBadge.minimum_score.desc())
        ).scalars().all()
        categories = db.execute(
            select(ServiceCategory.name)
            .join(VendorCapability, VendorCapability.service_category_id == ServiceCategory.id)
            .where(VendorCapability.organization_id == org.id)
            .distinct()
        ).scalars().all()
        results.append(
            {
                "organization_id": str(org.id),
                "name": org.name,
                "slug": org.slug,
                "location": ", ".join(part for part in [org.city, org.region, org.country] if part),
                "industry": org.industry,
                "categories": categories,
                "trust_score": profile.current_trust_score,
                "trust_level": profile.current_trust_level,
                "status": profile.onboarding_status.value,
                "badges": badges,
            }
        )
    return results


def create_shortlist(
    db: Session,
    buyer_organization_id: UUID,
    actor_user_id: UUID,
    payload: ShortlistCreate,
) -> Shortlist:
    vendor = db.get(Organization, payload.vendor_organization_id)
    if vendor is None or vendor.type != OrganizationType.vendor:
        raise TrustPassError("Vendor organization not found", "vendor_not_found", 404)

    existing = db.execute(
        select(Shortlist).where(
            Shortlist.buyer_organization_id == buyer_organization_id,
            Shortlist.vendor_organization_id == payload.vendor_organization_id,
        )
    ).scalar_one_or_none()
    if existing:
        return existing

    shortlist = Shortlist(
        buyer_organization_id=buyer_organization_id,
        vendor_organization_id=payload.vendor_organization_id,
        created_by_user_id=actor_user_id,
        notes=payload.notes,
    )
    db.add(shortlist)
    db.flush()
    record_activity(
        db,
        organization_id=buyer_organization_id,
        actor_user_id=actor_user_id,
        action="shortlist_vendor",
        summary=f"Shortlisted {vendor.name}",
        entity_type="shortlist",
        entity_id=shortlist.id,
    )
    record_audit_event(
        db,
        organization_id=buyer_organization_id,
        actor_user_id=actor_user_id,
        action=AuditAction.shortlist,
        entity_type="shortlist",
        entity_id=shortlist.id,
        metadata={"vendor_organization_id": str(vendor.id)},
    )
    db.commit()
    db.refresh(shortlist)
    return shortlist


def list_shortlists(db: Session, buyer_organization_id: UUID) -> list[dict]:
    rows = db.execute(
        select(Shortlist, Organization)
        .join(Organization, Organization.id == Shortlist.vendor_organization_id)
        .where(Shortlist.buyer_organization_id == buyer_organization_id)
        .order_by(Shortlist.created_at.desc())
    ).all()
    return [
        {
            "id": str(shortlist.id),
            "vendor_organization_id": str(vendor.id),
            "vendor_name": vendor.name,
            "status": shortlist.status,
            "notes": shortlist.notes,
            "created_at": shortlist.created_at.isoformat(),
        }
        for shortlist, vendor in rows
    ]


def create_buyer_request(
    db: Session,
    buyer_organization_id: UUID,
    actor_user_id: UUID,
    payload: BuyerVendorRequestCreate,
) -> BuyerVendorRequest:
    vendor = db.get(Organization, payload.vendor_organization_id)
    if vendor is None or vendor.type != OrganizationType.vendor:
        raise TrustPassError("Vendor organization not found", "vendor_not_found", 404)

    request = BuyerVendorRequest(
        buyer_organization_id=buyer_organization_id,
        vendor_organization_id=payload.vendor_organization_id,
        requested_by_user_id=actor_user_id,
        subject=payload.subject,
        message=payload.message,
        requested_document_type_id=payload.requested_document_type_id,
        status=BuyerRequestStatus.open,
    )
    db.add(request)
    db.flush()
    record_activity(
        db,
        organization_id=buyer_organization_id,
        actor_user_id=actor_user_id,
        action="request_vendor_info",
        summary=f"Requested information from {vendor.name}",
        entity_type="buyer_vendor_request",
        entity_id=request.id,
    )
    record_audit_event(
        db,
        organization_id=buyer_organization_id,
        actor_user_id=actor_user_id,
        action=AuditAction.request_info,
        entity_type="buyer_vendor_request",
        entity_id=request.id,
        metadata={"vendor_organization_id": str(vendor.id)},
    )
    db.commit()
    db.refresh(request)
    return request

