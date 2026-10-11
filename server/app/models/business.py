from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.common import BusinessPlan, BusinessStatus, GeoPoint, PyObjectId, QueueStatus


class Business(BaseModel):
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    name: str = Field(..., min_length=2, max_length=150)
    category: str = Field(..., min_length=2, max_length=50)
    address: str = Field(..., min_length=5, max_length=300)
    location: GeoPoint
    upi_id: Optional[str] = Field(default=None, pattern=r"^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$")
    status: BusinessStatus = BusinessStatus.OPEN
    queue_status: QueueStatus = QueueStatus.ACTIVE
    plan: BusinessPlan = BusinessPlan.FREE
    verified: bool = False
    opening_time: Optional[str] = None  # e.g. "09:00"
    closing_time: Optional[str] = None  # e.g. "21:00"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class BusinessCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    category: str = Field(..., min_length=2, max_length=50)
    address: str = Field(..., min_length=5, max_length=300)
    location: GeoPoint
    upi_id: Optional[str] = None
    opening_time: Optional[str] = None
    closing_time: Optional[str] = None
