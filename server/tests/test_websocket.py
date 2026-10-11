import pytest
from app.schemas.queue import JoinQueueRequest
from app.services.queue_engine import QueueEngine


@pytest.mark.asyncio
async def test_websocket_connection_and_initial_state(sync_test_client, setup_test_business, mock_db):
    biz_id = setup_test_business["business_id"]

    # Connect to WebSocket
    with sync_test_client.websocket_connect(f"/ws/queue/{biz_id}?client_id=test_client_1") as ws:
        # First message upon connect must be current QUEUE_STATE_CHANGED
        data = ws.receive_json()
        assert data["event"] == "QUEUE_STATE_CHANGED"
        assert data["data"]["businessId"] == biz_id
        assert data["data"]["currentToken"] == 0
        assert data["data"]["waitingCount"] == 0

        # Send ping
        ws.send_text('{"action": "ping"}')
        pong_data = ws.receive_json()
        assert pong_data["event"] == "pong"


@pytest.mark.asyncio
async def test_websocket_broadcast_on_queue_join_and_turn_near(sync_test_client, setup_test_business, mock_db):
    biz_id = setup_test_business["business_id"]
    srv_id = setup_test_business["service_id"]

    with sync_test_client.websocket_connect(f"/ws/queue/{biz_id}?client_id=client_listener&customer_id=device_cust_1") as ws:
        # Receive initial state
        initial = ws.receive_json()
        assert initial["event"] == "QUEUE_STATE_CHANGED"

        # Customer 1 joins queue via REST
        resp = sync_test_client.post(
            f"/api/v1/businesses/{biz_id}/queue/join",
            json={
                "customerName": "Ramesh Gupta",
                "customerMobile": "9812345678",
                "serviceId": srv_id,
                "customerId": "device_cust_1"
            },
            headers={"x-customer-id": "device_cust_1"}
        )
        assert resp.status_code == 201

        # WebSocket must receive QUEUE_STATE_CHANGED and CUSTOMER_TURN_NEAR (because 0 people ahead <= 2)
        events_received = []
        # Receive broadcast messages
        for _ in range(2):
            msg = ws.receive_json()
            events_received.append(msg["event"])

        assert "QUEUE_STATE_CHANGED" in events_received
        assert "CUSTOMER_TURN_NEAR" in events_received


@pytest.mark.asyncio
async def test_websocket_call_next_broadcast(sync_test_client, setup_test_business, mock_db):
    biz_id = setup_test_business["business_id"]

    # Create 2 queue entries
    req1 = JoinQueueRequest(customerName="Person 1", customerMobile="9800000001", customerId="cust_1")
    req2 = JoinQueueRequest(customerName="Person 2", customerMobile="9800000002", customerId="cust_2")
    await QueueEngine.join_queue(mock_db, biz_id, req1)
    await QueueEngine.join_queue(mock_db, biz_id, req2)

    with sync_test_client.websocket_connect(f"/ws/queue/{biz_id}?client_id=tv_display_kiosk&client_type=display") as ws:
        # Initial message
        _ = ws.receive_json()

        # Call next customer
        call_resp = sync_test_client.post(
            f"/api/v1/businesses/{biz_id}/queue/call-next",
            json={"counterId": "Counter-1"}
        )
        assert call_resp.status_code == 200

        # Kiosk receives updated state with nowServing
        msg = ws.receive_json()
        assert msg["event"] == "QUEUE_STATE_CHANGED"
        assert msg["data"]["currentToken"] == 1
        assert msg["data"]["nowServing"]["tokenNumber"] == 1
