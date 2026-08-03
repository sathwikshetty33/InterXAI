"""MCP tool: create an interview.

Wraps the existing ``POST /interviews/`` handler. The calling organization is
resolved from the request's bearer token by :func:`app.mcp.auth.resolve_org`
(which reuses ``get_current_user`` / ``is_organization``), then the router's
``create_interview`` coroutine does the rest. Validation (including the dsa/dev
split summing to 100), the nested question/topic inserts, and the response shape
all come from the shared schema and handler — nothing is re-implemented here.
"""

from mcp.server.fastmcp import Context, FastMCP

from app.database import AsyncSessionLocal
from app.mcp.auth import resolve_org
from app.routers.interview import create_interview as create_interview_handler
from app.schemas.interview import CustomInterviewCreate, CustomInterviewResponse


def register(mcp: FastMCP) -> None:
    @mcp.tool()
    async def create_interview(
        interview: CustomInterviewCreate,
        # Bare (unparametrized) Context is required — FastMCP only injects it
        # when it can `issubclass(annotation, Context)`, so it cannot be pinned.
        ctx: Context,  # type: ignore[type-arg]
    ) -> CustomInterviewResponse:
        """Create an interview for the authenticated organization.

        Auth is per-request (``Authorization: Bearer <InterXAI token>``); the
        tool takes no token. ``interview`` is the full definition — custom
        questions, DSA topics, timings, and the dsa/dev score split (which must
        sum to 100). Returns the created interview with its generated ids.
        """
        async with AsyncSessionLocal() as session:
            org = await resolve_org(ctx, session)
            return await create_interview_handler(data=interview, db=session, org=org)
