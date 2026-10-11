from datetime import datetime, timezone
from typing import List, Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field

from app.api.deps import get_database
from app.core.exceptions import BusinessNotFoundException
from app.models.business import Business, BusinessCreate
from app.models.common import BusinessStatus, QueueStatus
from app.models.service import Service, ServiceCreate
from app.services.queue_engine import to_id_query

router = APIRouter()


class ToggleQueueStatusRequest(BaseModel):
    queue_status: QueueStatus = Field(..., alias="queueStatus")


@router.post(
    "",
    response_model=Business,
    status_code=status.HTTP_201_CREATED,
    summary="Create / Register Business"
)
async def create_business(
    payload: BusinessCreate,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    now = datetime.now(timezone.utc)
    business_doc = payload.model_dump()
    business_doc.update({
        "status": BusinessStatus.OPEN.value,
        "queueStatus": QueueStatus.ACTIVE.value,
        "plan": "free",
        "verified": False,
        "createdAt": now,
        "updatedAt": now
    })
    
    result = await db.businesses.insert_one(business_doc)
    business_doc["_id"] = str(result.inserted_id)
    business_doc["id"] = str(result.inserted_id)
    return Business.model_validate(business_doc)


@router.get(
    "/{business_id}",
    response_model=Business,
    summary="Get Business Profile"
)
async def get_business(
    business_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    doc = await db.businesses.find_one(to_id_query(business_id))
    if not doc:
        raise BusinessNotFoundException(business_id=business_id)
    doc["_id"] = str(doc["_id"])
    return Business.model_validate(doc)


@router.post(
    "/{business_id}/services",
    response_model=Service,
    status_code=status.HTTP_201_CREATED,
    summary="Add Service to Business"
)
async def add_service(
    business_id: str,
    payload: ServiceCreate,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    # Verify business exists
    business = await db.businesses.find_one(to_id_query(business_id))
    if not business:
        raise BusinessNotFoundException(business_id=business_id)

    now = datetime.now(timezone.utc)
    service_doc = payload.model_dump()
    service_doc["businessId"] = business_id
    service_doc["createdAt"] = now
    service_doc["updatedAt"] = now

    result = await db.services.insert_one(service_doc)
    service_doc["_id"] = str(result.inserted_id)
    return Service.model_validate(service_doc)


@router.get(
    "/{business_id}/services",
    response_model=List[Service],
    summary="List Services for Business"
)
async def list_services(
    business_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    cursor = db.services.find({"businessId": business_id, "active": True})
    services = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        services.append(Service.model_validate(doc))
    return services


@router.patch(
    "/{business_id}/queue-status",
    summary="Pause / Resume Queue"
)
async def toggle_queue_status(
    business_id: str,
    payload: ToggleQueueStatusRequest,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    res = await db.businesses.update_one(
        to_id_query(business_id),
        {"$set": {"queueStatus": payload.queue_status.value, "updatedAt": datetime.now(timezone.utc)}}
    )
    if res.matched_count == 0:
        raise BusinessNotFoundException(business_id=business_id)

    return {"message": f"Queue status updated to {payload.queue_status.value}."}
