from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.api.deps import get_database
from app.core.websocket_manager import ws_manager
from app.models.owner import OwnerOnboardingRequest, PaymentStatusUpdateRequest
from app.models.service import ServiceCreate, Service
from app.api.v1.endpoints.auth import get_current_owner
from bson import ObjectId

router = APIRouter()

def mask_mobile(mobile: str) -> str:
    clean = mobile.strip()
    if len(clean) == 10:
        return f"{clean[:2]}XX-XX{clean[-2:]}"
    elif len(clean) > 4:
        return f"{clean[:2]}****{clean[-2:]}"
    return clean

def to_id_query(val: str):
    if ObjectId.is_valid(val):
        return {"$in": [val, ObjectId(val)]}
    return val

@router.post("/business/onboard", status_code=status.HTTP_201_CREATED)
async def onboard_merchant(
    payload: OwnerOnboardingRequest,
    current_owner: dict = Depends(get_current_owner),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    owner_id = str(current_owner["_id"])

    # 1. Create Business
    biz_doc = {
        "name": payload.shop_name,
        "category": payload.category.lower(),
        "address": f"{payload.address}, {payload.city} - {payload.pincode}",
        "location": {
            "type": "Point",
            "coordinates": [payload.longitude, payload.latitude],
        },
        "owner_id": owner_id,
        "upi_id": payload.upi_id or f"{payload.shop_name.lower().replace(' ', '')}@okaxis",
        "opening_time": payload.opening_time,
        "closing_time": payload.closing_time,
        "status": "ACTIVE",
        "verified": True,
        "created_at": datetime.now(timezone.utc),
    }

    biz_result = await db.businesses.insert_one(biz_doc)
    business_id = str(biz_result.inserted_id)

    # 2. Update Owner's business_ids
    await db.owners.update_one(
        {"_id": current_owner["_id"]},
        {"$addToSet": {"business_ids": business_id}},
    )

    # 3. Create Initial Queue State
    queue_state_doc = {
        "business_id": business_id,
        "current_token": 0,
        "last_token": 0,
        "waiting_count": 0,
        "status": "ACTIVE",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
    }
    await db.queue_states.insert_one(queue_state_doc)

    # 4. Insert Initial Services
    created_services = []
    if payload.services:
        for s in payload.services:
            srv_doc = {
                "business_id": business_id,
                "name": s.name,
                "price": s.price,
                "estimated_duration": s.estimated_duration,
                "active": True,
                "created_at": datetime.now(timezone.utc),
            }
            res = await db.services.insert_one(srv_doc)
            srv_doc["id"] = str(res.inserted_id)
            srv_doc["businessId"] = business_id
            srv_doc.pop("_id", None)
            created_services.append(srv_doc)
    else:
        # Default General Service
        srv_doc = {
            "business_id": business_id,
            "name": "General Service",
            "price": 100.0,
            "estimated_duration": 15,
            "active": True,
            "created_at": datetime.now(timezone.utc),
        }
        res = await db.services.insert_one(srv_doc)
        srv_doc["id"] = str(res.inserted_id)
        srv_doc["businessId"] = business_id
        srv_doc.pop("_id", None)
        created_services.append(srv_doc)

    return {
        "business_id": business_id,
        "name": payload.shop_name,
        "category": payload.category,
        "address": biz_doc["address"],
        "upi_id": biz_doc["upi_id"],
        "services": created_services,
        "message": "Business successfully onboarded in 2 minutes!",
    }

@router.get("/business/{business_id}/dashboard")
async def get_owner_dashboard(
    business_id: str,
    current_owner: dict = Depends(get_current_owner),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    # Get business
    biz_query = {"$or": [{"_id": to_id_query(business_id)}, {"id": business_id}, {"businessId": business_id}]}
    biz = await db.businesses.find_one(biz_query)
    if not biz:
        raise HTTPException(status_code=404, detail="Business not found")

    biz_id_filter = {"$or": [{"businessId": business_id}, {"business_id": business_id}]}

    # Get queue state from db.queues or db.queue_states
    q = await db.queues.find_one(biz_id_filter)
    qs = await db.queue_states.find_one(biz_id_filter)
    
    current_token = 0
    last_token = 0
    queue_status = "ACTIVE"

    if q:
        current_token = q.get("currentToken", 0)
        last_token = q.get("lastToken", 0)
        queue_status = q.get("status", "ACTIVE")
    elif qs:
        current_token = qs.get("current_token", 0)
        last_token = qs.get("last_token", 0)
        queue_status = qs.get("status", "ACTIVE")

    waiting_count = await db.queue_entries.count_documents({
        **biz_id_filter,
        "status": {"$in": ["WAITING", "waiting"]}
    })

    # Find the currently serving entry
    serving_entry = await db.queue_entries.find_one({
        **biz_id_filter,
        "status": {"$in": ["SERVING", "serving"]}
    })

    now_serving_card = None
    if serving_entry:
        now_serving_card = {
            "entryId": str(serving_entry.get("_id", serving_entry.get("id"))),
            "tokenNumber": serving_entry.get("tokenNumber", serving_entry.get("token_number")),
            "customerName": serving_entry.get("customerName", serving_entry.get("customer_name")),
            "maskedMobile": mask_mobile(serving_entry.get("customerMobile", serving_entry.get("customer_mobile", ""))),
            "serviceName": serving_entry.get("serviceName", serving_entry.get("service_name", "Service")),
            "servicePrice": serving_entry.get("servicePrice", serving_entry.get("service_price_snapshot", 0)),
            "status": serving_entry.get("status"),
            "paymentStatus": serving_entry.get("paymentStatus", serving_entry.get("payment_status", "UNPAID")).upper(),
            "paymentMode": serving_entry.get("paymentMode", serving_entry.get("payment_mode", "CASH")).upper(),
            "joinedAt": serving_entry.get("createdAt", serving_entry.get("created_at")),
        }

    # Today's stats calculation (since start of today UTC)
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    served_today_count = await db.queue_entries.count_documents({
        **biz_id_filter,
        "status": {"$in": ["COMPLETED", "completed"]}
    })

    skipped_today_count = await db.queue_entries.count_documents({
        **biz_id_filter,
        "status": {"$in": ["CANCELLED", "cancelled", "SKIPPED", "skipped"]}
    })

    # Total revenue today
    completed_entries = await db.queue_entries.find({
        **biz_id_filter,
        "status": {"$in": ["COMPLETED", "completed"]}
    }).to_list(1000)

    total_revenue_today = sum(
        float(e.get("servicePrice", e.get("service_price_snapshot", 0)))
        for e in completed_entries
    )

    return {
        "businessId": business_id,
        "businessName": biz.get("name"),
        "queueStatus": queue_status,
        "currentToken": current_token,
        "lastToken": last_token,
        "waitingCount": waiting_count,
        "nowServing": now_serving_card,
        "stats": {
            "waitingCount": waiting_count,
            "servedToday": served_today_count,
            "skippedToday": skipped_today_count,
            "totalRevenueToday": total_revenue_today,
        }
    }

@router.get("/business/{business_id}/queue")
async def get_owner_live_queue(
    business_id: str,
    current_owner: dict = Depends(get_current_owner),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    biz_id_filter = {"$or": [{"businessId": business_id}, {"business_id": business_id}]}
    entries = await db.queue_entries.find({
        **biz_id_filter,
        "status": {"$in": ["SERVING", "serving", "WAITING", "waiting"]}
    }).sort([("tokenNumber", 1)]).to_list(200)

    result = []
    now = datetime.now(timezone.utc)
    for e in entries:
        created_at = e.get("createdAt", e.get("created_at", now))
        if hasattr(created_at, "tzinfo") and created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        wait_min = max(0, int((now - created_at).total_seconds() / 60))

        result.append({
            "entryId": str(e.get("_id", e.get("id"))),
            "tokenNumber": e.get("tokenNumber", e.get("token_number")),
            "customerName": e.get("customerName", e.get("customer_name")),
            "maskedMobile": mask_mobile(e.get("customerMobile", e.get("customer_mobile", ""))),
            "customerMobile": e.get("customerMobile", e.get("customer_mobile", "")),
            "serviceId": e.get("serviceId", e.get("service_id")),
            "serviceName": e.get("serviceName", e.get("service_name", "General")),
            "servicePrice": e.get("servicePrice", e.get("service_price_snapshot", 0)),
            "status": e.get("status"),
            "paymentStatus": e.get("paymentStatus", e.get("payment_status", "UNPAID")).upper(),
            "paymentMode": e.get("paymentMode", e.get("payment_mode", "CASH")).upper(),
            "waitTimeMin": wait_min,
            "createdAt": created_at.isoformat(),
        })

    return result

@router.patch("/queue/{entry_id}/payment")
async def update_payment_status(
    entry_id: str,
    payload: PaymentStatusUpdateRequest,
    current_owner: dict = Depends(get_current_owner),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    query = {"$or": [{"_id": to_id_query(entry_id)}, {"id": entry_id}]}
    
    entry = await db.queue_entries.find_one(query)
    if not entry:
        raise HTTPException(status_code=404, detail="Queue entry not found")

    await db.queue_entries.update_one(
        query,
        {
            "$set": {
                "payment_status": payload.payment_status.upper(),
                "paymentStatus": payload.payment_status.lower(),
                "payment_mode": payload.payment_mode.upper() if payload.payment_mode else "CASH",
                "paymentMode": payload.payment_mode.upper() if payload.payment_mode else "CASH",
                "updated_at": datetime.now(timezone.utc),
                "updatedAt": datetime.now(timezone.utc),
            }
        }
    )

    return {
        "entryId": entry_id,
        "paymentStatus": payload.payment_status.upper(),
        "paymentMode": payload.payment_mode.upper() if payload.payment_mode else "CASH",
        "message": "Payment status successfully updated",
    }

@router.post("/business/{business_id}/queue/reset")
async def reset_daily_queue(
    business_id: str,
    current_owner: dict = Depends(get_current_owner),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    biz_match = {"$or": [{"businessId": business_id}, {"business_id": business_id}]}
    now = datetime.now(timezone.utc)

    # Reset Queue State to #0
    await db.queues.update_many(
        biz_match,
        {"$set": {"currentToken": 0, "lastToken": 0, "status": "ACTIVE", "updatedAt": now}}
    )
    await db.queue_states.update_many(
        biz_match,
        {
            "$set": {
                "current_token": 0,
                "last_token": 0,
                "waiting_count": 0,
                "status": "ACTIVE",
                "updated_at": now,
            }
        }
    )

    # Close any remaining WAITING or SERVING entries
    await db.queue_entries.update_many(
        {
            "$and": [
                biz_match,
                {"status": {"$in": ["WAITING", "waiting", "SERVING", "serving"]}}
            ]
        },
        {"$set": {"status": "cancelled", "cancellation_reason": "Daily end-of-day reset", "updated_at": now, "updatedAt": now}}
    )

    # Broadcast WebSocket notification
    await ws_manager.notify_queue_state_changed(db, business_id)

    return {
        "businessId": business_id,
        "currentToken": 0,
        "lastToken": 0,
        "waitingCount": 0,
        "reset": True,
        "message": "Queue counter successfully reset to #0 for the new business day.",
    }

@router.post("/business/{business_id}/queue/toggle-pause")
async def toggle_queue_pause(
    business_id: str,
    current_owner: dict = Depends(get_current_owner),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    biz_match = {"$or": [{"businessId": business_id}, {"business_id": business_id}]}
    q = await db.queue_states.find_one(biz_match)
    if not q:
        q = await db.queues.find_one(biz_match)
    curr_status = q.get("status", "ACTIVE") if q else "ACTIVE"
    new_status = "PAUSED" if curr_status == "ACTIVE" else "ACTIVE"
    now = datetime.now(timezone.utc)

    await db.queue_states.update_many(biz_match, {"$set": {"status": new_status, "updated_at": now}}, upsert=True)
    await db.queues.update_many(biz_match, {"$set": {"status": new_status, "updatedAt": now}})
    await ws_manager.notify_queue_state_changed(db, business_id)

    return {"businessId": business_id, "queueStatus": new_status, "message": f"Queue is now {new_status}"}

@router.post("/business/{business_id}/toggle-status")
async def toggle_business_open_close(
    business_id: str,
    current_owner: dict = Depends(get_current_owner),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    biz_query = {"$or": [{"_id": to_id_query(business_id)}, {"id": business_id}, {"businessId": business_id}]}
    biz = await db.businesses.find_one(biz_query)
    if not biz:
        raise HTTPException(status_code=404, detail="Business not found")

    curr_status = biz.get("status", "ACTIVE")
    new_status = "CLOSED" if curr_status in ["ACTIVE", "OPEN"] else "ACTIVE"

    await db.businesses.update_one(biz_query, {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc)}})
    await ws_manager.notify_queue_state_changed(db, business_id)

    return {"businessId": business_id, "businessStatus": new_status, "message": f"Business status is now {new_status}"}

@router.get("/business/{business_id}/services")
async def get_owner_services(
    business_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    services_cursor = db.services.find({"business_id": business_id}).sort("price", 1)
    services = await services_cursor.to_list(100)
    for s in services:
        s["id"] = str(s.get("_id", s.get("id")))
        s["businessId"] = business_id
        s.pop("_id", None)
    return services

@router.post("/business/{business_id}/services", status_code=status.HTTP_201_CREATED)
async def create_owner_service(
    business_id: str,
    payload: ServiceCreate,
    current_owner: dict = Depends(get_current_owner),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    srv_doc = {
        "business_id": business_id,
        "name": payload.name,
        "price": payload.price,
        "estimated_duration": payload.estimated_duration,
        "active": payload.active,
        "created_at": datetime.now(timezone.utc),
    }
    res = await db.services.insert_one(srv_doc)
    srv_doc["id"] = str(res.inserted_id)
    srv_doc["businessId"] = business_id
    srv_doc.pop("_id", None)
    return srv_doc

@router.put("/business/{business_id}/services/{service_id}")
async def update_owner_service(
    business_id: str,
    service_id: str,
    payload: ServiceCreate,
    current_owner: dict = Depends(get_current_owner),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    query = {"$or": [{"_id": to_id_query(service_id)}, {"id": service_id}]}
    res = await db.services.update_one(
        query,
        {
            "$set": {
                "name": payload.name,
                "price": payload.price,
                "estimated_duration": payload.estimated_duration,
                "active": payload.active,
                "updated_at": datetime.now(timezone.utc),
            }
        }
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Service not found")
    return {"message": "Service successfully updated", "serviceId": service_id}

@router.get("/business/{business_id}/analytics")
async def get_owner_analytics(
    business_id: str,
    current_owner: dict = Depends(get_current_owner),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    # 7-day window
    seven_days_ago = datetime.now(timezone.utc) - timedelta(days=7)
    
    entries = await db.queue_entries.find({
        "business_id": business_id,
        "created_at": {"$gte": seven_days_ago}
    }).to_list(1000)

    # Hourly distribution (0-23 hours)
    hourly_counts = {h: 0 for h in range(8, 22)} # 8 AM to 10 PM
    total_served = 0
    total_revenue = 0.0
    wait_times = []
    service_counts: Dict[str, int] = {}

    for e in entries:
        dt = e.get("created_at")
        if dt:
            hour = dt.hour
            if hour in hourly_counts:
                hourly_counts[hour] += 1
        
        if e.get("status") == "COMPLETED":
            total_served += 1
            total_revenue += float(e.get("service_price_snapshot", 0))
            if e.get("updated_at") and e.get("created_at"):
                duration = (e["updated_at"] - e["created_at"]).total_seconds() / 60
                wait_times.append(max(1, int(duration)))

        svc = e.get("service_name", "General")
        service_counts[svc] = service_counts.get(svc, 0) + 1

    avg_wait_min = round(sum(wait_times) / len(wait_times), 1) if wait_times else 12.5

    peak_hours = [
        {"hour": f"{h:02d}:00", "count": count}
        for h, count in hourly_counts.items()
    ]

    return {
        "businessId": business_id,
        "totalServed7Days": total_served,
        "totalRevenue7Days": total_revenue,
        "averageWaitMin": avg_wait_min,
        "peakHours": peak_hours,
        "serviceBreakdown": [
            {"name": k, "count": v} for k, v in service_counts.items()
        ],
    }
