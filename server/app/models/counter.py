from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, Field

class CounterCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Counter name e.g. Counter 1 - Dr. Sharma")
    operator_name: Optional[str] = Field(default=None, max_length=100, description="Name of operator/doctor")
    is_active: bool = Field(default=True, description="Whether counter is active")

class CounterUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    operator_name: Optional[str] = Field(default=None, max_length=100)
    is_active: Optional[bool] = None

class CounterResponse(BaseModel):
    id: str
    business_id: str
    name: str
    operator_name: Optional[str] = None
    is_active: bool = True
    current_token: Optional[int] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    model_config = {
        "populate_by_name": True,
        "json_schema_extra": {
            "example": {
                "id": "cnt_101",
                "business_id": "biz_123",
                "name": "Counter 1 - Dr. Sharma",
                "operator_name": "Dr. Sharma",
                "is_active": True,
                "current_token": 14,
            }
        }
    }
