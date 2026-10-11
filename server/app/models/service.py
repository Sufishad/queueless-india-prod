from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.common import PyObjectId


class Service(BaseModel):
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    business_id: str = Field(..., description="ID of the associated business")
    name: str = Field(..., min_length=1, max_length=100)
    price: float = Field(..., ge=0, description="Price in INR (₹)")
    estimated_duration: int = Field(default=15, ge=1, le=480, description="Estimated duration in minutes")
    active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ServiceCreate(BaseModel):
    business_id: str
    name: str = Field(..., min_length=1, max_length=100)
    price: float = Field(..., ge=0)
    estimated_duration: int = Field(default=15, ge=1, le=480)
    active: bool = True
