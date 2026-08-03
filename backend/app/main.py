from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.config import settings
from app.exceptions.auth import register_auth_exception_handlers
from app.exceptions.common import register_common_exception_handlers
from app.exceptions.sql_alchemy import register_sql_alchemy_exception_handlers
from app.logger import get_logger
from app.mcp.server import mcp_lifespan, mount_mcp
from app.models.application import Application, InterviewSession
from app.models.interaction import (
    DsaInteraction,
    FollowUpQuestion,
    Interaction,
    ResumeConversation,
    ResumeQuestion,
)
from app.models.interview import CustomInterview, CustomQuestion, DsaTopic
from app.models.organization import Organization
from app.models.user import User, UserProfile
from app.routers.application import router as application_router
from app.routers.interview import router as interview_router
from app.routers.leaderboard import router as leaderboard_router
from app.routers.organization import router as organization_router
from app.routers.session import router as session_router
from app.routers.user import router as user_router
from app.utils.default_providers import default_worker_provider
from app.utils.lifespan import combine_lifespans

logger = get_logger(__name__)


@asynccontextmanager
async def worker_lifespan(_: FastAPI) -> AsyncGenerator[None, None]:
    await default_worker_provider().startup()
    yield
    await default_worker_provider().shutdown()


# Compose the worker lifespan with the mounted MCP app's own lifespan instead of
# reaching into its session manager.
app = FastAPI(
    title=settings.APP_NAME,
    debug=settings.DEBUG,
    lifespan=combine_lifespans(worker_lifespan, mcp_lifespan),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Required by Authlib to persist the OAuth state/nonce across the OIDC redirect.
app.add_middleware(SessionMiddleware, secret_key=settings.SECRET_KEY)
register_auth_exception_handlers(app)
register_common_exception_handlers(app)
register_sql_alchemy_exception_handlers(app)

app.include_router(user_router)
app.include_router(organization_router)
app.include_router(interview_router)
app.include_router(application_router)
app.include_router(session_router)
app.include_router(leaderboard_router)

# Mount the MCP server onto this same app/port (see app.mcp.server).
mount_mcp(app)

logger.info("Application initialized: %s", settings.APP_NAME)


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "healthy", "app": settings.APP_NAME, "version": "0.1.0"}
