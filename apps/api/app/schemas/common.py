from __future__ import annotations

from typing import Any

from pydantic import BaseModel


class DataResponse(BaseModel):
    data: Any


class ErrorDetail(BaseModel):
    code: str
    message: str


class ErrorResponse(BaseModel):
    error: ErrorDetail

