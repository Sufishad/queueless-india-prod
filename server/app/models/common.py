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


class UpperStr(str):
    def __eq__(self, other):
        if isinstance(other, str):
            return self.upper() == other.upper()
        return super().__eq__(other)

    def __hash__(self):
        return hash(self.upper())


class CaseInsensitiveEnum(UpperStr, Enum):
    @classmethod
    def _missing_(cls, value: object):
        if isinstance(value, str):
            for member in cls:
                if member.value.upper() == value.upper():
                    return member
        return None


class QueueStatus(CaseInsensitiveEnum):
    ACTIVE = "ACTIVE"
    PAUSED = "PAUSED"


class BusinessStatus(CaseInsensitiveEnum):
    OPEN = "OPEN"
    CLOSED = "CLOSED"


class BusinessPlan(CaseInsensitiveEnum):
    FREE = "free"
    STARTER = "starter"
    PRO = "pro"
    ENTERPRISE = "enterprise"


class QueueEntryStatus(CaseInsensitiveEnum):
    WAITING = "WAITING"
    SERVING = "SERVING"
    COMPLETED = "COMPLETED"
    SKIPPED = "SKIPPED"
    CANCELLED = "CANCELLED"


class PaymentStatus(CaseInsensitiveEnum):
    UNPAID = "UNPAID"
    PAID = "PAID"
