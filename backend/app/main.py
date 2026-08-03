from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.error_handler import ErrorHandlerMiddleware
from app.api.auth import router as auth_router
from app.api.users import router as users_router
from app.api.opportunities import router as opportunities_router
from app.api.meetings import router as meetings_router
from app.api.notifications import router as notifications_router
from app.api.kyc import router as kyc_router
from app.api.dashboard import router as dashboard_router
from app.api.admin import router as admin_router
from app.api.linkedin import router as linkedin_router

settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Magna Opportunity Intelligence Platform - Internal API",
)

# CORS
origins = [
    settings.FRONTEND_URL.rstrip("/"),
    "https://moip.cloudwithmagna.com",
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3009",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Error Handler
app.add_middleware(ErrorHandlerMiddleware)

# Routers
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(opportunities_router)
app.include_router(meetings_router)
app.include_router(notifications_router)
app.include_router(kyc_router)
app.include_router(dashboard_router)
app.include_router(admin_router)
app.include_router(linkedin_router)


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "version": settings.APP_VERSION}


@app.get("/api/config")
async def get_public_config():
    return {
        "status": "ok",
        "google_client_id": getattr(settings, "GOOGLE_CLIENT_ID", None)
    }