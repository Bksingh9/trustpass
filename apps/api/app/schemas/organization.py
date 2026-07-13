from __future__ import annotations

from pydantic import BaseModel, Field

from app.models.enums import OrganizationType


class OrganizationCreate(BaseModel):
    name: str = Field(min_length=2, max_length=240)
    type: OrganizationType
    email: str | None = Field(default=None, max_length=320)
    full_name: str | None = Field(default=None, max_length=240)
    legal_name: str | None = Field(default=None, max_length=240)
    website_url: str | None = Field(default=None, max_length=500)
    industry: str | None = Field(default=None, max_length=240)
    country: str | None = Field(default=None, max_length=80)
    region: str | None = Field(default=None, max_length=120)
    city: str | None = Field(default=None, max_length=120)

