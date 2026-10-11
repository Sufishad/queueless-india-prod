from fastapi import APIRouter
from app.api.v1.endpoints import business, queue, auth, owner, counter, appointment, admin

api_router = APIRouter()
api_router.include_router(business.router, prefix="/businesses", tags=["businesses"])
api_router.include_router(queue.router, prefix="/businesses", tags=["queues"])
api_router.include_router(queue.router, prefix="/queue", tags=["queue-direct"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(owner.router, prefix="/owner", tags=["owner"])
api_router.include_router(counter.router, prefix="/owner", tags=["counters"])
api_router.include_router(appointment.router, tags=["appointments"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
