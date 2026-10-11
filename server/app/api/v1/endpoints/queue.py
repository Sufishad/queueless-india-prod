from typing import Optional
from fastapi import APIRouter, Depends, Header, Query, status
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.deps import get_customer_session_id, get_database, get_owner_authorization
from app.core.websocket_manager import ws_manager
from app.schemas.queue import (
    CallNextRequest,
    CancelTokenRequest,
    CompleteTokenRequest,
    JoinQueueRequest,
    JoinQueueResponse,
    QueueStatusResponse,
    SkipTokenRequest,
    WalkInTokenRequest,
)
from app.services.queue_engine import QueueEngine, to_id_query

router = APIRouter()


@router.post(
    "/{business_id}/queue/join",
    response_model=JoinQueueResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Join Queue (Zero-Friction, 100% OTP-Free)"
)
async def join_queue(
    business_id: str,
    payload: JoinQueueRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
    customer_session_id: Optional[str] = Depends(get_customer_session_id)
):
    """
    Zero-friction token booking with Name + 10-digit Indian mobile.
    Executes atomic `$inc` token increment and freezes the service price snapshot.
    """
    entry = await QueueEngine.join_queue(
        db=db,
        business_id=business_id,
        request=payload,
        customer_session_id=customer_session_id
    )
    # Broadcast live state & turn approaching alerts
    await ws_manager.notify_queue_state_changed(db, business_id)
    return entry


@router.get(
    "/{business_id}/queue/state",
    response_model=QueueStatusResponse,
    summary="Get Real-time Queue State"
)
async def get_queue_state(
    business_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Returns real-time snapshot: currentToken, lastToken, waitingCount, and nowServing.
    """
    return await QueueEngine.get_live_queue_state(db=db, business_id=business_id)


@router.get(
    "/{business_id}/queue/token/{entry_id}",
    summary="Get Customer Token Tracking Details"
)
async def get_token_status(
    business_id: str,
    entry_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Returns live progress for customer token including peopleAhead and estimated wait.
    """
    return await QueueEngine.get_customer_token_status(
        db=db,
        business_id=business_id,
        entry_id=entry_id
    )


@router.post(
    "/{business_id}/queue/call-next",
    summary="Call Next Customer (Business Owner)"
)
async def call_next_customer(
    business_id: str,
    payload: Optional[CallNextRequest] = None,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """
    Advances the queue by calling the next waiting customer.
    Updates currentToken on the business queue.
    """
    counter_id = payload.counter_id if payload else None
    next_entry = await QueueEngine.call_next(
        db=db,
        business_id=business_id,
        counter_id=counter_id
    )
    if not next_entry:
        return {"message": "No customers currently waiting in the queue.", "entry": None}
    await ws_manager.notify_queue_state_changed(db, business_id)
    return {"message": f"Called Token #{next_entry['tokenNumber']}", "entry": next_entry}


@router.post(
    "/{business_id}/queue/token/{entry_id}/complete",
    summary="Mark Token Completed"
)
async def complete_token(
    business_id: str,
    entry_id: str,
    payload: Optional[CompleteTokenRequest] = None,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    counter_id = payload.counter_id if payload else None
    entry = await QueueEngine.complete_token(
        db=db,
        business_id=business_id,
        entry_id=entry_id,
        counter_id=counter_id
    )
    await ws_manager.notify_queue_state_changed(db, business_id)
    return {"message": "Token completed successfully.", "entry": entry}


@router.post(
    "/{business_id}/queue/token/{entry_id}/skip",
    summary="Skip Token (No-show)"
)
async def skip_token(
    business_id: str,
    entry_id: str,
    payload: Optional[SkipTokenRequest] = None,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    reason = payload.reason if payload else None
    entry = await QueueEngine.skip_token(
        db=db,
        business_id=business_id,
        entry_id=entry_id,
        reason=reason
    )
    await ws_manager.notify_queue_state_changed(db, business_id)
    return {"message": "Token skipped.", "entry": entry}


@router.post(
    "/{business_id}/queue/token/{entry_id}/cancel",
    summary="Cancel Token (Dual-Role OTP-Free)"
)
async def cancel_token(
    business_id: str,
    entry_id: str,
    payload: Optional[CancelTokenRequest] = None,
    db: AsyncIOMotorDatabase = Depends(get_database),
    customer_session_id: Optional[str] = Depends(get_customer_session_id),
    is_owner: bool = Depends(get_owner_authorization)
):
    """
    Dual-role OTP-Free cancellation:
    - Customer cancels if matching their device session ID.
    - Owner can cancel any token.
    """
    reason = payload.reason if payload else None
    entry = await QueueEngine.cancel_token(
        db=db,
        business_id=business_id,
        entry_id=entry_id,
        customer_id=customer_session_id,
        is_owner=is_owner,
        reason=reason
    )
    await ws_manager.notify_queue_state_changed(db, business_id)
    return {"message": "Token cancelled successfully.", "entry": entry}


@router.get(
    "/tokens/user/list",
    summary="List Customer Tokens (Active, Completed, Cancelled)"
)
async def list_user_tokens(
    mobile: Optional[str] = None,
    session_id: Optional[str] = None,
    filter_status: Optional[str] = Query(None, alias="status"),
    db: AsyncIOMotorDatabase = Depends(get_database),
    customer_session_id: Optional[str] = Depends(get_customer_session_id),
):
    """
    Returns tokens belonging to customer by mobile or device session ID.
    Supports filtering by WAITING, SERVING, COMPLETED, CANCELLED.
    """
    sid = session_id or customer_session_id
    query_clauses = []
    if mobile and mobile.strip():
        # Strip prefixes
        cleaned_mobile = mobile.replace("+91", "").replace(" ", "").strip()
        query_clauses.append({"customerMobile": cleaned_mobile})
    if sid:
        query_clauses.append({"customerId": sid})

    if not query_clauses:
        return []

    filter_query: dict = {"$or": query_clauses} if len(query_clauses) > 1 else query_clauses[0]

    if filter_status:
        filter_query["status"] = filter_status.upper()

    cursor = db.queue_entries.find(filter_query).sort("createdAt", -1).limit(50)
    tokens = []
    async for entry in cursor:
        biz_id = entry.get("businessId")
        biz = await db.businesses.find_one(to_id_query(biz_id)) if biz_id else None
        q_state = await db.queue_state.find_one({"businessId": biz_id}) if biz_id else None

        entry["_id"] = str(entry["_id"])
        entry["id"] = entry["_id"]
        entry["businessName"] = biz.get("name", "Unknown Business") if biz else "Unknown Business"
        entry["businessAddress"] = biz.get("address", "") if biz else ""
        entry["businessUpiId"] = (biz.get("upi_id") or biz.get("upiId")) if biz else None
        entry["currentToken"] = q_state.get("currentToken", 0) if q_state else 0

        # Calculate live people ahead if waiting
        if entry.get("status") == "WAITING":
            people_ahead = await db.queue_entries.count_documents({
                "businessId": biz_id,
                "status": "WAITING",
                "tokenNumber": {"$lt": entry.get("tokenNumber", 0)}
            })
            entry["peopleAhead"] = people_ahead
            entry["estimatedWaitMin"] = people_ahead * 10
        else:
            entry["peopleAhead"] = 0
            entry["estimatedWaitMin"] = 0

        tokens.append(entry)

    return tokens


@router.get(
    "/token/{entry_id}/live",
    summary="Get Token Live Status by Entry ID alone"
)
async def get_token_by_id_live(
    entry_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    entry = await db.queue_entries.find_one(to_id_query(entry_id))
    if not entry:
        from app.core.exceptions import TokenNotFoundException
        raise TokenNotFoundException(entry_id=entry_id)

    biz_id = entry.get("businessId")
    biz = await db.businesses.find_one(to_id_query(biz_id)) if biz_id else None
    q_state = await db.queue_state.find_one({"businessId": biz_id}) if biz_id else None

    entry["_id"] = str(entry["_id"])
    entry["id"] = entry["_id"]
    entry["businessName"] = biz.get("name", "Unknown Business") if biz else "Unknown Business"
    entry["businessAddress"] = biz.get("address", "") if biz else ""
    entry["businessUpiId"] = (biz.get("upi_id") or biz.get("upiId")) if biz else None
    entry["currentToken"] = q_state.get("currentToken", 0) if q_state else 0

    if entry.get("status") == "WAITING":
        people_ahead = await db.queue_entries.count_documents({
            "businessId": biz_id,
            "status": "WAITING",
            "tokenNumber": {"$lt": entry.get("tokenNumber", 0)}
        })
        entry["peopleAhead"] = people_ahead
        entry["estimatedWaitMin"] = people_ahead * 10
    else:
        entry["peopleAhead"] = 0
        entry["estimatedWaitMin"] = 0

    return entry


@router.post(
    "/{business_id}/queue/walk-in",
    response_model=JoinQueueResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generate Walk-in Token (For elderly/offline customers)"
)
async def generate_walk_in_token(
    business_id: str,
    payload: WalkInTokenRequest,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    join_payload = JoinQueueRequest(
        customerName=payload.customer_name,
        customerMobile=payload.customer_mobile or "9999999999",
        serviceId=payload.service_id,
        customerId="walk-in-terminal"
    )
    entry = await QueueEngine.join_queue(
        db=db,
        business_id=business_id,
        request=join_payload,
        customer_session_id="walk-in-terminal"
    )
    await ws_manager.notify_queue_state_changed(db, business_id)
    return entry


