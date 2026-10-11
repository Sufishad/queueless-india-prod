from datetime import datetime, timezone
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from app.api.deps import get_database
from app.api.v1.endpoints.auth import get_current_owner
from app.models.appointment import (
    AppointmentCreate,
    AppointmentResponse,
    AppointmentCheckInResponse,
    AvailableSlotsResponse,
)
from app.services.queue_engine import QueueEngine
from app.core.websocket_manager import ws_manager

router = APIRouter()

STANDARD_SLOTS = [
    "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM",
    "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM",
    "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM",
    "04:00 PM", "04:30 PM", "05:00 PM", "05:30 PM"
]

def to_id_query(val: str):
    if ObjectId.is_valid(val):
        return ObjectId(val)
    return val

@router.get("/businesses/{business_id}/appointment-slots", response_model=AvailableSlotsResponse)
async def get_available_appointment_slots(
    business_id: str,
    date: str = Query(..., description="Date YYYY-MM-DD"),
    service_id: Optional[str] = Query(default=None),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """Calculates available appointment time slots for a given date."""
    query = {
        "$or": [{"business_id": business_id}, {"businessId": business_id}],
        "appointment_date": date,
        "status": {"$in": ["SCHEDULED", "CHECKED_IN"]}
    }
    if service_id:
        query["$or"] = [
            {"service_id": service_id},
            {"serviceId": service_id}
        ]

    booked_cursor = db.appointments.find(query)
    booked_slots = []
    async for appt in booked_cursor:
        slot = appt.get("slot_time") or appt.get("slotTime")
        if slot and slot not in booked_slots:
            booked_slots.append(slot)

    available = [s for s in STANDARD_SLOTS if s not in booked_slots]

    return AvailableSlotsResponse(
        business_id=business_id,
        service_id=service_id or "all",
        date=date,
        available_slots=available,
        booked_slots=booked_slots
    )

@router.post("/businesses/{business_id}/appointments", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
async def book_appointment(
    business_id: str,
    payload: AppointmentCreate,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """Customer books a scheduled appointment without OTP."""
    # Validate service exists
    svc_query = {
        "$or": [{"_id": to_id_query(payload.service_id)}, {"id": payload.service_id}]
    }
    svc = await db.services.find_one(svc_query)
    service_name = svc.get("name", "Consultation") if svc else "Consultation"
    service_price = float(svc.get("price", 250.0)) if svc else 250.0

    # Check slot conflict
    conflict = await db.appointments.find_one({
        "$or": [{"business_id": business_id}, {"businessId": business_id}],
        "appointment_date": payload.appointment_date,
        "slot_time": payload.slot_time,
        "status": {"$in": ["SCHEDULED", "CHECKED_IN"]}
    })
    if conflict:
        raise HTTPException(status_code=400, detail="This time slot is already booked. Please choose another slot.")

    now = datetime.now(timezone.utc)
    appt_id = f"apt_{uuid.uuid4().hex[:10]}"

    appt_doc = {
        "id": appt_id,
        "business_id": business_id,
        "businessId": business_id,
        "service_id": payload.service_id,
        "service_name": service_name,
        "service_price": service_price,
        "customer_name": payload.customer_name,
        "customer_mobile": payload.customer_mobile,
        "appointment_date": payload.appointment_date,
        "slot_time": payload.slot_time,
        "status": "SCHEDULED",
        "notes": payload.notes,
        "token_id": None,
        "token_number": None,
        "created_at": now
    }

    await db.appointments.insert_one(appt_doc)

    return AppointmentResponse(
        id=appt_id,
        business_id=business_id,
        service_id=payload.service_id,
        service_name=service_name,
        service_price=service_price,
        customer_name=payload.customer_name,
        customer_mobile=payload.customer_mobile,
        appointment_date=payload.appointment_date,
        slot_time=payload.slot_time,
        status="SCHEDULED",
        token_id=None,
        token_number=None,
        notes=payload.notes,
        created_at=now
    )

@router.get("/owner/business/{business_id}/appointments", response_model=List[AppointmentResponse])
async def list_owner_appointments(
    business_id: str,
    date: Optional[str] = Query(default=None, description="Filter by YYYY-MM-DD"),
    current_owner: dict = Depends(get_current_owner),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """Lists appointments for the owner's business."""
    match: dict = {"$or": [{"business_id": business_id}, {"businessId": business_id}]}
    if date:
        match["appointment_date"] = date

    cursor = db.appointments.find(match).sort("slot_time", 1)
    results = []
    async for a in cursor:
        results.append(
            AppointmentResponse(
                id=str(a.get("id") or a.get("_id")),
                business_id=business_id,
                service_id=a.get("service_id", ""),
                service_name=a.get("service_name", "Consultation"),
                service_price=float(a.get("service_price", 0.0)),
                customer_name=a.get("customer_name", ""),
                customer_mobile=a.get("customer_mobile", ""),
                appointment_date=a.get("appointment_date", ""),
                slot_time=a.get("slot_time", ""),
                status=a.get("status", "SCHEDULED"),
                token_id=a.get("token_id"),
                token_number=a.get("token_number"),
                notes=a.get("notes"),
                created_at=a.get("created_at") or datetime.now(timezone.utc)
            )
        )
    return results

@router.post("/owner/business/{business_id}/appointments/{appointment_id}/check-in", response_model=AppointmentCheckInResponse)
async def check_in_appointment(
    business_id: str,
    appointment_id: str,
    current_owner: dict = Depends(get_current_owner),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    On-arrival 1-Tap Check-In:
    Converts a scheduled appointment into an immediate live queue token
    via QueueEngine atomic increment!
    """
    appt_query = {
        "$and": [
            {"$or": [{"business_id": business_id}, {"businessId": business_id}]},
            {"$or": [{"id": appointment_id}, {"_id": to_id_query(appointment_id)}]}
        ]
    }
    appt = await db.appointments.find_one(appt_query)
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    if appt.get("status") == "CHECKED_IN":
        raise HTTPException(
            status_code=400,
            detail=f"Appointment already checked in! Token #{appt.get('token_number')}"
        )

    if appt.get("status") == "CANCELLED":
        raise HTTPException(status_code=400, detail="Appointment is cancelled")

    # Atomic token generation via QueueEngine
    from app.schemas.queue import JoinQueueRequest
    now = datetime.now(timezone.utc)
    join_req = JoinQueueRequest(
        customer_name=f"{appt['customer_name']} (Appt)",
        customer_mobile=appt["customer_mobile"],
        service_id=appt.get("service_id"),
        customer_id=f"appt_{appt['id']}"
    )
    entry = await QueueEngine.join_queue(
        db=db,
        business_id=business_id,
        request=join_req,
        customer_session_id=f"appt_{appt['id']}"
    )
    tok_id = str(entry.get("entryId") or entry.get("id"))
    tok_num = int(entry["tokenNumber"])

    # Update appointment status
    await db.appointments.update_one(
        appt_query,
        {
            "$set": {
                "status": "CHECKED_IN",
                "checked_in_at": now,
                "token_id": tok_id,
                "token_number": tok_num
            }
        }
    )

    # Trigger WebSocket Broadcast
    await ws_manager.notify_queue_state_changed(db, business_id)

    return AppointmentCheckInResponse(
        appointment_id=appointment_id,
        token_id=tok_id,
        token_number=tok_num,
        customer_name=appt["customer_name"],
        service_name=appt.get("service_name", "Consultation"),
        status="CHECKED_IN",
        message=f"Checked in successfully! Assigned Token #{tok_num}"
    )
