from datetime import datetime, timezone
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator
import re

INDIAN_MOBILE_REGEX = re.compile(r"^[6-9]\d{9}$")

class AppointmentCreate(BaseModel):
    customer_name: str = Field(..., min_length=2, max_length=100)
    customer_mobile: str = Field(..., description="10-digit Indian Mobile number")
    service_id: str = Field(..., description="Service ID for appointment")
    appointment_date: str = Field(..., description="Appointment date YYYY-MM-DD")
    slot_time: str = Field(..., description="Time slot e.g. 10:30 AM")
    notes: Optional[str] = Field(default=None, max_length=500)

    @field_validator("customer_mobile")
    @classmethod
    def validate_mobile(cls, v: str) -> str:
        clean_mobile = v.strip()
        if not INDIAN_MOBILE_REGEX.match(clean_mobile):
            raise ValueError("Invalid Indian mobile number. Must be exactly 10 digits starting with 6-9.")
        return clean_mobile

class AppointmentCheckInResponse(BaseModel):
    appointment_id: str
    token_id: str
    token_number: int
    customer_name: str
    service_name: str
    status: str
    message: str

class AppointmentResponse(BaseModel):
    id: str
    business_id: str
    service_id: str
    service_name: str
    service_price: float
    customer_name: str
    customer_mobile: str
    appointment_date: str
    slot_time: str
    status: str = "SCHEDULED"
    token_id: Optional[str] = None
    token_number: Optional[int] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = {
        "populate_by_name": True
    }

class AvailableSlotsResponse(BaseModel):
    business_id: str
    service_id: str
    date: str
    available_slots: List[str]
    booked_slots: List[str]
