from datetime import datetime, timezone
import math
from typing import List, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.models.common import BusinessStatus, QueueStatus

SEED_BUSINESSES = [
    {
        "id": "biz_apollo_clinic",
        "name": "Apollo Clinic Indiranagar",
        "category": "clinic",
        "address": "100 Feet Rd, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka 560038",
        "location": {"type": "Point", "coordinates": [77.6412, 12.9716]},
        "upi_id": "apolloclinic@icici",
        "status": BusinessStatus.OPEN.value,
        "queueStatus": QueueStatus.ACTIVE.value,
        "plan": "free",
        "verified": True,
        "opening_time": "08:00",
        "closing_time": "21:00",
        "services": [
            {"id": "srv_apollo_gen", "name": "General Physician Consultation", "price": 500.0, "estimated_duration": 15},
            {"id": "srv_apollo_ped", "name": "Pediatrician Specialist", "price": 700.0, "estimated_duration": 20},
            {"id": "srv_apollo_lab", "name": "Blood Test & Diagnostics", "price": 350.0, "estimated_duration": 10},
            {"id": "srv_apollo_vac", "name": "Vaccination Drive", "price": 250.0, "estimated_duration": 10},
        ],
    },
    {
        "id": "biz_sharma_salon",
        "name": "Sharma Ji Salon & Spa",
        "category": "salon",
        "address": "Shop #4, Metro Pillar 78, Indiranagar, Bengaluru, Karnataka 560038",
        "location": {"type": "Point", "coordinates": [77.6408, 12.9784]},
        "upi_id": "sharmasalon@okhdfcbank",
        "status": BusinessStatus.OPEN.value,
        "queueStatus": QueueStatus.ACTIVE.value,
        "plan": "free",
        "verified": True,
        "opening_time": "09:30",
        "closing_time": "21:30",
        "services": [
            {"id": "srv_sharma_hair", "name": "Classic Haircut & Styling", "price": 200.0, "estimated_duration": 25},
            {"id": "srv_sharma_shave", "name": "Beard Trim & Royal Shave", "price": 150.0, "estimated_duration": 15},
            {"id": "srv_sharma_spa", "name": "Hair Spa & Deep Conditioning", "price": 600.0, "estimated_duration": 45},
            {"id": "srv_sharma_facial", "name": "O3+ Brightening Facial", "price": 850.0, "estimated_duration": 50},
        ],
    },
    {
        "id": "biz_chai_point",
        "name": "Chai Point Koramangala",
        "category": "restaurant",
        "address": "5th Block, Jyoti Nivas College Rd, Koramangala, Bengaluru, Karnataka 560095",
        "location": {"type": "Point", "coordinates": [77.6245, 12.9352]},
        "upi_id": "chaipoint@paytm",
        "status": BusinessStatus.OPEN.value,
        "queueStatus": QueueStatus.ACTIVE.value,
        "plan": "free",
        "verified": True,
        "opening_time": "07:00",
        "closing_time": "23:00",
        "services": [
            {"id": "srv_chai_bun", "name": "Cutting Ginger Chai + Bun Maska", "price": 110.0, "estimated_duration": 5},
            {"id": "srv_chai_samosa", "name": "Filter Coffee + Hot Samosa (2 pcs)", "price": 130.0, "estimated_duration": 7},
            {"id": "srv_chai_flask", "name": "Masala Chai Flask (500ml) + Cookies", "price": 220.0, "estimated_duration": 10},
        ],
    },
    {
        "id": "biz_sbi_branch",
        "name": "SBI Branch HSR Layout",
        "category": "bank",
        "address": "27th Main Rd, Sector 1, HSR Layout, Bengaluru, Karnataka 560102",
        "location": {"type": "Point", "coordinates": [77.6446, 12.9121]},
        "upi_id": "sbihsr@sbi",
        "status": BusinessStatus.OPEN.value,
        "queueStatus": QueueStatus.ACTIVE.value,
        "plan": "free",
        "verified": True,
        "opening_time": "10:00",
        "closing_time": "16:00",
        "services": [
            {"id": "srv_sbi_cash", "name": "Cash Deposit / Withdrawal Counter", "price": 0.0, "estimated_duration": 8},
            {"id": "srv_sbi_kyc", "name": "KYC Update & Aadhaar Linking", "price": 0.0, "estimated_duration": 12},
            {"id": "srv_sbi_acct", "name": "New Account & Passbook Printing", "price": 0.0, "estimated_duration": 15},
            {"id": "srv_sbi_dd", "name": "Demand Draft (DD) / Cheque Clearing", "price": 0.0, "estimated_duration": 10},
        ],
    },
]


def calculate_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Haversine distance in kilometers between two lat/lon coordinates."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)


async def seed_demo_businesses(db: AsyncIOMotorDatabase) -> List[str]:
    """Seed the database with realistic Indian businesses and services."""
    now = datetime.now(timezone.utc)
    seeded_ids = []

    for biz_data in SEED_BUSINESSES:
        biz_id = biz_data["id"]
        services = biz_data.get("services", [])
        
        # Check if already exists
        existing = await db.businesses.find_one({"$or": [{"_id": biz_id}, {"id": biz_id}]})
        if not existing:
            doc = {
                "_id": biz_id,
                "id": biz_id,
                "name": biz_data["name"],
                "category": biz_data["category"],
                "address": biz_data["address"],
                "location": biz_data["location"],
                "upi_id": biz_data.get("upi_id"),
                "status": biz_data["status"],
                "queueStatus": biz_data["queueStatus"],
                "plan": biz_data["plan"],
                "verified": biz_data["verified"],
                "opening_time": biz_data.get("opening_time"),
                "closing_time": biz_data.get("closing_time"),
                "createdAt": now,
                "updatedAt": now,
            }
            await db.businesses.insert_one(doc)

            # Ensure queue state initialized
            q_state = await db.queue_state.find_one({"businessId": biz_id})
            if not q_state:
                await db.queue_state.insert_one({
                    "businessId": biz_id,
                    "currentToken": 0,
                    "lastToken": 0,
                    "waitingCount": 0,
                    "status": "ACTIVE",
                    "updatedAt": now,
                })

            # Insert services
            for s in services:
                s_doc = {
                    "_id": s["id"],
                    "id": s["id"],
                    "businessId": biz_id,
                    "name": s["name"],
                    "price": s["price"],
                    "estimated_duration": s["estimated_duration"],
                    "active": True,
                    "createdAt": now,
                    "updatedAt": now,
                }
                await db.services.replace_one({"_id": s["id"]}, s_doc, upsert=True)

            seeded_ids.append(biz_id)
        else:
            seeded_ids.append(str(existing.get("_id", biz_id)))

    return seeded_ids
