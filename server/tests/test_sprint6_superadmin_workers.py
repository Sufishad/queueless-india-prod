import pytest
from httpx import AsyncClient
from app.workers.cron_worker import run_daily_reset_cron
from app.workers.whatsapp_worker import (
    send_whatsapp_template_message,
    notify_customer_turn_near,
    notify_token_called,
)

@pytest.mark.asyncio
async def test_super_admin_portal_flow(async_client: AsyncClient, mock_db):
    # 1. Signup an owner & business
    owner_payload = {
        "name": "Super Admin Test Owner",
        "mobile": "9876500001",
        "email": "testowner@queueless.in",
        "password": "Password123!",
    }
    signup_res = await async_client.post("/api/v1/auth/signup", json=owner_payload)
    assert signup_res.status_code == 201
    owner_token = signup_res.json()["access_token"]

    onboard_payload = {
        "shop_name": "Sanjeevani Clinic",
        "category": "Healthcare",
        "address": "MG Road, Pune, Maharashtra",
        "services": [{"name": "Doctor Consultation", "price": 400.0, "estimated_duration": 15}],
    }
    onboard_res = await async_client.post(
        "/api/v1/owner/business/onboard",
        json=onboard_payload,
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert onboard_res.status_code == 201
    business_id = onboard_res.json()["business_id"]

    # 2. Test Super Admin Overview
    headers = {"x-admin-key": "queueless-super-secret-admin-2025"}
    overview_res = await async_client.get("/api/v1/admin/overview", headers=headers)
    assert overview_res.status_code == 200
    overview_data = overview_res.json()
    assert "total_businesses" in overview_data
    assert "active_queues" in overview_data
    assert "mrr_inr" in overview_data

    # 3. Test Business Listing
    list_res = await async_client.get("/api/v1/admin/businesses", headers=headers)
    assert list_res.status_code == 200
    businesses = list_res.json()
    assert len(businesses) >= 1
    found_biz = next((b for b in businesses if b["id"] == business_id), None)
    assert found_biz is not None

    # 4. Toggle Verification (Blue Tick)
    verify_res = await async_client.patch(f"/api/v1/admin/businesses/{business_id}/verify", headers=headers)
    assert verify_res.status_code == 200
    assert verify_res.json()["verified"] is False

    # Toggle back on
    verify_res2 = await async_client.patch(f"/api/v1/admin/businesses/{business_id}/verify", headers=headers)
    assert verify_res2.status_code == 200
    assert verify_res2.json()["verified"] is True

    # 5. Toggle Suspension
    suspend_res = await async_client.patch(f"/api/v1/admin/businesses/{business_id}/suspend", headers=headers)
    assert suspend_res.status_code == 200
    assert suspend_res.json()["shop_status"] == "suspended"

    # Unsuspend
    unsuspend_res = await async_client.patch(f"/api/v1/admin/businesses/{business_id}/suspend", headers=headers)
    assert unsuspend_res.status_code == 200
    assert unsuspend_res.json()["shop_status"] == "open"

    # 6. Override Subscription Plan
    plan_res = await async_client.patch(
        f"/api/v1/admin/businesses/{business_id}/plan",
        json={"plan": "pro"},
        headers=headers,
    )
    assert plan_res.status_code == 200
    assert plan_res.json()["plan"] == "pro"

    # 7. Categories CRUD
    cat_create = await async_client.post(
        "/api/v1/admin/categories",
        json={"name": "Ayurveda Wellness", "slug": "ayurveda", "icon": "🌿"},
        headers=headers,
    )
    assert cat_create.status_code == 201
    cat_id = cat_create.json()["id"]

    cat_list = await async_client.get("/api/v1/admin/categories")
    assert cat_list.status_code == 200
    assert any(c["id"] == cat_id for c in cat_list.json())

    cat_del = await async_client.delete(f"/api/v1/admin/categories/{cat_id}", headers=headers)
    assert cat_del.status_code == 200

    # 8. Complaints & Grievance Flow
    complaint_res = await async_client.post(
        "/api/v1/admin/grievances",
        json={
            "customer_mobile": "9876543210",
            "customer_name": "Ramesh Gupta",
            "business_id": business_id,
            "business_name": "Sanjeevani Clinic",
            "issue_type": "long_wait",
            "description": "Counter was running 45 minutes late without prior SMS update.",
        },
    )
    assert complaint_res.status_code == 201
    grievance_id = complaint_res.json()["id"]

    # Admin lists grievances
    g_list = await async_client.get("/api/v1/admin/grievances", headers=headers)
    assert g_list.status_code == 200
    assert any(g["id"] == grievance_id for g in g_list.json())

    # Admin resolves grievance
    resolve_res = await async_client.patch(
        f"/api/v1/admin/grievances/{grievance_id}/resolve",
        json={"status": "resolved", "resolution_note": "Merchant issued priority fast-track voucher."},
        headers=headers,
    )
    assert resolve_res.status_code == 200
    assert resolve_res.json()["resolution_status"] == "resolved"

@pytest.mark.asyncio
async def test_workers_and_compliance(async_client: AsyncClient, mock_db, setup_test_business):
    biz_id = setup_test_business["business_id"]
    srv_id = setup_test_business["service_id"]

    # 1. Customer joins queue
    join_res = await async_client.post(
        f"/api/v1/businesses/{biz_id}/queue/join",
        json={
            "customerName": "Vikas Kumar",
            "customerMobile": "9822334455",
            "serviceId": srv_id,
        },
    )
    assert join_res.status_code == 201
    queue_item_id = join_res.json()["entryId"]

    # 2. WhatsApp dispatch worker tests
    wa_ok = await send_whatsapp_template_message(
        to_mobile="9822334455",
        template_name="queueless_turn_near",
        parameters=["1", "Test Business"],
    )
    assert wa_ok is True

    turn_near_res = await notify_customer_turn_near(mock_db, queue_item_id)
    assert turn_near_res is True

    called_res = await notify_token_called(mock_db, queue_item_id, "Counter 1")
    assert called_res is True

    # 3. Daily reset cron test
    await run_daily_reset_cron(mock_db)
    # Check that item is expired
    from bson import ObjectId
    updated_item = await mock_db.queue_entries.find_one({
        "$or": [{"_id": ObjectId(queue_item_id)}, {"_id": queue_item_id}, {"id": queue_item_id}]
    })
    assert updated_item is not None
    assert updated_item["status"] == "expired"

    # 4. Customer Data Purge (Google Play Compliance)
    purge_res = await async_client.post(
        "/api/v1/auth/customer/purge-data",
        params={"mobile": "9822334455"},
    )
    assert purge_res.status_code == 200
    assert purge_res.json()["status"] == "purged"

    # Verify no records remain for this customer
    remaining = await mock_db.queue_entries.find_one({"customerMobile": "9822334455"})
    assert remaining is None

