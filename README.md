# 🚀 QueueLess India (क्यूलेस इंडिया)
> *"Line mein nahi, time par." (लाइन में नहीं, टाइम पर।)*

QueueLess India is a zero-friction, real-time, offline-first queue management platform engineered for Indian local markets (clinics, salons, restaurants, banks, CSC centres, and retail stores).

---

## 🏗️ Monorepo Structure

```text
queueless-india/
├── apps/
│   ├── mobile/             # React Native (Expo SDK, Expo Router, Dev Client)
│   ├── admin-web/          # Next.js Super Admin Portal
│   └── tv-display/         # Next.js Waiting Hall TV Mode (/display/[businessId])
├── packages/
│   ├── ui/                 # Shared UI Components
│   └── types/              # Shared TypeScript Interfaces (@queueless/types)
└── server/                 # Python FastAPI Backend
    ├── app/
    │   ├── api/            # REST Endpoints (v1) & WebSockets
    │   ├── core/           # Config, Database (Motor Async), Exceptions
    │   ├── models/         # Pydantic V2 Models (Business, Queue, Service)
    │   ├── schemas/        # Request/Response Schemas
    │   ├── services/       # Core Queue Engine (Atomic $inc logic)
    │   └── main.py         # FastAPI Entrypoint
    └── tests/              # Pytest Suite (Concurrency, Race Condition, Snapshot tests)
```

---

## ⚡ Sprint 1 Deliverables (Completed & Verified)

1. **Monorepo Architecture:** Root npm workspaces + `@queueless/types` package + backend server.
2. **FastAPI & Motor MongoDB:** Async connection lifecycle with automatic 2dsphere and compound index setup.
3. **Pydantic V2 Data Models:** Strict validation for Indian 10-digit mobile numbers (`/^[6-9]\d{9}$/`), businesses, services, counters, queues, and queue entries.
4. **Core Queue Engine (`QueueEngine`):**
   - **Zero-Friction Token Generation:** 100% OTP-free (Name + 10-digit mobile).
   - **Atomic Token Increment:** Concurrency-safe MongoDB `$inc` via `find_one_and_update(..., return_document=ReturnDocument.AFTER)`.
   - **Frozen Service Price Snapshot:** Price snapshot preserved at booking time regardless of subsequent owner price changes.
   - **Dual-Role Secure Cancellation:** OTP-free customer session verification or authenticated business owner.
   - **Queue Lifecycle:** `call_next`, `complete_token`, `skip_token`, `cancel_token`, `get_live_queue_state`.

---

## 🧪 Testing & Verification

Run backend tests using `uv`:
```bash
cd server
uv run pytest -v
```
All 12 test suites pass with 100% coverage across concurrency, frozen snapshots, validation, and REST APIs.
