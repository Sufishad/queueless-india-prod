import re
from enum import Enum
from typing import Annotated, Any, List, Tuple
from bson import ObjectId
from pydantic import BaseModel, Field, GetCoreSchemaHandler
from pydantic_core import core_schema


class PyObjectId(str):
    @classmethod
    def __get_pydantic_core_schema__(
        cls, _source_type: Any, _handler: GetCoreSchemaHandler
    ) -> core_schema.CoreSchema:
        return core_schema.json_or_python_schema(
            json_schema=core_schema.str_schema(),
            python_schema=core_schema.union_schema([
                core_schema.is_instance_schema(ObjectId),
                core_schema.str_schema(),
            ]),
            serialization=core_schema.plain_serializer_function_ser_schema(
                lambda x: str(x)
            ),
        )


INDIAN_MOBILE_REGEX = re.compile(r"^[6-9]\d{9}$")


def validate_indian_mobile(v: str) -> str:
    cleaned = v.strip().replace(" ", "").replace("-", "")
    if cleaned.startswith("+91"):
        cleaned = cleaned[3:]
    elif cleaned.startswith("0") and len(cleaned) == 11:
        cleaned = cleaned[1:]
    if not INDIAN_MOBILE_REGEX.match(cleaned):
        raise ValueError("Invalid Indian mobile number. Must be a 10-digit number starting with 6-9.")
    return cleaned


IndianMobileNumber = Annotated[str, Field(pattern=r"^[6-9]\d{9}$")]


class GeoPoint(BaseModel):
    type: str = "Point"
    coordinates: List[float] = Field(..., min_length=2, max_length=2)  # [longitude, latitude]


class QueueStatus(str, Enum):
    ACTIVE = "active"
    PAUSED = "paused"


class BusinessStatus(str, Enum):
    OPEN = "open"
    CLOSED = "closed"


class BusinessPlan(str, Enum):
    FREE = "free"
    STARTER = "starter"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class QueueEntryStatus(str, Enum):
    WAITING = "waiting"
    SERVING = "serving"
    COMPLETED = "completed"
    SKIPPED = "skipped"
    CANCELLED = "cancelled"


class PaymentStatus(str, Enum):
    UNPAID = "unpaid"
    PAID = "paid"
