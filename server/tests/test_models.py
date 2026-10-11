import pytest
from app.models.common import validate_indian_mobile, GeoPoint, BusinessStatus, QueueStatus
from app.models.business import Business
from app.models.queue import QueueEntry, Queue
from pydantic import ValidationError


def test_indian_mobile_validation():
    # Valid mobile numbers
    assert validate_indian_mobile("9876543210") == "9876543210"
    assert validate_indian_mobile("+919876543210") == "9876543210"
    assert validate_indian_mobile("09876543210") == "9876543210"
    assert validate_indian_mobile("9876 543 210") == "9876543210"
    assert validate_indian_mobile("6123456789") == "6123456789"
    assert validate_indian_mobile("7987654321") == "7987654321"
    assert validate_indian_mobile("8888888888") == "8888888888"

    # Invalid mobile numbers (not starting with 6-9, or wrong length)
    with pytest.raises(ValueError):
        validate_indian_mobile("5987654321")

    with pytest.raises(ValueError):
        validate_indian_mobile("12345")

    with pytest.raises(ValueError):
        validate_indian_mobile("abcdefghij")


def test_business_model_creation():
    biz = Business(
        name="Apollo Clinic Bangalore",
        category="Clinic",
        address="Indiranagar 100ft Road, Bengaluru",
        location=GeoPoint(coordinates=[77.6413, 12.9784]),
        upi_id="apollo@icici"
    )
    assert biz.name == "Apollo Clinic Bangalore"
    assert biz.status == BusinessStatus.OPEN
    assert biz.queue_status == QueueStatus.ACTIVE
    assert biz.location.coordinates == [77.6413, 12.9784]


def test_queue_entry_frozen_price_validation():
    entry = QueueEntry(
        businessId="biz_123",
        customerId="cust_001",
        customerName="Rahul Sharma",
        customerMobile="9876543210",
        serviceName="General Consultation",
        servicePrice=500.0,
        tokenNumber=1
    )
    assert entry.token_number == 1
    assert entry.service_price == 500.0
    assert entry.status == "waiting"
    assert entry.payment_status == "unpaid"
