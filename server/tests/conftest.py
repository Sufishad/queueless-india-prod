import asyncio
import pytest
from httpx import ASGITransport, AsyncClient
from mongomock_motor import AsyncMongoMockClient

from app.api.deps import get_database
from app.core.database import db_manager, get_db
from app.main import app
from unittest.mock import AsyncMock, patch
from starlette.testclient import TestClient


@pytest.fixture
def mock_mongo_client():
    client = AsyncMongoMockClient()
    return client


@pytest.fixture
async def mock_db(mock_mongo_client):
    db = mock_mongo_client["test_queueless"]
    # Assign to db_manager for any direct access
    db_manager.client = mock_mongo_client
    db_manager.db = db
    yield db


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


@pytest.fixture
async def async_client(mock_db):
    app.dependency_overrides[get_database] = lambda: mock_db
    app.dependency_overrides[get_db] = lambda: mock_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    app.dependency_overrides.clear()


@pytest.fixture
def sync_test_client(mock_db):
    app.dependency_overrides[get_database] = lambda: mock_db
    app.dependency_overrides[get_db] = lambda: mock_db
    
    with patch("app.main.connect_to_mongo", new_callable=AsyncMock), \
         patch("app.main.close_mongo_connection", new_callable=AsyncMock):
        with TestClient(app) as client:
            yield client
    app.dependency_overrides.clear()
