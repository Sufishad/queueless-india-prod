from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "QueueLess India"
    ENV: str = "development"
    API_V1_STR: str = "/api/v1"
    
    # MongoDB
    MONGODB_URI: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "queueless_india"
    
    # Security
    SECRET_KEY: str = "queueless-india-super-secret-key-change-in-prod"
    
    # CORS
    CORS_ORIGINS: List[str] = ["*"]

    # Timezone
    TIMEZONE: str = "Asia/Kolkata"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()
