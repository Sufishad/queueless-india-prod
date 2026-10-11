from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Header
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.api.deps import get_database
from app.core.security import get_password_hash, verify_password, create_access_token, decode_access_token
from app.models.owner import OwnerCreate, OwnerLogin, OwnerResponse, TokenResponse
from bson import ObjectId

router = APIRouter()

def serialize_owner(doc: dict) -> dict:
    return {
        "id": str(doc.get("_id", doc.get("id"))),
        "name": doc["name"],
        "mobile": doc["mobile"],
        "email": doc.get("email"),
        "business_ids": doc.get("business_ids", []),
        "active": doc.get("active", True),
        "created_at": doc.get("created_at", datetime.now(timezone.utc)),
    }

async def get_current_owner(
    authorization: Optional[str] = Header(None),
    db: AsyncIOMotorDatabase = Depends(get_database)
) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authentication token"
        )
    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token"
        )
    owner_id = payload["sub"]
    owner_doc = await db.owners.find_one({"_id": ObjectId(owner_id)}) if ObjectId.is_valid(owner_id) else None
    if not owner_doc:
        owner_doc = await db.owners.find_one({"id": owner_id})
    if not owner_doc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Owner not found"
        )
    return owner_doc

@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup_owner(
    payload: OwnerCreate,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    existing = await db.owners.find_one({"mobile": payload.mobile})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mobile number already registered as merchant. Please log in."
        )

    owner_dict = {
        "name": payload.name,
        "mobile": payload.mobile,
        "email": payload.email,
        "hashed_password": get_password_hash(payload.password),
        "business_ids": [],
        "active": True,
        "created_at": datetime.now(timezone.utc),
    }

    result = await db.owners.insert_one(owner_dict)
    owner_id = str(result.inserted_id)
    owner_dict["_id"] = result.inserted_id

    token = create_access_token({"sub": owner_id, "mobile": payload.mobile, "role": "owner"})
    owner_data = serialize_owner(owner_dict)

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        owner=OwnerResponse(**owner_data),
        business_id=None,
    )

@router.post("/login", response_model=TokenResponse)
async def login_owner(
    payload: OwnerLogin,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    owner_doc = await db.owners.find_one({"mobile": payload.mobile})
    if not owner_doc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid mobile number or password"
        )

    if not verify_password(payload.password, owner_doc["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid mobile number or password"
        )

    owner_id = str(owner_doc["_id"])
    biz_ids = owner_doc.get("business_ids", [])
    primary_biz_id = biz_ids[0] if biz_ids else None

    token = create_access_token({"sub": owner_id, "mobile": payload.mobile, "role": "owner"})
    owner_data = serialize_owner(owner_doc)

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        owner=OwnerResponse(**owner_data),
        business_id=primary_biz_id,
    )

@router.get("/me", response_model=OwnerResponse)
async def get_me(current_owner: dict = Depends(get_current_owner)):
    return OwnerResponse(**serialize_owner(current_owner))
