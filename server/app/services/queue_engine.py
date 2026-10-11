import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from zoneinfo import ZoneInfo
from bson import ObjectId
from pymongo import ReturnDocument

from app.core.config import settings
from app.core.exceptions import (
    BusinessNotFoundException,
    QueueClosedException,
    QueuePausedException,
    TokenNotFoundException,
    UnauthorizedCancellationException,
)
from app.models.common import BusinessStatus, QueueEntryStatus, QueueStatus
from app.schemas.queue import JoinQueueRequest

logger = logging.getLogger(__name__)


def to_id_query(val: Any) -> Dict[str, Any]:
    """Helper to query MongoDB document by either ObjectId or str representation."""
    if isinstance(val, ObjectId):
        return {"_id": val}
    val_str = str(val)
    if ObjectId.is_valid(val_str):
        return {"_id": {"$in": [ObjectId(val_str), val_str]}}
    return {"_id": val_str}


def get_today_str() -> str:
    """Returns today's date in business timezone (Asia/Kolkata by default)."""
    try:
        tz = ZoneInfo(settings.TIMEZONE)
        return datetime.now(tz).strftime("%Y-%m-%d")
    except Exception:
        return datetime.now(timezone.utc).strftime("%Y-%m-%d")


class QueueEngine:
    @staticmethod
    async def get_or_create_daily_queue(db, business_id: str, queue_date: Optional[str] = None) -> Dict[str, Any]:
        """
        Ensures a Queue document exists for the given business and date.
        """
        date_str = queue_date or get_today_str()
        now = datetime.now(timezone.utc)
        
        queue = await db.queues.find_one_and_update(
            {"businessId": business_id, "date": date_str},
            {
                "$setOnInsert": {
                    "businessId": business_id,
                    "currentToken": 0,
                    "lastToken": 0,
                    "date": date_str,
                    "status": QueueStatus.ACTIVE.value,
                    "createdAt": now,
                },
                "$set": {
                    "updatedAt": now
                }
            },
            upsert=True,
            return_document=ReturnDocument.AFTER
        )
        return queue

    @staticmethod
    async def join_queue(
        db,
        business_id: str,
        request: JoinQueueRequest,
        customer_session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Zero-friction (NO OTP) token booking with Atomic Token Increment ($inc)
        and Frozen Service Price Snapshot.
        """
        # 1. Verify business existence and operational status
        business = await db.businesses.find_one(to_id_query(business_id))
        if not business:
            # Fallback check if businessId stored directly as string field
            business = await db.businesses.find_one({"businessId": business_id})
        
        if not business:
            raise BusinessNotFoundException(business_id=business_id)

        if business.get("status") == BusinessStatus.CLOSED.value:
            raise QueueClosedException()

        if business.get("queueStatus") == QueueStatus.PAUSED.value or business.get("queue_status") == QueueStatus.PAUSED.value:
            raise QueuePausedException()

        # 2. Service price snapshot freeze
        service_name = "General Queue"
        service_price = 0.0
        service_duration = 15  # default 15 minutes per customer

        if request.service_id:
            service = await db.services.find_one(to_id_query(request.service_id))
            if not service:
                service = await db.services.find_one({"serviceId": request.service_id})
            if service and service.get("active", True):
                service_name = service.get("name", service_name)
                service_price = float(service.get("price", 0.0))
                service_duration = int(service.get("estimatedDuration", service.get("estimated_duration", 15)))

        # 3. ATOMIC TOKEN INCREMENT - GUARANTEES ZERO RACE CONDITIONS
        date_str = get_today_str()
        now = datetime.now(timezone.utc)

        updated_queue = await db.queues.find_one_and_update(
            {"businessId": business_id, "date": date_str},
            {
                "$inc": {"lastToken": 1},
                "$setOnInsert": {
                    "currentToken": 0,
                    "status": QueueStatus.ACTIVE.value,
                    "createdAt": now,
                },
                "$set": {
                    "updatedAt": now
                }
            },
            upsert=True,
            return_document=ReturnDocument.AFTER
        )
        
        assigned_token_number: int = updated_queue["lastToken"]

        # 4. Calculate people ahead
        people_ahead = await db.queue_entries.count_documents({
            "businessId": business_id,
            "status": QueueEntryStatus.WAITING.value
        })
        estimated_wait_min = people_ahead * service_duration

        # 5. Insert Queue Entry with Frozen Snapshot
        effective_customer_id = customer_session_id or request.customer_id
        entry_doc = {
            "businessId": business_id,
            "customerId": effective_customer_id,
            "customerName": request.customer_name.strip(),
            "customerMobile": request.customer_mobile.strip(),
            "serviceId": request.service_id,
            "serviceName": service_name,
            "servicePrice": service_price,  # FROZEN SNAPSHOT: unaffected by future merchant rate changes
            "counterId": None,
            "tokenNumber": assigned_token_number,
            "status": QueueEntryStatus.WAITING.value,
            "paymentStatus": "unpaid",
            "estimatedWaitMin": estimated_wait_min,
            "createdAt": now,
            "updatedAt": now,
        }

        insert_result = await db.queue_entries.insert_one(entry_doc)
        entry_id = str(insert_result.inserted_id)
        entry_doc["_id"] = entry_id
        entry_doc["id"] = entry_id
        entry_doc["peopleAhead"] = people_ahead

        logger.info(
            f"Issued Token #{assigned_token_number} for Business {business_id}. "
            f"Customer: {request.customer_name}, Entry ID: {entry_id}, Ahead: {people_ahead}"
        )

        return {
            "entryId": entry_id,
            "businessId": business_id,
            "tokenNumber": assigned_token_number,
            "customerName": request.customer_name,
            "customerMobile": request.customer_mobile,
            "serviceName": service_name,
            "servicePrice": service_price,
            "peopleAhead": people_ahead,
            "estimatedWaitMin": estimated_wait_min,
            "status": QueueEntryStatus.WAITING.value,
            "createdAt": now.isoformat(),
        }

    @staticmethod
    async def call_next(
        db,
        business_id: str,
        counter_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Pulls the next waiting customer and marks status as 'serving'.
        Atomically updates currentToken on the business queue.
        """
        now = datetime.now(timezone.utc)

        # 1. Atomically transition next waiting token to 'serving'
        update_fields: Dict[str, Any] = {
            "status": QueueEntryStatus.SERVING.value,
            "updatedAt": now,
            "servingStartedAt": now
        }
        if counter_id:
            update_fields["counterId"] = counter_id

        next_entry = await db.queue_entries.find_one_and_update(
            {"businessId": business_id, "status": QueueEntryStatus.WAITING.value},
            {"$set": update_fields},
            sort=[("tokenNumber", 1)],
            return_document=ReturnDocument.AFTER
        )

        if not next_entry:
            return None

        # 2. Update queue's currentToken
        date_str = get_today_str()
        await db.queues.update_one(
            {"businessId": business_id, "date": date_str},
            {"$set": {"currentToken": next_entry["tokenNumber"], "updatedAt": now}},
            upsert=True
        )

        # 3. Update counter's currentToken if counter_id provided
        if counter_id:
            await db.counters.update_one(
                to_id_query(counter_id),
                {"$set": {"currentToken": next_entry["tokenNumber"], "updatedAt": now}}
            )

        next_entry["_id"] = str(next_entry["_id"])
        next_entry["id"] = next_entry["_id"]
        return next_entry

    @staticmethod
    async def complete_token(
        db,
        business_id: str,
        entry_id: str,
        counter_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Marks currently serving or waiting token as completed."""
        now = datetime.now(timezone.utc)
        query = {"businessId": business_id, **to_id_query(entry_id)}
        
        updated = await db.queue_entries.find_one_and_update(
            query,
            {
                "$set": {
                    "status": QueueEntryStatus.COMPLETED.value,
                    "completedAt": now,
                    "updatedAt": now
                }
            },
            return_document=ReturnDocument.AFTER
        )
        if not updated:
            raise TokenNotFoundException(entry_id=entry_id)

        updated["_id"] = str(updated["_id"])
        updated["id"] = updated["_id"]
        return updated

    @staticmethod
    async def skip_token(
        db,
        business_id: str,
        entry_id: str,
        reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """Marks customer token as skipped (e.g. no-show)."""
        now = datetime.now(timezone.utc)
        query = {"businessId": business_id, **to_id_query(entry_id)}

        updated = await db.queue_entries.find_one_and_update(
            query,
            {
                "$set": {
                    "status": QueueEntryStatus.SKIPPED.value,
                    "skipReason": reason or "No-show at counter",
                    "skippedAt": now,
                    "updatedAt": now
                }
            },
            return_document=ReturnDocument.AFTER
        )
        if not updated:
            raise TokenNotFoundException(entry_id=entry_id)

        updated["_id"] = str(updated["_id"])
        updated["id"] = updated["_id"]
        return updated

    @staticmethod
    async def cancel_token(
        db,
        business_id: str,
        entry_id: str,
        customer_id: Optional[str] = None,
        is_owner: bool = False,
        reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Dual-Role Secure Cancellation (100% OTP-Free):
        - Customer: Verified via device session matching `entry.customerId`.
        - Owner: Verified via role/JWT flag.
        """
        entry = await db.queue_entries.find_one({"businessId": business_id, **to_id_query(entry_id)})
        if not entry:
            raise TokenNotFoundException(entry_id=entry_id)

        # Security check: if not owner, ensure customer session matches
        if not is_owner:
            if not customer_id or str(entry.get("customerId")) != str(customer_id):
                raise UnauthorizedCancellationException()

        now = datetime.now(timezone.utc)
        updated = await db.queue_entries.find_one_and_update(
            {"businessId": business_id, **to_id_query(entry_id)},
            {
                "$set": {
                    "status": QueueEntryStatus.CANCELLED.value,
                    "cancelReason": reason or ("Cancelled by customer" if not is_owner else "Cancelled by owner"),
                    "cancelledAt": now,
                    "updatedAt": now
                }
            },
            return_document=ReturnDocument.AFTER
        )
        updated["_id"] = str(updated["_id"])
        updated["id"] = updated["_id"]
        return updated

    @staticmethod
    async def get_live_queue_state(db, business_id: str) -> Dict[str, Any]:
        """Returns the real-time queue snapshot (nowServing, waitingCount, currentToken, lastToken)."""
        date_str = get_today_str()
        queue = await db.queues.find_one({"businessId": business_id, "date": date_str})
        
        current_token = queue.get("currentToken", 0) if queue else 0
        last_token = queue.get("lastToken", 0) if queue else 0
        queue_status = queue.get("status", QueueStatus.ACTIVE.value) if queue else QueueStatus.ACTIVE.value

        waiting_count = await db.queue_entries.count_documents({
            "businessId": business_id,
            "status": QueueEntryStatus.WAITING.value
        })

        now_serving = await db.queue_entries.find_one(
            {"businessId": business_id, "status": QueueEntryStatus.SERVING.value},
            sort=[("updatedAt", -1)]
        )
        if now_serving:
            now_serving["_id"] = str(now_serving["_id"])
            now_serving["id"] = now_serving["_id"]

        return {
            "businessId": business_id,
            "currentToken": current_token,
            "lastToken": last_token,
            "waitingCount": waiting_count,
            "status": queue_status,
            "nowServing": now_serving
        }

    @staticmethod
    async def get_customer_token_status(
        db,
        business_id: str,
        entry_id: str
    ) -> Dict[str, Any]:
        """Returns customer-facing live tracking data with exact people ahead and estimated wait."""
        entry = await db.queue_entries.find_one({"businessId": business_id, **to_id_query(entry_id)})
        if not entry:
            raise TokenNotFoundException(entry_id=entry_id)

        entry["_id"] = str(entry["_id"])
        entry["id"] = entry["_id"]

        # If waiting, compute dynamic position ahead
        if entry["status"] == QueueEntryStatus.WAITING.value:
            people_ahead = await db.queue_entries.count_documents({
                "businessId": business_id,
                "status": QueueEntryStatus.WAITING.value,
                "tokenNumber": {"$lt": entry["tokenNumber"]}
            })
            entry["peopleAhead"] = people_ahead
            # 15 mins per customer default
            entry["estimatedWaitMin"] = people_ahead * 15
        else:
            entry["peopleAhead"] = 0
            entry["estimatedWaitMin"] = 0

        return entry
