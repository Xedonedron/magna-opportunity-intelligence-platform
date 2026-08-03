from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "MOIP - Magna Opportunity Intelligence Platform"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "postgresql://moip:moip_secret@localhost:5432/moip_db"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # JWT / Auth
    SECRET_KEY: str = "moip-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:3000/api/auth/callback"
    GOOGLE_WORKSPACE_DOMAIN: str = "smartnet.co.id"

    # Frontend URL
    FRONTEND_URL: str = "http://localhost:3000"

    # SMTP / Email
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "noreply@smartnet.co.id"

    # Google Calendar
    GOOGLE_CALENDAR_ENABLED: bool = False

    # LLM Provider Configuration
    LLM_PROVIDER: str = "openai"  # "openai" or "google"

    # Google AI Studio / Gemini & Gemma Settings
    GEMINI_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""
    GEMINI_MODEL: str = "gemma-4-26b-a4b-it"

    # OpenAI Compatible API (CosmosHub/DeepSeek)
    OPENAI_API_BASE: str = "https://api.cosmoshub.tech/v1"
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "glm-5"
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-ada-002"

    # Tavily (Web Search for KYC)
    TAVILY_API_KEY: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

    @property
    def active_gemini_api_key(self) -> str:
        return self.GEMINI_API_KEY or self.GOOGLE_API_KEY


@lru_cache()
def get_settings() -> Settings:
    return Settings()


# Global settings instance for easy import
settings = get_settings()
