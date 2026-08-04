"""MCP tools for interview applications.

Thin wrappers over the ``/applications`` router. The calling organization is
resolved from the request's bearer token (:func:`app.mcp.auth.resolve_org`,
reusing ``is_organization``); the router handlers enforce interview ownership
and shape the response. No business logic is re-implemented here.
"""

from mcp.server.fastmcp import Context, FastMCP

from app.database import AsyncSessionLocal
from app.mcp.auth import resolve_org
from app.routers.application import (
    get_interview_applications,
    shortlist_application as shortlist_application_handler,
)
from app.schemas.application import ApplicationResponse


def register(mcp: FastMCP) -> None:
    @mcp.tool()
    async def get_applications(
        interview_id: int,
        ctx: Context,  # type: ignore[type-arg]  # FastMCP needs the bare class
    ) -> list[ApplicationResponse]:
        """List all applications for one of the caller's interviews.

        Requires a bearer token for an organization that owns ``interview_id``.
        Returns each applicant with their resume-screening decision and status.
        """
        async with AsyncSessionLocal() as session:
            org = await resolve_org(ctx, session)
            return await get_interview_applications(interview_id=interview_id, db=session, org=org)

    @mcp.tool()
    async def shortlist_application(
        application_id: int,
        ctx: Context,  # type: ignore[type-arg]  # FastMCP needs the bare class
    ) -> ApplicationResponse:
        """Approve/shortlist an application — toggles its shortlisting decision.

        Requires a bearer token for the organization that owns the interview the
        application belongs to. The decision flips on each call (call again to
        undo), matching the current backend behavior.
        """
        async with AsyncSessionLocal() as session:
            org = await resolve_org(ctx, session)
            return await shortlist_application_handler(
                application_id=application_id, db=session, org=org
            )
