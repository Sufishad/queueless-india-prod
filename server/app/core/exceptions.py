from fastapi import HTTPException, status


class QueueLessException(HTTPException):
    def __init__(self, status_code: int, detail: str, detail_hi: str = ""):
        super().__init__(status_code=status_code, detail={"en": detail, "hi": detail_hi or detail})


class BusinessNotFoundException(QueueLessException):
    def __init__(self, business_id: str):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Business '{business_id}' not found.",
            detail_hi="दुकान/प्रतिष्ठान नहीं मिला।"
        )


class QueuePausedException(QueueLessException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Queue is currently paused by the business.",
            detail_hi="कतार वर्तमान में रोकी गई है।"
        )


class QueueClosedException(QueueLessException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Business is currently closed.",
            detail_hi="प्रतिष्ठान अभी बंद है।"
        )


class TokenNotFoundException(QueueLessException):
    def __init__(self, entry_id: str):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Token entry '{entry_id}' not found.",
            detail_hi="टोकन नहीं मिला।"
        )


class UnauthorizedCancellationException(QueueLessException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to cancel this token.",
            detail_hi="आप इस टोकन को रद्द करने के लिए अधिकृत नहीं हैं।"
        )
