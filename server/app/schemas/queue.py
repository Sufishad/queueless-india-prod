from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator
from app.models.common import IndianMobileNumber, validate_indian_mobile


class JoinQueueRequest(BaseModel):
    customer_name: str = Field(..., min_length=1, max_length=100, alias="customerName")
    customer_mobile: str = Field(..., alias="customerMobile")
    service_id: Optional[str] = Field(default=None, alias="serviceId")
    customer_id: Optional[str] = Field(default=None, alias="customerId", description="Client device session ID")

    @field_validator("customer_mobile")
    @classmethod
    def clean_mobile(cls, v: str) -> str:
        return validate_indian_mobile(v)


class JoinQueueResponse(BaseModel):
    entry_id: str = Field(..., alias="entryId")
    business_id: str = Field(..., alias="businessId")
    token_number: int = Field(..., alias="tokenNumber")
    customer_name: str = Field(..., alias="customerName")
    customer_mobile: str = Field(..., alias="customerMobile")
    service_name: str = Field(..., alias="serviceName")
    service_price: float = Field(..., alias="servicePrice")
    people_ahead: int = Field(..., alias="peopleAhead")
    estimated_wait_min: int = Field(..., alias="estimatedWaitMin")
    status: str
    created_at: datetime = Field(..., alias="createdAt")

    model_config = {"populate_by_name": True}


class QueueStatusResponse(BaseModel):
    business_id: str = Field(..., alias="businessId")
    current_token: int = Field(..., alias="currentToken")
    last_token: int = Field(..., alias="lastToken")
    waiting_count: int = Field(..., alias="waitingCount")
    status: str
    now_serving: Optional[dict] = Field(default=None, alias="nowServing")

    model_config = {"populate_by_name": True}


class CallNextRequest(BaseModel):
    counter_id: Optional[str] = Field(default=None, alias="counterId")


class CompleteTokenRequest(BaseModel):
    counter_id: Optional[str] = Field(default=None, alias="counterId")


class SkipTokenRequest(BaseModel):
    reason: Optional[str] = None


class CancelTokenRequest(BaseModel):
    reason: Optional[str] = None


class WalkInTokenRequest(BaseModel):
    customer_name: str = Field(default="Walk-in Customer", alias="customerName")
    customer_mobile: Optional[str] = Field(default="9999999999", alias="customerMobile")
    service_id: Optional[str] = Field(default=None, alias="serviceId")
    counter_id: Optional[str] = Field(default=None, alias="counterId")

    @field_validator("customer_mobile")
    @classmethod
    def clean_mobile(cls, v: Optional[str]) -> str:
        if not v:
            return "9999999999"
        return validate_indian_mobile(v)
