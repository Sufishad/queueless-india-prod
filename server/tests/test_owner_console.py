import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_owner_signup_and_login(async_client: AsyncClient):
    # 1. Sign up new merchant
    signup_data = {
        "name": "Vikram Patel",
        "mobile": "9876543210",
        "email": "vikram@example.com",
        "password": "SecretPassword123"
    }
    signup_res = await async_client.post("/api/v1/auth/signup", json=signup_data)
    assert signup_res.status_code == 201
    signup_body = signup_res.json()
    assert "access_token" in signup_body
    assert signup_body["owner"]["name"] == "Vikram Patel"
    token = signup_body["access_token"]

    # 2. Get Me
    me_res = await async_client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["mobile"] == "9876543210"

    # 3. Log in
    login_res = await async_client.post("/api/v1/auth/login", json={
        "mobile": "9876543210",
        "password": "SecretPassword123"
    })
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()

@pytest.mark.asyncio
async def test_owner_onboarding_wizard(async_client: AsyncClient):
    # Sign up
    signup_res = await async_client.post("/api/v1/auth/signup", json={
        "name": "Dr. Ananya Roy",
        "mobile": "9123456789",
        "password": "DocPassword123"
    })
    token = signup_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Onboard Business in 2-minute wizard
    onboard_data = {
        "shop_name": "Roy Dental Care",
        "category": "clinic",
        "address": "12, 100 Feet Road, Indiranagar",
        "city": "Bengaluru",
        "pincode": "560038",
        "latitude": 12.9716,
        "longitude": 77.6412,
        "upi_id": "roydental@okaxis",
        "opening_time": "10:00",
        "closing_time": "20:00",
        "services": [
            {"name": "Teeth Cleaning", "price": 800.0, "estimated_duration": 30},
            {"name": "Consultation", "price": 300.0, "estimated_duration": 15}
        ]
    }
    res = await async_client.post("/api/v1/owner/business/onboard", json=onboard_data, headers=headers)
    assert res.status_code == 201
    data = res.json()
    assert "business_id" in data
    assert data["name"] == "Roy Dental Care"
    assert len(data["services"]) == 2
    biz_id = data["business_id"]

    # Check dashboard for new business
    dash_res = await async_client.get(f"/api/v1/owner/business/{biz_id}/dashboard", headers=headers)
    assert dash_res.status_code == 200
    dash_data = dash_res.json()
    assert dash_data["businessName"] == "Roy Dental Care"
    assert dash_data["waitingCount"] == 0
    assert dash_data["nowServing"] is None

@pytest.mark.asyncio
async def test_owner_queue_management_and_payment_toggle(async_client: AsyncClient):
    # Setup owner and business
    signup_res = await async_client.post("/api/v1/auth/signup", json={
        "name": "Ramesh Kumar",
        "mobile": "9988776655",
        "password": "RameshPassword123"
    })
    token = signup_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    onboard_res = await async_client.post("/api/v1/owner/business/onboard", json={
        "shop_name": "Ramesh Kirana & General Store",
        "category": "retail",
        "address": "Shop 4, Market Road",
        "city": "Bengaluru",
        "pincode": "560001",
        "services": [{"name": "Grocery Express", "price": 150.0, "estimated_duration": 10}]
    }, headers=headers)
    biz_id = onboard_res.json()["business_id"]
    srv_id = onboard_res.json()["services"][0]["id"]

    # Customer 1 joins queue
    c1_res = await async_client.post(f"/api/v1/businesses/{biz_id}/queue/join", json={
        "customerName": "Aarav Sharma",
        "customerMobile": "9811223344",
        "serviceId": srv_id,
        "customerId": "cust_1"
    })
    assert c1_res.status_code == 201
    c1_id = c1_res.json()["entryId"]

    # Customer 2 joins queue
    c2_res = await async_client.post(f"/api/v1/businesses/{biz_id}/queue/join", json={
        "customerName": "Diya Sen",
        "customerMobile": "9822334455",
        "serviceId": srv_id,
        "customerId": "cust_2"
    })
    assert c2_res.status_code == 201

    # Call Next (Ramesh calls Customer 1)
    call_next_res = await async_client.post(f"/api/v1/businesses/{biz_id}/queue/call-next")
    assert call_next_res.status_code == 200
    assert call_next_res.json()["entry"]["tokenNumber"] == 1

    # Check Owner Dashboard: nowServing must have Aarav Sharma
    dash_res = await async_client.get(f"/api/v1/owner/business/{biz_id}/dashboard", headers=headers)
    assert dash_res.status_code == 200
    dash_data = dash_res.json()
    assert dash_data["nowServing"] is not None
    assert dash_data["nowServing"]["customerName"] == "Aarav Sharma"
    assert "XX-XX" in dash_data["nowServing"]["maskedMobile"]
    assert dash_data["waitingCount"] == 1

    # Mark as Paid Toggle (UPI)
    pay_res = await async_client.patch(f"/api/v1/owner/queue/{c1_id}/payment", json={
        "payment_status": "PAID",
        "payment_mode": "UPI"
    }, headers=headers)
    assert pay_res.status_code == 200
    assert pay_res.json()["paymentStatus"] == "PAID"

    # Complete Customer 1
    comp_res = await async_client.post(f"/api/v1/businesses/{biz_id}/queue/token/{c1_id}/complete")
    assert comp_res.status_code == 200

    # Reset Daily Queue
    reset_res = await async_client.post(f"/api/v1/owner/business/{biz_id}/queue/reset", headers=headers)
    assert reset_res.status_code == 200
    assert reset_res.json()["currentToken"] == 0
    assert reset_res.json()["waitingCount"] == 0

@pytest.mark.asyncio
async def test_owner_services_crud_and_analytics(async_client: AsyncClient):
    signup_res = await async_client.post("/api/v1/auth/signup", json={
        "name": "Pooja Verma",
        "mobile": "9844332211",
        "password": "PoojaPassword123"
    })
    token = signup_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    onboard_res = await async_client.post("/api/v1/owner/business/onboard", json={
        "shop_name": "Pooja Beauty Lounge",
        "category": "salon",
        "address": "10, HSR Layout",
        "services": [{"name": "Facial", "price": 1200.0, "estimated_duration": 45}]
    }, headers=headers)
    biz_id = onboard_res.json()["business_id"]

    # Add new service
    new_srv_res = await async_client.post(f"/api/v1/owner/business/{biz_id}/services", json={
        "name": "Manicure & Pedicure",
        "price": 750.0,
        "estimatedDuration": 35,
        "active": True
    }, headers=headers)
    assert new_srv_res.status_code == 201

    # Check services list
    srv_list_res = await async_client.get(f"/api/v1/owner/business/{biz_id}/services")
    assert srv_list_res.status_code == 200
    assert len(srv_list_res.json()) == 2

    # Analytics endpoint
    analytics_res = await async_client.get(f"/api/v1/owner/business/{biz_id}/analytics", headers=headers)
    assert analytics_res.status_code == 200
    analytics_data = analytics_res.json()
    assert "peakHours" in analytics_data
    assert "averageWaitMin" in analytics_data
    assert "serviceBreakdown" in analytics_data


@pytest.mark.asyncio
async def test_owner_queue_pause_and_daily_reset(async_client: AsyncClient):
    signup_res = await async_client.post("/api/v1/auth/signup", json={
        "name": "Vikram Singh",
        "mobile": "9811223344",
        "password": "VikramPassword123"
    })
    token = signup_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    onboard_res = await async_client.post("/api/v1/owner/business/onboard", json={
        "shop_name": "Vikram Diagnostic Lab",
        "category": "diagnostic",
        "address": "Civil Lines, Jaipur",
        "services": [{"name": "Blood Test", "price": 400.0, "estimated_duration": 15}]
    }, headers=headers)
    biz_id = onboard_res.json()["business_id"]

    # Toggle Pause
    pause_res = await async_client.post(f"/api/v1/owner/business/{biz_id}/queue/toggle-pause", headers=headers)
    assert pause_res.status_code == 200
    assert pause_res.json()["queueStatus"] == "PAUSED"

    # Toggle Resume
    resume_res = await async_client.post(f"/api/v1/owner/business/{biz_id}/queue/toggle-pause", headers=headers)
    assert resume_res.status_code == 200
    assert resume_res.json()["queueStatus"] == "ACTIVE"

    # Toggle Shop Open / Close
    status_res = await async_client.post(f"/api/v1/owner/business/{biz_id}/toggle-status", headers=headers)
    assert status_res.status_code == 200
    assert status_res.json()["businessStatus"] == "CLOSED"

    # Daily Queue Reset
    reset_res = await async_client.post(f"/api/v1/owner/business/{biz_id}/queue/reset", headers=headers)
    assert reset_res.status_code == 200
    assert reset_res.json()["reset"] is True

