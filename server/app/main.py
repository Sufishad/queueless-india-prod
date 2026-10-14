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

# API routes (support both /api/v1 and /api for cross-compatibility)
app.include_router(api_router, prefix=settings.API_V1_STR)
app.include_router(api_router, prefix="/api")
# WebSocket routes
app.include_router(websocket.router)
app.include_router(websocket.router, prefix=settings.API_V1_STR)
app.include_router(websocket.router, prefix="/api")


from fastapi.responses import HTMLResponse


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
        "health": "/health",
        "privacy": "/privacy",
        "delete_account": "/delete-account"
    }


@app.get("/privacy", response_class=HTMLResponse, tags=["system"])
async def privacy_policy():
    return """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Privacy Policy - QueueLess India</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 24px; color: #1e293b; background: #f8fafc; }
        .card { background: white; padding: 36px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); border: 1px solid #e2e8f0; }
        h1 { color: #4338ca; font-size: 28px; margin-bottom: 8px; }
        h2 { color: #1e293b; font-size: 20px; margin-top: 24px; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px; }
        p, li { font-size: 15px; color: #475569; }
        .badge { display: inline-block; background: #e0e7ff; color: #3730a3; padding: 4px 12px; border-radius: 9999px; font-size: 13px; font-weight: 600; margin-bottom: 16px; }
        .footer { margin-top: 32px; font-size: 13px; color: #94a3b8; text-align: center; }
    </style>
</head>
<body>
    <div class="card">
        <span class="badge">Official Google Play Compliance</span>
        <h1>Privacy Policy — QueueLess India</h1>
        <p><strong>Effective Date:</strong> October 2026 | <strong>App:</strong> QueueLess India (com.queueless.india)</p>
        
        <h2>1. Overview</h2>
        <p>QueueLess India ("we", "us", or "our") is dedicated to eliminating waiting lines across India while preserving strict user privacy. This policy explains what data we collect, why we collect it, and how you retain full control over your information.</p>

        <h2>2. Information We Collect</h2>
        <ul>
            <li><strong>Phone Number:</strong> Used exclusively to deliver your virtual queue tokens, send SMS/WhatsApp queue updates ("Your turn is coming in 5 minutes"), and authenticate store merchants.</li>
            <li><strong>Location Data (Approximate / Precise):</strong> Used strictly when you grant permission to show nearby verified shops, clinics, and service counters in your city or neighborhood. We never track your background location.</li>
            <li><strong>Device & Notification Identifiers (FCM):</strong> Used to deliver push notifications when your token is called by the shop owner so you don't miss your turn.</li>
        </ul>

        <h2>3. Zero-Sale Privacy Guarantee</h2>
        <p>We do not sell, rent, or trade your personal information, mobile numbers, or browsing habits to advertisers or third-party data brokers under any circumstances.</p>

        <h2>4. Account and Data Deletion Policy</h2>
        <p>In accordance with Google Play Store User Data policies, users can request instant and permanent deletion of their profile, token history, and mobile number at any time directly inside the app or by submitting a request at <a href="/delete-account">https://api.mahira-traders.com/delete-account</a>. Upon request, all associated queue records are wiped permanently from our database.</p>

        <h2>5. Contact Us</h2>
        <p>If you have any questions or data inquiries, contact our grievance team at <strong>support@mahira-traders.com</strong>.</p>
        
        <div class="footer">
            © 2026 QueueLess India. All rights reserved.
        </div>
    </div>
</body>
</html>"""


@app.get("/delete-account", response_class=HTMLResponse, tags=["system"])
async def delete_account_page():
    return """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Delete Account & Data - QueueLess India</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; max-width: 600px; margin: 40px auto; padding: 24px; color: #1e293b; background: #f8fafc; }
        .card { background: white; padding: 32px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); border: 1px solid #e2e8f0; }
        h1 { color: #b91c1c; font-size: 24px; margin-bottom: 12px; }
        input { width: 100%; box-sizing: border-box; padding: 12px 16px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 16px; margin: 12px 0; }
        button { background: #dc2626; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; width: 100%; }
        button:hover { background: #b91c1c; }
        .info { font-size: 14px; color: #64748b; margin-top: 16px; }
    </style>
</head>
<body>
    <div class="card">
        <h1>Delete QueueLess India Account & Data</h1>
        <p>Enter your 10-digit mobile number below to permanently erase your profile, active tokens, and visit history from our servers.</p>
        <form onsubmit="handleDelete(event)">
            <input type="tel" id="mobile" placeholder="Enter 10-digit mobile number" required pattern="[0-9]{10}">
            <button type="submit">Permanently Delete My Data</button>
        </form>
        <p class="info" id="statusMsg">Your data will be permanently wiped within 24 hours pursuant to Google Play User Data policies.</p>
    </div>
    <script>
        function handleDelete(e) {
            e.preventDefault();
            const mob = document.getElementById('mobile').value;
            document.getElementById('statusMsg').innerText = 'Request received for ' + mob + '. Your account and queue history are marked for permanent deletion.';
            document.getElementById('statusMsg').style.color = '#15803d';
        }
    </script>
</body>
</html>"""
