import json
import logging
from typing import Any, Dict, List, Optional
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionItem:
    def __init__(
        self,
        websocket: WebSocket,
        client_id: str,
        customer_id: Optional[str] = None,
        token_number: Optional[int] = None,
        client_type: str = "customer",
    ):
        self.websocket = websocket
        self.client_id = client_id
        self.customer_id = customer_id
        self.token_number = token_number
        self.client_type = client_type


async def _send_safe_json(websocket: WebSocket, payload: Dict[str, Any]):
    text = json.dumps(payload, default=str)
    await websocket.send_text(text)


class WebSocketManager:
    def __init__(self):
        # business_id -> list of ConnectionItem
        self._rooms: Dict[str, List[ConnectionItem]] = {}

    async def connect(
        self,
        business_id: str,
        websocket: WebSocket,
        client_id: str,
        customer_id: Optional[str] = None,
        token_number: Optional[int] = None,
        client_type: str = "customer",
    ):
        await websocket.accept()
        if business_id not in self._rooms:
            self._rooms[business_id] = []
        
        item = ConnectionItem(
            websocket=websocket,
            client_id=client_id,
            customer_id=customer_id,
            token_number=token_number,
            client_type=client_type,
        )
        self._rooms[business_id].append(item)
        logger.info(
            f"WebSocket connected: client={client_id}, type={client_type}, business={business_id}. "
            f"Total room clients: {len(self._rooms[business_id])}"
        )

    def update_connection_meta(
        self,
        business_id: str,
        websocket: WebSocket,
        customer_id: Optional[str] = None,
        token_number: Optional[int] = None,
    ):
        if business_id in self._rooms:
            for item in self._rooms[business_id]:
                if item.websocket == websocket:
                    if customer_id is not None:
                        item.customer_id = customer_id
                    if token_number is not None:
                        item.token_number = token_number
                    break

    def disconnect(self, business_id: str, websocket: WebSocket):
        if business_id in self._rooms:
            self._rooms[business_id] = [
                item for item in self._rooms[business_id] if item.websocket != websocket
            ]
            logger.info(
                f"WebSocket disconnected from business {business_id}. Remaining: {len(self._rooms[business_id])}"
            )
            if not self._rooms[business_id]:
                del self._rooms[business_id]

    async def broadcast_to_business(self, business_id: str, event: str, data: Dict[str, Any]):
        """Broadcasts event payload to all clients connected in the business room."""
        if business_id not in self._rooms:
            return

        payload = {"event": event, "data": data}
        dead_connections = []

        for item in list(self._rooms[business_id]):
            try:
                await _send_safe_json(item.websocket, payload)
            except Exception as e:
                logger.warning(f"Error sending to client {item.client_id}: {e}")
                dead_connections.append(item.websocket)

        for dead_ws in dead_connections:
            self.disconnect(business_id, dead_ws)

    async def send_to_customer(
        self,
        business_id: str,
        customer_id: str,
        event: str,
        data: Dict[str, Any]
    ):
        """Sends targeted event to a specific customer's active WebSocket connection."""
        if business_id not in self._rooms:
            return

        payload = {"event": event, "data": data}
        for item in list(self._rooms[business_id]):
            if item.customer_id == customer_id:
                try:
                    await _send_safe_json(item.websocket, payload)
                except Exception as e:
                    logger.warning(f"Error sending targeted event to customer {customer_id}: {e}")

    async def send_to_token(
        self,
        business_id: str,
        token_number: int,
        event: str,
        data: Dict[str, Any]
    ):
        """Sends targeted event to any client tracking the specific token number."""
        if business_id not in self._rooms:
            return

        payload = {"event": event, "data": data}
        for item in list(self._rooms[business_id]):
            if item.token_number == token_number:
                try:
                    await _send_safe_json(item.websocket, payload)
                except Exception as e:
                    logger.warning(f"Error sending targeted event to token #{token_number}: {e}")

    async def notify_queue_state_changed(self, db, business_id: str):
        """
        1. Emits QUEUE_STATE_CHANGED to all business room subscribers.
        2. Detects customers with <= 2 people ahead and emits CUSTOMER_TURN_NEAR to them.
        """
        from app.services.queue_engine import QueueEngine
        
        # 1. Fetch live queue snapshot
        state = await QueueEngine.get_live_queue_state(db=db, business_id=business_id)
        await self.broadcast_to_business(
            business_id=business_id,
            event="QUEUE_STATE_CHANGED",
            data=state
        )

        # 2. Check waiting customers to notify approaching turn
        waiting_cursor = db.queue_entries.find(
            {"businessId": business_id, "status": "waiting"}
        ).sort("tokenNumber", 1).limit(5)

        waiting_list = await waiting_cursor.to_list(length=5)
        for index, entry in enumerate(waiting_list):
            people_ahead = index
            if people_ahead <= 2:
                turn_near_data = {
                    "tokenNumber": entry.get("tokenNumber"),
                    "peopleAhead": people_ahead,
                    "estimatedWaitMin": people_ahead * 15,
                    "customerName": entry.get("customerName"),
                    "message_en": (
                        f"Your turn is approaching! Token #{entry.get('tokenNumber')} has only "
                        f"{people_ahead} person(s) ahead. Please be near the counter."
                    ),
                    "message_hi": (
                        f"आपका नंबर आने वाला है! टोकन #{entry.get('tokenNumber')} के आगे केवल "
                        f"{people_ahead} व्यक्ति हैं। कृपया काउंटर के पास रहें।"
                    )
                }

                # Emit to matching customer session or token
                cust_id = entry.get("customerId")
                tok_num = entry.get("tokenNumber")
                if cust_id:
                    await self.send_to_customer(business_id, cust_id, "CUSTOMER_TURN_NEAR", turn_near_data)
                if tok_num:
                    await self.send_to_token(business_id, tok_num, "CUSTOMER_TURN_NEAR", turn_near_data)


ws_manager = WebSocketManager()
