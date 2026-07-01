from __future__ import annotations

from pydantic import BaseModel, Field


class VendorProfileUpdate(BaseModel):
    business_summary: str | None = Field(default=None, max_length=4000)
    year_founded: int | None = Field(default=None, ge=1800)
    employee_count: int | None = Field(default=None, ge=0)
    annual_revenue_band: str | None = Field(default=None, max_length=80)
    primary_location: str | None = Field(default=None, max_length=240)
    regions_served: list[str] | None = None
    public_profile_enabled: bool | None = None

