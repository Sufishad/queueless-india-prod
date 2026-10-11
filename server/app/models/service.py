from datetime import datetime, timezone
from typing import Any, Optional
from pydantic import BaseModel, ConfigDict, Field, model_validator
from app.models.common import PyObjectId


class Service(BaseModel):
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id: Optional[str] = None
    mongo_id: Optional[PyObjectId] = Field(default=None, alias="_id")
    business_id: str = Field(..., alias="businessId", description="ID of the associated business")
    name: str = Field(..., min_length=1, max_length=100)
    price: float = Field(..., ge=0, description="Price in INR (₹)")
    estimated_duration: int = Field(default=15, ge=1, le=480, alias="estimatedDuration", description="Estimated duration in minutes")
    active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), alias="createdAt")
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), alias="updatedAt")

    @model_validator(mode="before")
    @classmethod
    def sync_ids(cls, data: Any) -> Any:
        if isinstance(data, dict):
            val = data.get("id") or data.get("_id")
            if val is not None:
                data["id"] = str(val)
                data["_id"] = str(val)
        return data


class ServiceCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    business_id: Optional[str] = Field(default=None, alias="businessId")
    name: str = Field(..., min_length=1, max_length=100)
    price: float = Field(..., ge=0)
    estimated_duration: int = Field(default=15, ge=1, le=480, alias="estimatedDuration")
    active: bool = True
