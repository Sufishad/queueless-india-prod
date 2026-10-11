from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.api import api_router
from app.api.v1.endpoints import websocket
from app.core.config import settings
from app.core.database import close_mongo_connection, connect_to_mongo


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Connect to MongoDB and build indexes
    await connect_to_mongo()
    yield
    # Shutdown: Close database connections
    await close_mongo_connection()


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="QueueLess India (क्यूलेस इंडिया) - Zero-Friction High Concurrency Queue Engine",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API v1 routes
app.include_router(api_router, prefix=settings.API_V1_STR)
# WebSocket routes
app.include_router(websocket.router)
app.include_router(websocket.router, prefix=settings.API_V1_STR)


@app.get("/health", tags=["system"])
@app.get("/healthz", tags=["system"])
async def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": "1.0.0",
        "environment": settings.ENV,
    }


@app.get("/", tags=["system"])
async def root():
    return {
        "name": "QueueLess India (क्यूलेस इंडिया)",
        "tagline": "Line mein nahi, time par. (लाइन में नहीं, टाइम पर।)",
        "docs": "/docs",
        "health": "/health"
    }
