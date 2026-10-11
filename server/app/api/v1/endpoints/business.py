from datetime import datetime, timezone
from typing import List, Optional, Any, Dict
import re
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field

from app.api.deps import get_database
from app.core.exceptions import BusinessNotFoundException
from app.core.seed_data import calculate_distance_km, seed_demo_businesses
from app.models.business import Business, BusinessCreate
from app.models.common import BusinessStatus, QueueStatus
from app.models.service import Service, ServiceCreate
from app.schemas.queue import QueueStatusResponse
from app.services.queue_engine import to_id_query

router = APIRouter()


class ToggleQueueStatusRequest(BaseModel):
    queue_status: QueueStatus = Field(..., alias="queueStatus")


class BusinessListItem(BaseModel):
    id: str
    name: str
    category: str
    address: str
    location: dict
    upi_id: Optional[str] = Field(default=None, alias="upiId")
    status: str
    queue_status: str = Field(..., alias="queueStatus")
    opening_time: Optional[str] = Field(default=None, alias="openingTime")
    closing_time: Optional[str] = Field(default=None, alias="closingTime")
    verified: bool = False
    current_token: int = Field(default=0, alias="currentToken")
    last_token: int = Field(default=0, alias="lastToken")
    waiting_count: int = Field(default=0, alias="waitingCount")
    estimated_wait_min: int = Field(default=0, alias="estimatedWaitMin")
    distance_km: Optional[float] = Field(default=None, alias="distanceKm")
    services_count: int = Field(default=0, alias="servicesCount")

    model_config = {"populate_by_name": True}


class BusinessDetailResponse(BaseModel):
    id: str
    name: str
    category: str
    address: str
    location: dict
    upi_id: Optional[str] = Field(default=None, alias="upiId")
    status: str
    queue_status: str = Field(..., alias="queueStatus")
    opening_time: Optional[str] = Field(default=None, alias="openingTime")
    closing_time: Optional[str] = Field(default=None, alias="closingTime")
    verified: bool = False
    services: List[Service] = []
    queue_state: QueueStatusResponse = Field(..., alias="queueState")

    model_config = {"populate_by_name": True}


@router.post(
    "/seed",
    summary="Seed Demo Indian Businesses (Apollo Clinic, Sharma Ji Salon, Chai Point, SBI)",
    status_code=status.HTTP_200_OK,
)
async def seed_businesses(
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Seed sample Indian businesses with realistic services and locations."""
    seeded_ids = await seed_demo_businesses(db)
    return {
        "status": "success",
        "message": f"Successfully seeded {len(seeded_ids)} businesses.",
        "business_ids": seeded_ids
    }


@router.get(
    "",
    response_model=List[BusinessListItem],
    summary="Search & Filter Businesses Directory (with Geo/Distance sorting)"
)
async def list_businesses(
    q: Optional[str] = Query(None, description="Search by name, address or category"),
    category: Optional[str] = Query(None, description="Filter by category (clinic, salon, restaurant, bank, retail)"),
    lat: Optional[float] = Query(None, description="Customer latitude for distance calculation"),
    lng: Optional[float] = Query(None, description="Customer longitude for distance calculation"),
    limit: int = Query(20, ge=1, le=100),
    skip: int = Query(0, ge=0),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Returns directory of businesses matching search/filter with live queue state
    and distance calculation.
    """
    query: Dict[str, Any] = {}

    if category and category.lower() != "all":
        query["category"] = category.lower()

    if q and q.strip():
        search_regex = re.compile(re.escape(q.strip()), re.IGNORECASE)
        query["$or"] = [
            {"name": search_regex},
            {"address": search_regex},
            {"category": search_regex},
        ]

    cursor = db.businesses.find(query).skip(skip).limit(limit)
    items: List[BusinessListItem] = []

    async for doc in cursor:
        biz_id = str(doc.get("_id", doc.get("id")))

        # Fetch live queue state
        q_state = await db.queue_state.find_one({"businessId": biz_id})
        current_token = q_state.get("currentToken", 0) if q_state else 0
        last_token = q_state.get("lastToken", 0) if q_state else 0
        waiting_count = q_state.get("waitingCount", 0) if q_state else 0
        queue_status = doc.get("queueStatus", doc.get("queue_status", "ACTIVE"))

        # Services count
        srv_count = await db.services.count_documents({"businessId": biz_id, "active": True})

        # Calculate distance if coords provided
        distance_km = None
        doc_loc = doc.get("location", {})
        coords = doc_loc.get("coordinates") if isinstance(doc_loc, dict) else None
        if lat is not None and lng is not None and coords and len(coords) >= 2:
            biz_lon, biz_lat = coords[0], coords[1]
            distance_km = calculate_distance_km(lat, lng, biz_lat, biz_lon)

        item = BusinessListItem(
            id=biz_id,
            name=doc.get("name", "Unknown Business"),
            category=doc.get("category", "retail"),
            address=doc.get("address", ""),
            location=doc_loc if isinstance(doc_loc, dict) else {"type": "Point", "coordinates": [0, 0]},
            upi_id=doc.get("upi_id") or doc.get("upiId"),
            status=doc.get("status", "OPEN"),
            queue_status=queue_status,
            opening_time=doc.get("opening_time") or doc.get("openingTime"),
            closing_time=doc.get("closing_time") or doc.get("closingTime"),
            verified=doc.get("verified", False),
            current_token=current_token,
            last_token=last_token,
            waiting_count=waiting_count,
            estimated_wait_min=waiting_count * 10,
            distance_km=distance_km,
            services_count=srv_count,
        )
        items.append(item)

    # Sort by distance if customer location was passed
    if lat is not None and lng is not None:
        items.sort(key=lambda x: (x.distance_km if x.distance_km is not None else float("inf")))

    return items


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
    "/{business_id}/detail",
    response_model=BusinessDetailResponse,
    summary="Get Full Business Profile with Services and Live Queue State"
)
async def get_business_detail(
    business_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    doc = await db.businesses.find_one(to_id_query(business_id))
    if not doc:
        raise BusinessNotFoundException(business_id=business_id)

    biz_id = str(doc.get("_id", doc.get("id")))

    # Fetch services
    services_cursor = db.services.find({"businessId": biz_id, "active": True})
    services = []
    async for s in services_cursor:
        s["_id"] = str(s.get("_id", s.get("id")))
        services.append(Service.model_validate(s))

    # Fetch queue state
    q_state = await db.queue_state.find_one({"businessId": biz_id})
    if not q_state:
        q_state_resp = QueueStatusResponse(
            business_id=biz_id,
            current_token=0,
            last_token=0,
            waiting_count=0,
            status=doc.get("queueStatus", doc.get("queue_status", "ACTIVE")),
        )
    else:
        q_state_resp = QueueStatusResponse(
            business_id=biz_id,
            current_token=q_state.get("currentToken", 0),
            last_token=q_state.get("lastToken", 0),
            waiting_count=q_state.get("waitingCount", 0),
            status=q_state.get("status", "ACTIVE"),
        )

    return BusinessDetailResponse(
        id=biz_id,
        name=doc.get("name", "Unknown Business"),
        category=doc.get("category", "retail"),
        address=doc.get("address", ""),
        location=doc.get("location", {"type": "Point", "coordinates": [0, 0]}),
        upi_id=doc.get("upi_id") or doc.get("upiId"),
        status=doc.get("status", "OPEN"),
        queue_status=doc.get("queueStatus", doc.get("queue_status", "ACTIVE")),
        opening_time=doc.get("opening_time") or doc.get("openingTime"),
        closing_time=doc.get("closing_time") or doc.get("closingTime"),
        verified=doc.get("verified", False),
        services=services,
        queue_state=q_state_resp,
    )


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
