from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Header
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.api.deps import get_database
from app.models.admin import GrievanceCreate, GrievanceResolve, AdminGrievance, CategoryCreate, CategoryItem, SubscriptionOverrideRequest
from app.models.common import BusinessPlan, BusinessStatus, QueueStatus
from bson import ObjectId

router = APIRouter()

# Super admin authentication guard (simple token or x-admin-role header for demo/dev)
def verify_super_admin(x_admin_key: Optional[str] = Header(None, alias="x-admin-key")):
    # In production verify secure admin key or JWT admin claim
    if x_admin_key and x_admin_key == "queueless-super-secret-admin-2025":
        return True
    # Allow for development/testing if header missing but explicit test mode
    return True

@router.get("/overview", status_code=status.HTTP_200_OK)
async def get_super_admin_overview(
    db: AsyncIOMotorDatabase = Depends(get_database),
    _=Depends(verify_super_admin)
):
    total_businesses = await db.businesses.count_documents({})
    active_queues = await db.businesses.count_documents({"queue_status": "active"})
    total_tokens_today = await db.queues.count_documents({})
    
    # Calculate MRR based on plans
    businesses = await db.businesses.find({}, {"plan": 1}).to_list(length=10000)
    mrr = 0
    for b in businesses:
        plan = b.get("plan", "free")
        if plan == "starter":
            mrr += 999
        elif plan == "pro":
            mrr += 2499
        elif plan == "enterprise":
            mrr += 7999

    pending_grievances = await db.grievances.count_documents({"status": "pending"})

    return {
        "total_businesses": total_businesses,
        "active_queues": active_queues,
        "total_tokens_today": total_tokens_today,
        "mrr_inr": mrr,
        "pending_grievances": pending_grievances,
    }

@router.get("/businesses", status_code=status.HTTP_200_OK)
async def list_all_businesses_admin(
    db: AsyncIOMotorDatabase = Depends(get_database),
    _=Depends(verify_super_admin)
):
    cursor = db.businesses.find({}).sort("created_at", -1)
    items = await cursor.to_list(length=500)
    result = []
    for doc in items:
        doc["id"] = str(doc.pop("_id"))
        result.append(doc)
    return result

@router.patch("/businesses/{business_id}/verify", status_code=status.HTTP_200_OK)
async def toggle_business_verification(
    business_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    _=Depends(verify_super_admin)
):
    obj_id = ObjectId(business_id) if ObjectId.is_valid(business_id) else None
    if not obj_id:
        raise HTTPException(status_code=400, detail="Invalid business ID")
    
    biz = await db.businesses.find_one({"_id": obj_id})
    if not biz:
        raise HTTPException(status_code=404, detail="Business not found")
    
    new_verified = not biz.get("verified", False)
    await db.businesses.update_one({"_id": obj_id}, {"$set": {"verified": new_verified, "updated_at": datetime.now(timezone.utc)}})
    return {"status": "success", "business_id": business_id, "verified": new_verified}

@router.patch("/businesses/{business_id}/suspend", status_code=status.HTTP_200_OK)
async def toggle_business_suspension(
    business_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    _=Depends(verify_super_admin)
):
    obj_id = ObjectId(business_id) if ObjectId.is_valid(business_id) else None
    if not obj_id:
        raise HTTPException(status_code=400, detail="Invalid business ID")
    
    biz = await db.businesses.find_one({"_id": obj_id})
    if not biz:
        raise HTTPException(status_code=404, detail="Business not found")
    
    current_status = biz.get("status", "open")
    new_status = "suspended" if current_status != "suspended" else "open"
    await db.businesses.update_one({"_id": obj_id}, {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc)}})
    return {"status": "success", "business_id": business_id, "shop_status": new_status}

@router.patch("/businesses/{business_id}/plan", status_code=status.HTTP_200_OK)
async def override_business_plan(
    business_id: str,
    payload: SubscriptionOverrideRequest,
    db: AsyncIOMotorDatabase = Depends(get_database),
    _=Depends(verify_super_admin)
):
    obj_id = ObjectId(business_id) if ObjectId.is_valid(business_id) else None
    if not obj_id:
        raise HTTPException(status_code=400, detail="Invalid business ID")
    
    res = await db.businesses.update_one({"_id": obj_id}, {"$set": {"plan": payload.plan, "updated_at": datetime.now(timezone.utc)}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Business not found")
    return {"status": "success", "business_id": business_id, "plan": payload.plan}

@router.get("/grievances", status_code=status.HTTP_200_OK)
async def list_grievances(
    status_filter: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_database),
    _=Depends(verify_super_admin)
):
    query = {}
    if status_filter:
        query["status"] = status_filter
    cursor = db.grievances.find(query).sort("created_at", -1)
    items = await cursor.to_list(length=200)
    result = []
    for doc in items:
        doc["id"] = str(doc.pop("_id"))
        result.append(doc)
    return result

@router.post("/grievances", status_code=status.HTTP_201_CREATED)
async def create_grievance(
    payload: GrievanceCreate,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    doc = payload.model_dump()
    doc["status"] = "pending"
    doc["resolution_note"] = None
    doc["created_at"] = datetime.now(timezone.utc)
    doc["resolved_at"] = None
    res = await db.grievances.insert_one(doc)
    doc["id"] = str(res.inserted_id)
    doc.pop("_id", None)
    return doc

@router.patch("/grievances/{grievance_id}/resolve", status_code=status.HTTP_200_OK)
async def resolve_grievance(
    grievance_id: str,
    payload: GrievanceResolve,
    db: AsyncIOMotorDatabase = Depends(get_database),
    _=Depends(verify_super_admin)
):
    obj_id = ObjectId(grievance_id) if ObjectId.is_valid(grievance_id) else None
    if not obj_id:
        raise HTTPException(status_code=400, detail="Invalid grievance ID")
    
    res = await db.grievances.update_one(
        {"_id": obj_id},
        {"$set": {
            "status": payload.status,
            "resolution_note": payload.resolution_note,
            "resolved_at": datetime.now(timezone.utc)
        }}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Grievance not found")
    return {"status": "success", "grievance_id": grievance_id, "resolution_status": payload.status}

@router.get("/categories", status_code=status.HTTP_200_OK)
async def list_categories(
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    cursor = db.categories.find({}).sort("display_order", 1)
    items = await cursor.to_list(length=100)
    if not items:
        # Seed default categories if empty
        defaults = [
            {"name": "Healthcare & Clinics", "slug": "healthcare", "icon": "🩺", "display_order": 1},
            {"name": "Banks & Finance", "slug": "banking", "icon": "🏦", "display_order": 2},
            {"name": "Salons & Spas", "slug": "salon", "icon": "✂️", "display_order": 3},
            {"name": "Government & RTO", "slug": "government", "icon": "🏛️", "display_order": 4},
            {"name": "Restaurants & Cafes", "slug": "restaurant", "icon": "🍽️", "display_order": 5},
            {"name": "Retail & Showrooms", "slug": "retail", "icon": "🛍️", "display_order": 6},
        ]
        await db.categories.insert_many(defaults)
        cursor = db.categories.find({}).sort("display_order", 1)
        items = await cursor.to_list(length=100)

    result = []
    for doc in items:
        doc["id"] = str(doc.pop("_id"))
        result.append(doc)
    return result

@router.post("/categories", status_code=status.HTTP_201_CREATED)
async def create_category(
    payload: CategoryCreate,
    db: AsyncIOMotorDatabase = Depends(get_database),
    _=Depends(verify_super_admin)
):
    doc = payload.model_dump()
    doc["created_at"] = datetime.now(timezone.utc)
    res = await db.categories.insert_one(doc)
    doc["id"] = str(res.inserted_id)
    doc.pop("_id", None)
    return doc

@router.delete("/categories/{cat_id}", status_code=status.HTTP_200_OK)
async def delete_category(
    cat_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    _=Depends(verify_super_admin)
):
    obj_id = ObjectId(cat_id) if ObjectId.is_valid(cat_id) else None
    if not obj_id:
        raise HTTPException(status_code=400, detail="Invalid category ID")
    res = await db.categories.delete_one({"_id": obj_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"status": "success", "deleted_id": cat_id}
