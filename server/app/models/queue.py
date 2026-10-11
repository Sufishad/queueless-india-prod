from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.models.common import (
    IndianMobileNumber,
    PaymentStatus,
    PyObjectId,
    QueueEntryStatus,
    QueueStatus,
)


class Queue(BaseModel):
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    business_id: str = Field(..., alias="businessId")
    current_token: int = Field(default=0, ge=0, alias="currentToken")
    last_token: int = Field(default=0, ge=0, alias="lastToken")
    date: str = Field(..., description="Date format: YYYY-MM-DD")
    status: QueueStatus = Field(default=QueueStatus.ACTIVE)
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), alias="updatedAt"
    )


class QueueEntry(BaseModel):
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    business_id: str = Field(..., alias="businessId")
    customer_id: Optional[str] = Field(default=None, alias="customerId")
    customer_name: str = Field(..., min_length=1, max_length=100, alias="customerName")
    customer_mobile: IndianMobileNumber = Field(..., alias="customerMobile")
    service_id: Optional[str] = Field(default=None, alias="serviceId")
    service_name: str = Field(..., min_length=1, max_length=100, alias="serviceName")
    service_price: float = Field(..., ge=0, alias="servicePrice", description="Frozen price snapshot")
    counter_id: Optional[str] = Field(default=None, alias="counterId")
    token_number: int = Field(..., ge=1, alias="tokenNumber")
    status: QueueEntryStatus = Field(default=QueueEntryStatus.WAITING)
    payment_status: PaymentStatus = Field(default=PaymentStatus.UNPAID, alias="paymentStatus")
    estimated_wait_min: int = Field(default=0, ge=0, alias="estimatedWaitMin")
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), alias="createdAt"
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), alias="updatedAt"
    )


class Counter(BaseModel):
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    business_id: str = Field(..., alias="businessId")
    name: str = Field(..., min_length=1, max_length=100)
    current_token: int = Field(default=0, ge=0, alias="currentToken")
    active: bool = Field(default=True)
