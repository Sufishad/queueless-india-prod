import asyncio
import logging
from datetime import datetime, timezone

logger = logging.getLogger("uvicorn.error")

async def run_daily_reset_cron(db):
    """
    Daily Auto-Reset Cron:
    Marks all 'waiting' or 'serving' tokens as 'expired' or 'completed' at end of day,
    resets business current token state back to 0, and resets counter current tokens.
    """
    logger.info("[Daily Reset Cron] Starting nightly queue reset job...")
    
    # 1. Update active queue items to expired across both queues and queue_entries collections
    res1 = await db.queues.update_many(
        {"status": {"$in": ["waiting", "serving"]}},
        {"$set": {"status": "expired", "updated_at": datetime.now(timezone.utc)}}
    )
    res2 = await db.queue_entries.update_many(
        {"status": {"$in": ["waiting", "serving"]}},
        {"$set": {"status": "expired", "updatedAt": datetime.now(timezone.utc), "updated_at": datetime.now(timezone.utc)}}
    )
    logger.info(f"[Daily Reset Cron] Expired {res1.modified_count + res2.modified_count} unfinished queue entries.")

    # 2. Reset business current token and queue state counters
    await db.businesses.update_many(
        {},
        {"$set": {"current_token": 0, "queue_status": "active"}}
    )
    
    # 3. Reset counters
    await db.counters.update_many(
        {},
        {"$set": {"current_token": 0, "is_active": True}}
    )

    logger.info("[Daily Reset Cron] Nightly reset completed successfully.")

async def start_cron_scheduler(db):
    """
    Background loop that checks time or runs periodically (or via APScheduler / Celery).
    For standalone asyncio runtime, we expose a trigger function.
    """
    pass
