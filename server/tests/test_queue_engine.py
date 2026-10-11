import asyncio
import pytest
from app.schemas.queue import JoinQueueRequest
from app.services.queue_engine import QueueEngine
from app.core.exceptions import (
    BusinessNotFoundException,
    QueuePausedException,
    UnauthorizedCancellationException,
)


@pytest.fixture
async def setup_test_business(mock_db):
    biz_doc = {
        "_id": "biz_test_clinic",
        "name": "Dr. Verma Clinic",
        "category": "Clinic",
        "address": "Connaught Place, New Delhi",
        "location": {"type": "Point", "coordinates": [77.2167, 28.6448]},
        "status": "open",
        "queueStatus": "active",
        "plan": "starter",
        "verified": True
    }
    await mock_db.businesses.insert_one(biz_doc)

    service_doc = {
        "_id": "srv_dentist",
        "businessId": "biz_test_clinic",
        "name": "Dental Checkup",
        "price": 450.0,
        "estimatedDuration": 20,
        "active": True
    }
    await mock_db.services.insert_one(service_doc)

    return {"business_id": "biz_test_clinic", "service_id": "srv_dentist"}


@pytest.mark.asyncio
async def test_zero_friction_token_booking(mock_db, setup_test_business):
    biz_id = setup_test_business["business_id"]
    srv_id = setup_test_business["service_id"]

    req = JoinQueueRequest(
        customerName="Amit Kumar",
        customerMobile="9811223344",
        serviceId=srv_id,
        customerId="device_session_xyz"
    )

    entry = await QueueEngine.join_queue(
        db=mock_db,
        business_id=biz_id,
        request=req,
        customer_session_id="device_session_xyz"
    )

    assert entry["tokenNumber"] == 1
    assert entry["customerName"] == "Amit Kumar"
    assert entry["customerMobile"] == "9811223344"
    assert entry["serviceName"] == "Dental Checkup"
    assert entry["servicePrice"] == 450.0
    assert entry["peopleAhead"] == 0
    assert entry["status"] == "waiting"


@pytest.mark.asyncio
async def test_atomic_token_increments_concurrency(mock_db, setup_test_business):
    """
    Simulates 20 concurrent customers hitting the join_queue endpoint at the exact same moment.
    Verifies that all 20 tokens are assigned strictly unique numbers from 1 to 20 without duplicates.
    """
    biz_id = setup_test_business["business_id"]

    async def book_token(idx: int):
        req = JoinQueueRequest(
            customerName=f"Customer {idx}",
            customerMobile=f"98000000{idx:02d}",
            customerId=f"session_{idx}"
        )
        return await QueueEngine.join_queue(
            db=mock_db,
            business_id=biz_id,
            request=req
        )

    # Launch 20 concurrent tasks
    results = await asyncio.gather(*[book_token(i) for i in range(1, 21)])

    token_numbers = [r["tokenNumber"] for r in results]
    
    # 1. Total tokens issued must be 20
    assert len(token_numbers) == 20
    # 2. Every token number must be unique (no collision)
    assert len(set(token_numbers)) == 20
    # 3. Tokens must cover exactly 1 to 20
    assert sorted(token_numbers) == list(range(1, 21))


@pytest.mark.asyncio
async def test_frozen_service_price_snapshot(mock_db, setup_test_business):
    """
    CRITICAL GUARD: Verifies that when a service price changes later,
    the customer's existing token retains the frozen price snapshot.
    """
    biz_id = setup_test_business["business_id"]
    srv_id = setup_test_business["service_id"]

    # Customer books when price is ₹450
    req = JoinQueueRequest(
        customerName="Neha Sharma",
        customerMobile="9877665544",
        serviceId=srv_id
    )
    entry = await QueueEngine.join_queue(mock_db, biz_id, req)
    assert entry["servicePrice"] == 450.0

    # Business owner raises price to ₹800
    await mock_db.services.update_one(
        {"_id": srv_id},
        {"$set": {"price": 800.0}}
    )

    # Re-fetch customer token: must still show ₹450 frozen snapshot
    status_doc = await QueueEngine.get_customer_token_status(mock_db, biz_id, entry["entryId"])
    assert status_doc["servicePrice"] == 450.0


@pytest.mark.asyncio
async def test_dual_role_otp_free_cancellation(mock_db, setup_test_business):
    biz_id = setup_test_business["business_id"]

    # Customer 1 joins with device session A
    req1 = JoinQueueRequest(
        customerName="Customer A",
        customerMobile="9911223344",
        customerId="device_A"
    )
    entry1 = await QueueEngine.join_queue(mock_db, biz_id, req1, customer_session_id="device_A")

    # Mismatched customer device session B attempts to cancel -> MUST FAIL (403 Forbidden)
    with pytest.raises(UnauthorizedCancellationException):
        await QueueEngine.cancel_token(
            db=mock_db,
            business_id=biz_id,
            entry_id=entry1["entryId"],
            customer_id="device_B",
            is_owner=False
        )

    # Matching customer device session A cancels -> SUCCEEDS without OTP
    cancelled_by_cust = await QueueEngine.cancel_token(
        db=mock_db,
        business_id=biz_id,
        entry_id=entry1["entryId"],
        customer_id="device_A",
        is_owner=False
    )
    assert cancelled_by_cust["status"] == "cancelled"

    # Customer 2 joins
    req2 = JoinQueueRequest(
        customerName="Customer B",
        customerMobile="9922334455",
        customerId="device_B"
    )
    entry2 = await QueueEngine.join_queue(mock_db, biz_id, req2, customer_session_id="device_B")

    # Business Owner cancels Customer 2's token -> SUCCEEDS
    cancelled_by_owner = await QueueEngine.cancel_token(
        db=mock_db,
        business_id=biz_id,
        entry_id=entry2["entryId"],
        customer_id=None,
        is_owner=True,
        reason="Doctor called away on emergency"
    )
    assert cancelled_by_owner["status"] == "cancelled"
    assert cancelled_by_owner["cancelReason"] == "Doctor called away on emergency"


@pytest.mark.asyncio
async def test_queue_workflow_call_next_and_skip(mock_db, setup_test_business):
    biz_id = setup_test_business["business_id"]

    # Add 3 tokens
    t1 = await QueueEngine.join_queue(mock_db, biz_id, JoinQueueRequest(customerName="One", customerMobile="9800000001"))
    t2 = await QueueEngine.join_queue(mock_db, biz_id, JoinQueueRequest(customerName="Two", customerMobile="9800000002"))
    t3 = await QueueEngine.join_queue(mock_db, biz_id, JoinQueueRequest(customerName="Three", customerMobile="9800000003"))

    # Initial live state
    state0 = await QueueEngine.get_live_queue_state(mock_db, biz_id)
    assert state0["waitingCount"] == 3
    assert state0["currentToken"] == 0

    # Call Next -> should call Token 1
    called1 = await QueueEngine.call_next(mock_db, biz_id, counter_id="Counter-1")
    assert called1["tokenNumber"] == 1
    assert called1["status"] == "serving"
    assert called1["counterId"] == "Counter-1"

    # State update
    state1 = await QueueEngine.get_live_queue_state(mock_db, biz_id)
    assert state1["currentToken"] == 1
    assert state1["waitingCount"] == 2
    assert state1["nowServing"]["tokenNumber"] == 1

    # Skip Token 1 (no-show)
    skipped1 = await QueueEngine.skip_token(mock_db, biz_id, t1["entryId"], reason="Did not respond to call")
    assert skipped1["status"] == "skipped"

    # Complete Token 2
    called2 = await QueueEngine.call_next(mock_db, biz_id)
    assert called2["tokenNumber"] == 2
    completed2 = await QueueEngine.complete_token(mock_db, biz_id, t2["entryId"])
    assert completed2["status"] == "completed"


@pytest.mark.asyncio
async def test_fastapi_rest_endpoints(async_client, setup_test_business):
    biz_id = setup_test_business["business_id"]

    # 1. Join queue via REST
    join_resp = await async_client.post(
        f"/api/v1/businesses/{biz_id}/queue/join",
        json={
            "customerName": "Suresh Raina",
            "customerMobile": "9812345678",
            "customerId": "session_suresh"
        },
        headers={"x-customer-id": "session_suresh"}
    )
    assert join_resp.status_code == 201
    join_data = join_resp.json()
    assert join_data["tokenNumber"] == 1
    assert join_data["customerName"] == "Suresh Raina"
    entry_id = join_data["entryId"]

    # 2. Get Queue State via REST
    state_resp = await async_client.get(f"/api/v1/businesses/{biz_id}/queue/state")
    assert state_resp.status_code == 200
    state_data = state_resp.json()
    assert state_data["waitingCount"] == 1

    # 3. Check customer token status via REST
    token_resp = await async_client.get(f"/api/v1/businesses/{biz_id}/queue/token/{entry_id}")
    assert token_resp.status_code == 200
    token_data = token_resp.json()
    assert token_data["tokenNumber"] == 1
    assert token_data["peopleAhead"] == 0

    # 4. Call next via REST
    call_resp = await async_client.post(
        f"/api/v1/businesses/{biz_id}/queue/call-next",
        json={"counterId": "Desk-A"}
    )
    assert call_resp.status_code == 200
    assert call_resp.json()["entry"]["tokenNumber"] == 1


@pytest.mark.asyncio
async def test_invalid_mobile_rejection(async_client, setup_test_business):
    biz_id = setup_test_business["business_id"]

    # Invalid mobile (starts with 3, only 6 digits)
    resp = await async_client.post(
        f"/api/v1/businesses/{biz_id}/queue/join",
        json={
            "customerName": "Test Customer",
            "customerMobile": "334455"
        }
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_queue_paused_rejection(mock_db, setup_test_business):
    biz_id = setup_test_business["business_id"]

    # Pause queue
    await mock_db.businesses.update_one(
        {"_id": biz_id},
        {"$set": {"queueStatus": "paused"}}
    )

    with pytest.raises(QueuePausedException):
        await QueueEngine.join_queue(
            db=mock_db,
            business_id=biz_id,
            request=JoinQueueRequest(customerName="Ravi", customerMobile="9876543210")
        )


@pytest.mark.asyncio
async def test_walk_in_token_endpoint(async_client, setup_test_business):
    biz_id = setup_test_business["business_id"]

    resp = await async_client.post(
        f"/api/v1/businesses/{biz_id}/queue/walk-in",
        json={
            "customerName": "Elderly Walkin",
            "customerMobile": "9876543210"
        }
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["customerName"] == "Elderly Walkin"
    assert data["tokenNumber"] >= 1
