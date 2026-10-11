from datetime import datetime, timezone
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId

from app.api.deps import get_database
from app.api.v1.endpoints.auth import get_current_owner
from app.models.counter import CounterCreate, CounterUpdate, CounterResponse
from app.core.websocket_manager import ws_manager

router = APIRouter()

def to_id_query(val: str):
    if ObjectId.is_valid(val):
        return ObjectId(val)
    return val

@router.get("/business/{business_id}/counters", response_model=List[CounterResponse])
async def list_counters(
    business_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """List all counters for a business."""
    cursor = db.counters.find({
        "$or": [{"business_id": business_id}, {"businessId": business_id}]
    }).sort("created_at", 1)

    counters = []
    async for c in cursor:
        cnt_id = str(c.get("id") or c.get("_id"))
        counters.append(
            CounterResponse(
                id=cnt_id,
                business_id=c.get("business_id") or c.get("businessId") or business_id,
                name=c.get("name", "Counter"),
                operator_name=c.get("operator_name") or c.get("operatorName"),
                is_active=c.get("is_active", True),
                current_token=c.get("current_token") or c.get("currentToken"),
                created_at=c.get("created_at") or datetime.now(timezone.utc)
            )
        )

    # If no counters exist yet, automatically seed a default Counter 1
    if not counters:
        now = datetime.now(timezone.utc)
        default_id = f"cnt_{uuid.uuid4().hex[:8]}"
        default_counter = {
            "id": default_id,
            "business_id": business_id,
            "businessId": business_id,
            "name": "Counter 1",
            "operator_name": "Main Operator",
            "is_active": True,
            "current_token": None,
            "created_at": now
        }
        await db.counters.insert_one(default_counter)
        counters.append(
            CounterResponse(
                id=default_id,
                business_id=business_id,
                name="Counter 1",
                operator_name="Main Operator",
                is_active=True,
                current_token=None,
                created_at=now
            )
        )

    return counters

@router.post("/business/{business_id}/counters", response_model=CounterResponse, status_code=status.HTTP_201_CREATED)
async def create_counter(
    business_id: str,
    payload: CounterCreate,
    current_owner: dict = Depends(get_current_owner),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """Create a new counter for the business."""
    now = datetime.now(timezone.utc)
    cnt_id = f"cnt_{uuid.uuid4().hex[:8]}"

    counter_doc = {
        "id": cnt_id,
        "business_id": business_id,
        "businessId": business_id,
        "name": payload.name,
        "operator_name": payload.operator_name,
        "is_active": payload.is_active,
        "current_token": None,
        "created_at": now
    }

    await db.counters.insert_one(counter_doc)
    return CounterResponse(
        id=cnt_id,
        business_id=business_id,
        name=payload.name,
        operator_name=payload.operator_name,
        is_active=payload.is_active,
        current_token=None,
        created_at=now
    )

@router.patch("/business/{business_id}/counters/{counter_id}", response_model=CounterResponse)
async def update_counter(
    business_id: str,
    counter_id: str,
    payload: CounterUpdate,
    current_owner: dict = Depends(get_current_owner),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """Update counter information."""
    match_query = {
        "$and": [
            {"$or": [{"business_id": business_id}, {"businessId": business_id}]},
            {"$or": [{"id": counter_id}, {"_id": to_id_query(counter_id)}]}
        ]
    }

    counter = await db.counters.find_one(match_query)
    if not counter:
        raise HTTPException(status_code=404, detail="Counter not found")

    update_fields = {}
    if payload.name is not None:
        update_fields["name"] = payload.name
    if payload.operator_name is not None:
        update_fields["operator_name"] = payload.operator_name
    if payload.is_active is not None:
        update_fields["is_active"] = payload.is_active

    if update_fields:
        await db.counters.update_one(match_query, {"$set": update_fields})
        counter.update(update_fields)

    return CounterResponse(
        id=str(counter.get("id") or counter.get("_id")),
        business_id=business_id,
        name=counter.get("name"),
        operator_name=counter.get("operator_name"),
        is_active=counter.get("is_active", True),
        current_token=counter.get("current_token"),
        created_at=counter.get("created_at") or datetime.now(timezone.utc)
    )

@router.delete("/business/{business_id}/counters/{counter_id}")
async def delete_counter(
    business_id: str,
    counter_id: str,
    current_owner: dict = Depends(get_current_owner),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """Delete a counter."""
    match_query = {
        "$and": [
            {"$or": [{"business_id": business_id}, {"businessId": business_id}]},
            {"$or": [{"id": counter_id}, {"_id": to_id_query(counter_id)}]}
        ]
    }

    result = await db.counters.delete_one(match_query)
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Counter not found")

    return {"message": "Counter deleted successfully", "counter_id": counter_id}

@router.post("/business/{business_id}/counters/{counter_id}/call-next")
async def counter_call_next(
    business_id: str,
    counter_id: str,
    current_owner: dict = Depends(get_current_owner),
    db: AsyncIOMotorDatabase = Depends(get_database),
):
    """
    Counter-specific Call Next:
    1. Completes any token currently being served on this counter.
    2. Finds next waiting token in queue.
    3. Assigns token to this counter, updates queue state, and broadcasts WebSocket TOKEN_CALLED event!
    """
    now = datetime.now(timezone.utc)
    counter_match = {
        "$and": [
            {"$or": [{"business_id": business_id}, {"businessId": business_id}]},
            {"$or": [{"id": counter_id}, {"_id": to_id_query(counter_id)}]}
        ]
    }

    counter = await db.counters.find_one(counter_match)
    if not counter:
        raise HTTPException(status_code=404, detail="Counter not found")

    counter_name = counter.get("name", f"Counter {counter_id}")

    # 1. Complete previous token served on this counter
    if counter.get("current_token"):
        prev_tok = counter["current_token"]
        await db.queue_entries.update_many(
            {
                "$or": [{"business_id": business_id}, {"businessId": business_id}],
                "$or": [{"token_number": prev_tok}, {"tokenNumber": prev_tok}],
                "status": "serving"
            },
            {
                "$set": {
                    "status": "completed",
                    "completed_at": now,
                    "completedAt": now,
                    "updated_at": now
                }
            }
        )

    # 2. Find next waiting token
    biz_match = {"$or": [{"business_id": business_id}, {"businessId": business_id}]}
    next_entry = await db.queue_entries.find_one(
        {
            "$and": [
                biz_match,
                {"status": "waiting"}
            ]
        },
        sort=[("token_number", 1), ("tokenNumber", 1)]
    )

    if not next_entry:
        # Reset counter current token if no one waiting
        await db.counters.update_one(counter_match, {"$set": {"current_token": None}})
        return {
            "message": "No customers waiting in queue",
            "counter_id": counter_id,
            "counter_name": counter_name,
            "called_token": None
        }

    tok_num = next_entry.get("token_number") or next_entry.get("tokenNumber")
    cust_name = next_entry.get("customer_name") or next_entry.get("customerName", "Customer")
    entry_id = str(next_entry.get("_id") or next_entry.get("id"))

    # 3. Update entry to serving with counter details
    await db.queue_entries.update_one(
        {"_id": next_entry["_id"]},
        {
            "$set": {
                "status": "serving",
                "counter_id": counter_id,
                "counter_name": counter_name,
                "served_at": now,
                "servedAt": now,
                "updated_at": now
            }
        }
    )

    # 4. Update counter document
    await db.counters.update_one(counter_match, {"$set": {"current_token": tok_num}})

    # 5. Update queue state
    await db.queue_states.update_many(
        biz_match,
        {"$set": {"currentToken": tok_num, "current_token": tok_num, "updated_at": now}}
    )

    # 6. WebSocket Notifications: State Changed + TOKEN_CALLED broadcast
    await ws_manager.notify_queue_state_changed(db, business_id)

    announcement_en = f"Token #{tok_num}, please proceed to {counter_name}"
    announcement_hi = f"टोकन नंबर {tok_num}, कृपया {counter_name} पर आएं"

    call_payload = {
        "tokenNumber": tok_num,
        "customerName": cust_name,
        "counterId": counter_id,
        "counterName": counter_name,
        "announcement": announcement_en,
        "announcement_hi": announcement_hi
    }

    await ws_manager.broadcast_to_business(
        business_id=business_id,
        event="TOKEN_CALLED",
        data=call_payload
    )

    # Also emit targeted event to that customer's token
    await ws_manager.send_to_token(
        business_id=business_id,
        token_number=tok_num,
        event="TOKEN_CALLED",
        data=call_payload
    )

    return {
        "message": f"Called Token #{tok_num} to {counter_name}",
        "counter_id": counter_id,
        "counter_name": counter_name,
        "called_token": tok_num,
        "customer_name": cust_name,
        "announcement": announcement_en,
        "announcement_hi": announcement_hi
    }
