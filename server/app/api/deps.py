from typing import Optional
from fastapi import Header
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.database import get_db


async def get_database() -> AsyncIOMotorDatabase:
    return await get_db()


def get_customer_session_id(
    x_customer_id: Optional[str] = Header(None, alias="x-customer-id")
) -> Optional[str]:
    return x_customer_id


def get_owner_authorization(
    x_owner_role: Optional[str] = Header(None, alias="x-owner-role"),
    authorization: Optional[str] = Header(None)
) -> bool:
    # In Sprint 1, allow header-based or JWT token indicator for owner operations
    if x_owner_role == "owner":
        return True
    if authorization and "owner" in authorization.lower():
        return True
    return False
