from datetime import datetime, timezone
from typing import Optional, List
from pydantic import BaseModel, Field
from app.models.common import PyObjectId, BusinessPlan

class AdminGrievance(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    customer_mobile: str = Field(..., description="Complainant mobile")
    customer_name: Optional[str] = Field(default=None)
    business_id: Optional[str] = Field(default=None)
    business_name: Optional[str] = Field(default=None)
    issue_type: str = Field(..., description="e.g. fake_wait, rude_behavior, payment_issue, other")
    description: str = Field(..., max_length=1000)
    status: str = Field(default="pending", description="pending, resolved, dismissed")
    resolution_note: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    resolved_at: Optional[datetime] = Field(default=None)

class GrievanceCreate(BaseModel):
    customer_mobile: str
    customer_name: Optional[str] = None
    business_id: Optional[str] = None
    business_name: Optional[str] = None
    issue_type: str
    description: str

class GrievanceResolve(BaseModel):
    status: str = Field(..., description="resolved or dismissed")
    resolution_note: str

class CategoryItem(BaseModel):
    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    name: str = Field(..., min_length=2, max_length=50)
    slug: str = Field(..., min_length=2, max_length=50)
    icon: Optional[str] = Field(default="🏪")
    display_order: int = Field(default=0)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CategoryCreate(BaseModel):
    name: str
    slug: str
    icon: Optional[str] = "🏪"
    display_order: Optional[int] = 0

class SubscriptionOverrideRequest(BaseModel):
    plan: BusinessPlan
