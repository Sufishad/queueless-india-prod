import asyncio
import pytest
from httpx import ASGITransport, AsyncClient
from mongomock_motor import AsyncMongoMockClient

from app.api.deps import get_database
from app.core.database import db_manager
from app.main import app


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
async def async_client(mock_db):
    app.dependency_overrides[get_database] = lambda: mock_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    app.dependency_overrides.clear()
