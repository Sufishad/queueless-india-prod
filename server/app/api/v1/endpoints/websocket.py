import json
import uuid
import logging
from typing import Optional
from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_db
from app.core.websocket_manager import ws_manager, _send_safe_json
from app.services.queue_engine import QueueEngine

router = APIRouter()
logger = logging.getLogger(__name__)


@router.websocket("/ws/queue/{business_id}")
async def websocket_queue_endpoint(
    websocket: WebSocket,
    business_id: str,
    client_id: Optional[str] = Query(None),
    customer_id: Optional[str] = Query(None),
    token_number: Optional[int] = Query(None),
    client_type: str = Query("customer"),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    cid = client_id or str(uuid.uuid4())
    await ws_manager.connect(
        business_id=business_id,
        websocket=websocket,
        client_id=cid,
        customer_id=customer_id,
        token_number=token_number,
        client_type=client_type,
    )

    try:
        # Immediately send current queue state on connection
        initial_state = await QueueEngine.get_live_queue_state(db=db, business_id=business_id)
        await _send_safe_json(websocket, {
            "event": "QUEUE_STATE_CHANGED",
            "data": initial_state
        })

        # If a token_number was provided, also send initial token status
        if token_number is not None:
            entry = await db.queue_entries.find_one({
                "businessId": business_id,
                "tokenNumber": token_number
            })
            if entry:
                entry_id = str(entry["_id"])
                tok_status = await QueueEngine.get_customer_token_status(
                    db=db, business_id=business_id, entry_id=entry_id
                )
                await _send_safe_json(websocket, {
                    "event": "CUSTOMER_TOKEN_UPDATE",
                    "data": tok_status
                })

        # Keep connection open and listen for client events
        while True:
            text = await websocket.receive_text()
            try:
                msg = json.loads(text)
                action = msg.get("action")
                
                if action == "track_token":
                    new_token = msg.get("tokenNumber")
                    new_cust = msg.get("customerId")
                    ws_manager.update_connection_meta(
                        business_id=business_id,
                        websocket=websocket,
                        customer_id=new_cust,
                        token_number=new_token,
                    )
                    await websocket.send_json({
                        "event": "TRACKING_CONFIRMED",
                        "data": {"tokenNumber": new_token, "customerId": new_cust}
                    })

                elif action == "ping":
                    await websocket.send_json({"event": "pong", "data": {}})

                elif action == "get_state":
                    current_state = await QueueEngine.get_live_queue_state(db=db, business_id=business_id)
                    await websocket.send_json({
                        "event": "QUEUE_STATE_CHANGED",
                        "data": current_state
                    })

            except json.JSONDecodeError:
                await websocket.send_json({"event": "error", "message": "Invalid JSON format."})

    except WebSocketDisconnect:
        ws_manager.disconnect(business_id=business_id, websocket=websocket)
    except Exception as e:
        logger.error(f"WebSocket error for client {cid}: {e}", exc_info=True)
        ws_manager.disconnect(business_id=business_id, websocket=websocket)
