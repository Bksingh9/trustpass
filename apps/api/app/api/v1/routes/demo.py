from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.schemas.common import DataResponse
from app.services.demo_workflow import (
    add_demo_buyer_request,
    add_demo_shortlist,
    approve_demo_review,
    create_demo_request,
    demo_health,
    get_demo_state,
    list_demo_reviews,
    reset_demo_state,
    search_demo_vendors,
    submit_vendor_renewal,
)

router = APIRouter()


class DemoShortlistCreate(BaseModel):
    vendor_id: str = Field(min_length=3)
    notes: str | None = Field(default=None, max_length=1000)


class DemoBuyerRequestCreate(BaseModel):
    vendor_id: str = Field(min_length=3)
    subject: str = Field(min_length=3, max_length=240)
    message: str = Field(min_length=3, max_length=2000)


class DemoRequestCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=5, max_length=240)
    organization: str = Field(min_length=2, max_length=160)
    plan: str = Field(min_length=2, max_length=120)
    message: str = Field(min_length=3, max_length=2000)


@router.get("/health", response_model=DataResponse)
async def health() -> DataResponse:
    return DataResponse(data=demo_health())


@router.get("/state", response_model=DataResponse)
async def state() -> DataResponse:
    return DataResponse(data=get_demo_state())


@router.post("/reset", response_model=DataResponse)
async def reset() -> DataResponse:
    return DataResponse(data=reset_demo_state())


@router.post("/vendor/renewal", response_model=DataResponse)
async def submit_renewal() -> DataResponse:
    return DataResponse(data=submit_vendor_renewal())


@router.get("/buyers/search", response_model=DataResponse)
async def buyer_search(
    q: str | None = Query(default=None),
    category: str | None = Query(default=None),
) -> DataResponse:
    return DataResponse(data={"vendors": search_demo_vendors(q=q, category=category)})


@router.post("/buyers/shortlists", response_model=DataResponse)
async def create_shortlist(payload: DemoShortlistCreate) -> DataResponse:
    try:
        return DataResponse(data=add_demo_shortlist(payload.vendor_id, payload.notes))
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error


@router.post("/buyers/requests", response_model=DataResponse)
async def create_buyer_request(payload: DemoBuyerRequestCreate) -> DataResponse:
    try:
        return DataResponse(data=add_demo_buyer_request(payload.vendor_id, payload.subject, payload.message))
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error


@router.get("/admin/reviews", response_model=DataResponse)
async def reviews() -> DataResponse:
    return DataResponse(data={"verification_requests": list_demo_reviews()})


@router.patch("/admin/reviews/{review_id}/approve", response_model=DataResponse)
async def approve_review(review_id: str) -> DataResponse:
    try:
        return DataResponse(data=approve_demo_review(review_id))
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error


@router.post("/contact/demo-requests", response_model=DataResponse)
async def contact_demo_request(payload: DemoRequestCreate) -> DataResponse:
    return DataResponse(
        data=create_demo_request(
            payload.name,
            payload.email,
            payload.organization,
            payload.plan,
            payload.message,
        )
    )
