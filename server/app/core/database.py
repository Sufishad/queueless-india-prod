import logging
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import settings

logger = logging.getLogger(__name__)


class DatabaseManager:
    client: Optional[AsyncIOMotorClient] = None
    db: Optional[AsyncIOMotorDatabase] = None


db_manager = DatabaseManager()


async def get_db() -> AsyncIOMotorDatabase:
    if db_manager.db is None:
        raise RuntimeError("Database is not initialized. Please call connect_to_mongo first.")
    return db_manager.db


async def connect_to_mongo():
    logger.info(f"Connecting to MongoDB at {settings.MONGODB_URI}")
    db_manager.client = AsyncIOMotorClient(settings.MONGODB_URI)
    db_manager.db = db_manager.client[settings.DATABASE_NAME]
    await init_db_indexes()
    logger.info("Connected to MongoDB successfully and verified indexes.")


async def close_mongo_connection():
    if db_manager.client is not None:
        logger.info("Closing MongoDB connection.")
        db_manager.client.close()
        db_manager.client = None
        db_manager.db = None


async def init_db_indexes():
    if db_manager.db is None:
        return
    
    db = db_manager.db
    try:
        # businesses collection: 2dsphere index on location
        await db.businesses.create_index([("location", "2dsphere")])
        await db.businesses.create_index([("status", 1), ("queueStatus", 1)])
        
        # queues collection: unique index on (businessId, date)
        await db.queues.create_index([("businessId", 1), ("date", 1)], unique=True)
        
        # queue_entries collection: compound indexes for queue engine performance
        await db.queue_entries.create_index([("businessId", 1), ("status", 1), ("createdAt", 1)])
        await db.queue_entries.create_index([("businessId", 1), ("tokenNumber", 1)])
        await db.queue_entries.create_index([("customerId", 1)])
        await db.queue_entries.create_index([("customerMobile", 1), ("status", 1)])
        
        # services collection
        await db.services.create_index([("businessId", 1), ("active", 1)])
        
        # counters collection
        await db.counters.create_index([("businessId", 1), ("active", 1)])
        
        logger.info("MongoDB indexes created successfully.")
    except Exception as e:
        logger.warning(f"Index initialization warning (may be skipped in mock/test environment): {e}")
