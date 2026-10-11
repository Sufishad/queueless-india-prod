from datetime import datetime, timezone
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator, ConfigDict
import re

INDIAN_MOBILE_REGEX = re.compile(r"^[6-9]\d{9}$")

class OwnerBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    mobile: str = Field(...)
    email: Optional[str] = None

    @field_validator("mobile")
    @classmethod
    def validate_mobile(cls, v: str) -> str:
        clean = v.strip()
        if not INDIAN_MOBILE_REGEX.match(clean):
            raise ValueError("Invalid Indian mobile number. Must be 10 digits starting with 6-9.")
        return clean

class OwnerCreate(OwnerBase):
    password: str = Field(..., min_length=6, max_length=100)

class OwnerLogin(BaseModel):
    mobile: str
    password: str

class OwnerResponse(OwnerBase):
    id: str
    business_ids: List[str] = Field(default_factory=list)
    active: bool = True
    created_at: datetime

    model_config = ConfigDict(populate_by_name=True)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    owner: OwnerResponse
    business_id: Optional[str] = None

class OwnerOnboardService(BaseModel):
    name: str = Field(..., min_length=2)
    price: float = Field(default=0.0, ge=0.0)
    estimated_duration: int = Field(default=15, ge=1)

class OwnerOnboardingRequest(BaseModel):
    shop_name: str = Field(..., min_length=2)
    category: str = Field(..., description="clinic, salon, bank, restaurant, retail")
    address: str = Field(..., min_length=3)
    city: str = Field(default="Bengaluru")
    pincode: str = Field(default="560038")
    latitude: float = Field(default=12.9716)
    longitude: float = Field(default=77.6412)
    upi_id: Optional[str] = None
    opening_time: str = Field(default="09:00")
    closing_time: str = Field(default="21:00")
    services: List[OwnerOnboardService] = Field(default_factory=list)

class PaymentStatusUpdateRequest(BaseModel):
    payment_status: str = Field(..., description="PAID or UNPAID")
    payment_mode: Optional[str] = Field(default="CASH", description="CASH or UPI")
