import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_counter_crud_and_call_next(async_client: AsyncClient):
    # 1. Sign up owner
    signup_res = await async_client.post("/api/v1/auth/signup", json={
        "name": "Dr. Rajesh Sharma",
        "mobile": "9871122334",
        "password": "RajeshPassword123"
    })
    assert signup_res.status_code == 201
    token = signup_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Onboard clinic
    onboard_res = await async_client.post("/api/v1/owner/business/onboard", json={
        "shop_name": "City Care Multi-Speciality Clinic",
        "category": "clinic",
        "address": "Ring Road, Surat",
        "services": [
            {"name": "General OPD", "price": 300.0, "estimated_duration": 15},
            {"name": "Dentistry", "price": 500.0, "estimated_duration": 30}
        ]
    }, headers=headers)
    assert onboard_res.status_code == 201
    biz_id = onboard_res.json()["business_id"]

    # 3. List counters (auto-seeds default Counter 1 if none)
    cnt_list_res = await async_client.get(f"/api/v1/owner/business/{biz_id}/counters", headers=headers)
    assert cnt_list_res.status_code == 200
    counters = cnt_list_res.json()
    assert len(counters) >= 1
    cnt1_id = counters[0]["id"]

    # 4. Create second counter
    cnt2_res = await async_client.post(f"/api/v1/owner/business/{biz_id}/counters", json={
        "name": "Counter 2 - Dr. Verma",
        "operator_name": "Dr. Verma",
        "is_active": True
    }, headers=headers)
    assert cnt2_res.status_code == 201
    cnt2_data = cnt2_res.json()
    cnt2_id = cnt2_data["id"]
    assert cnt2_data["name"] == "Counter 2 - Dr. Verma"

    # 5. Patch counter
    patch_res = await async_client.patch(f"/api/v1/owner/business/{biz_id}/counters/{cnt2_id}", json={
        "operator_name": "Dr. Amit Verma"
    }, headers=headers)
    assert patch_res.status_code == 200
    assert patch_res.json()["operator_name"] == "Dr. Amit Verma"

    # 6. Customer joins queue
    services_res = await async_client.get(f"/api/v1/owner/business/{biz_id}/services")
    service_id = services_res.json()[0]["id"]

    join_res = await async_client.post(f"/api/v1/businesses/{biz_id}/queue/join", json={
        "customerName": "Suresh Patel",
        "customerMobile": "9825012345",
        "serviceId": service_id,
        "customerId": "cust_suresh_1"
    })
    assert join_res.status_code == 201
    tok_num = join_res.json()["tokenNumber"]

    # 7. Counter-specific Call Next on Counter 2!
    call_next_res = await async_client.post(
        f"/api/v1/owner/business/{biz_id}/counters/{cnt2_id}/call-next",
        headers=headers
    )
    assert call_next_res.status_code == 200
    call_data = call_next_res.json()
    assert call_data["called_token"] == tok_num
    assert call_data["counter_name"] == "Counter 2 - Dr. Verma"
    assert "Counter 2" in call_data["announcement"]


@pytest.mark.asyncio
async def test_hybrid_appointments_flow(async_client: AsyncClient):
    # 1. Sign up owner and onboard business
    signup_res = await async_client.post("/api/v1/auth/signup", json={
        "name": "Dr. Sneha Roy",
        "mobile": "9933445566",
        "password": "SnehaPassword123"
    })
    assert signup_res.status_code == 201
    token = signup_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    onboard_res = await async_client.post("/api/v1/owner/business/onboard", json={
        "shop_name": "Roy Dental Care",
        "category": "clinic",
        "address": "Park Street, Kolkata",
        "services": [{"name": "Root Canal", "price": 2500.0, "estimated_duration": 45}]
    }, headers=headers)
    assert onboard_res.status_code == 201
    biz_id = onboard_res.json()["business_id"]

    services_res = await async_client.get(f"/api/v1/owner/business/{biz_id}/services")
    service_id = services_res.json()[0]["id"]

    # 2. Get available appointment slots
    slots_res = await async_client.get(
        f"/api/v1/businesses/{biz_id}/appointment-slots?date=2025-11-20&service_id={service_id}"
    )
    assert slots_res.status_code == 200
    slots_data = slots_res.json()
    assert len(slots_data["available_slots"]) > 5
    chosen_slot = slots_data["available_slots"][0]

    # 3. Book scheduled appointment
    book_res = await async_client.post(f"/api/v1/businesses/{biz_id}/appointments", json={
        "customer_name": "Meera Sen",
        "customer_mobile": "9830112233",
        "service_id": service_id,
        "appointment_date": "2025-11-20",
        "slot_time": chosen_slot,
        "notes": "First time dental consultation"
    })
    assert book_res.status_code == 201
    appt_data = book_res.json()
    appt_id = appt_data["id"]
    assert appt_data["customer_name"] == "Meera Sen"
    assert appt_data["status"] == "SCHEDULED"

    # 4. Check available slots again: booked slot should no longer be available
    slots_after_res = await async_client.get(
        f"/api/v1/businesses/{biz_id}/appointment-slots?date=2025-11-20&service_id={service_id}"
    )
    assert chosen_slot not in slots_after_res.json()["available_slots"]
    assert chosen_slot in slots_after_res.json()["booked_slots"]

    # 5. Owner lists appointments
    owner_appts_res = await async_client.get(
        f"/api/v1/owner/business/{biz_id}/appointments?date=2025-11-20",
        headers=headers
    )
    assert owner_appts_res.status_code == 200
    appts_list = owner_appts_res.json()
    assert len(appts_list) == 1
    assert appts_list[0]["id"] == appt_id

    # 6. Customer arrives at clinic -> 1-Tap Check-In!
    checkin_res = await async_client.post(
        f"/api/v1/owner/business/{biz_id}/appointments/{appt_id}/check-in",
        headers=headers
    )
    assert checkin_res.status_code == 200
    checkin_data = checkin_res.json()
    assert checkin_data["status"] == "CHECKED_IN"
    assert checkin_data["token_number"] >= 1
    assert "Checked in successfully" in checkin_data["message"]

    # 7. Verify double check-in rejection
    re_checkin = await async_client.post(
        f"/api/v1/owner/business/{biz_id}/appointments/{appt_id}/check-in",
        headers=headers
    )
    assert re_checkin.status_code == 400
