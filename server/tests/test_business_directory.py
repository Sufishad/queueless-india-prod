import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.seed_data import SEED_BUSINESSES


@pytest.mark.asyncio
async def test_seed_demo_businesses(async_client):
    response = await async_client.post("/api/v1/businesses/seed")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert len(data["business_ids"]) == 4


@pytest.mark.asyncio
async def test_list_businesses_and_search(async_client):
    # Seed first
    await async_client.post("/api/v1/businesses/seed")

    # List all
    resp = await async_client.get("/api/v1/businesses")
    assert resp.status_code == 200
    items = resp.json()
    assert len(items) >= 4

    # Search by query
    search_resp = await async_client.get("/api/v1/businesses?q=Sharma")
    assert search_resp.status_code == 200
    search_items = search_resp.json()
    assert len(search_items) >= 1
    assert "Sharma" in search_items[0]["name"]

    # Filter by category
    cat_resp = await async_client.get("/api/v1/businesses?category=clinic")
    assert cat_resp.status_code == 200
    cat_items = cat_resp.json()
    assert all(item["category"] == "clinic" for item in cat_items)


@pytest.mark.asyncio
async def test_distance_sorting(async_client):
    await async_client.post("/api/v1/businesses/seed")

    # Apollo Clinic is at 12.9716, 77.6412
    resp = await async_client.get("/api/v1/businesses?lat=12.9716&lng=77.6412")
    assert resp.status_code == 200
    items = resp.json()
    assert len(items) >= 4
    # Nearest item should be Apollo Clinic with distance approx 0 km
    assert items[0]["name"] == "Apollo Clinic Indiranagar"
    assert items[0]["distanceKm"] == 0.0


@pytest.mark.asyncio
async def test_business_detail_with_services_and_queue(async_client):
    await async_client.post("/api/v1/businesses/seed")

    resp = await async_client.get("/api/v1/businesses/biz_apollo_clinic/detail")
    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == "biz_apollo_clinic"
    assert data["name"] == "Apollo Clinic Indiranagar"
    assert len(data["services"]) == 4
    assert "queueState" in data
    assert data["queueState"]["businessId"] == "biz_apollo_clinic"


@pytest.mark.asyncio
async def test_customer_user_tokens_list(async_client):
    await async_client.post("/api/v1/businesses/seed")

    # Book token at Apollo Clinic
    join_resp = await async_client.post(
        "/api/v1/businesses/biz_apollo_clinic/queue/join",
        json={
            "customerName": "Rahul Verma",
            "customerMobile": "9876543210",
            "serviceId": "srv_apollo_gen",
            "customerId": "client-device-123"
        }
    )
    assert join_resp.status_code == 201
    entry_id = join_resp.json()["entryId"]

    # Fetch my tokens
    tokens_resp = await async_client.get(
        "/api/v1/queue/tokens/user/list?mobile=9876543210"
    )
    assert tokens_resp.status_code == 200
    tokens = tokens_resp.json()
    assert len(tokens) >= 1
    assert tokens[0]["customerMobile"] == "9876543210"
    assert tokens[0]["businessName"] == "Apollo Clinic Indiranagar"
    assert tokens[0]["serviceName"] == "General Physician Consultation"

    # Check direct live token endpoint
    live_resp = await async_client.get(f"/api/v1/queue/token/{entry_id}/live")
    assert live_resp.status_code == 200
    live_data = live_resp.json()
    assert live_data["id"] == entry_id
    assert live_data["businessName"] == "Apollo Clinic Indiranagar"
