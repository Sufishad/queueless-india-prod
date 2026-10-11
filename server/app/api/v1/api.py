from fastapi import APIRouter
from app.api.v1.endpoints import business, queue

api_router = APIRouter()
api_router.include_router(business.router, prefix="/businesses", tags=["businesses"])
api_router.include_router(queue.router, prefix="/businesses", tags=["queues"])
