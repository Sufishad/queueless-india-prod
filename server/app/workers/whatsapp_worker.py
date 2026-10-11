import httpx
import os
import logging

logger = logging.getLogger("uvicorn.error")

WHATSAPP_API_TOKEN = os.getenv("WHATSAPP_API_TOKEN", "demo_wa_token_12345")
WHATSAPP_PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "1029384756")
WHATSAPP_API_URL = f"https://graph.facebook.com/v19.0/{WHATSAPP_PHONE_NUMBER_ID}/messages"

async def send_whatsapp_template_message(to_mobile: str, template_name: str, language_code: str = "en", parameters: list = None) -> bool:
    """
    Send WhatsApp template message via Meta Cloud API.
    In demo/test mode if no real token is configured, logs the payload and returns True.
    """
    cleaned_mobile = to_mobile.strip().replace(" ", "").replace("-", "")
    if not cleaned_mobile.startswith("+"):
        if len(cleaned_mobile) == 10:
            cleaned_mobile = "+91" + cleaned_mobile
        else:
            cleaned_mobile = "+" + cleaned_mobile

    payload = {
        "messaging_product": "whatsapp",
        "to": cleaned_mobile,
        "type": "template",
        "template": {
            "name": template_name,
            "language": {"code": language_code},
        }
    }

    if parameters:
        payload["template"]["components"] = [
            {
                "type": "body",
                "parameters": [{"type": "text", "text": str(p)} for p in parameters]
            }
        ]

    headers = {
        "Authorization": f"Bearer {WHATSAPP_API_TOKEN}",
        "Content-Type": "application/json",
    }

    if WHATSAPP_API_TOKEN == "demo_wa_token_12345":
        logger.info(f"[WhatsApp Worker MOCK] Sending template '{template_name}' to {cleaned_mobile} with params {parameters}")
        return True

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(WHATSAPP_API_URL, json=payload, headers=headers)
            if resp.status_code in (200, 201):
                return True
            logger.error(f"WhatsApp API failed: {resp.status_code} - {resp.text}")
            return False
    except Exception as e:
        logger.error(f"WhatsApp API exception: {str(e)}")
        return False

async def notify_customer_turn_near(db, queue_item_id: str):
    """
    Triggered when customer turn is near (e.g. 2 tokens away).
    """
    from bson import ObjectId
    item = None
    if ObjectId.is_valid(queue_item_id):
        item = await db.queues.find_one({"_id": ObjectId(queue_item_id)})
        if not item:
            item = await db.queue_entries.find_one({"_id": ObjectId(queue_item_id)})
    if not item:
        item = await db.queues.find_one({"_id": queue_item_id}) or await db.queue_entries.find_one({"_id": queue_item_id})
    if not item:
        return False

    mobile = item.get("customer_mobile") or item.get("customerMobile")
    token_num = item.get("token_number") or item.get("tokenNumber")
    biz_id = item.get("business_id") or item.get("businessId")

    biz = None
    if ObjectId.is_valid(biz_id):
        biz = await db.businesses.find_one({"_id": ObjectId(biz_id)})
    if not biz and biz_id:
        biz = await db.businesses.find_one({"_id": biz_id}) or await db.businesses.find_one({"businessId": biz_id})
    biz_name = (biz.get("shop_name") or biz.get("name")) if biz else "QueueLess Business"

    return await send_whatsapp_template_message(
        to_mobile=mobile,
        template_name="queueless_turn_near",
        parameters=[str(token_num), biz_name]
    )

async def notify_token_called(db, queue_item_id: str, counter_name: str):
    """
    Triggered when owner calls next token.
    """
    from bson import ObjectId
    item = None
    if ObjectId.is_valid(queue_item_id):
        item = await db.queues.find_one({"_id": ObjectId(queue_item_id)})
        if not item:
            item = await db.queue_entries.find_one({"_id": ObjectId(queue_item_id)})
    if not item:
        item = await db.queues.find_one({"_id": queue_item_id}) or await db.queue_entries.find_one({"_id": queue_item_id})
    if not item:
        return False

    mobile = item.get("customer_mobile") or item.get("customerMobile")
    token_num = item.get("token_number") or item.get("tokenNumber")

    return await send_whatsapp_template_message(
        to_mobile=mobile,
        template_name="queueless_token_called",
        parameters=[str(token_num), counter_name]
    )
