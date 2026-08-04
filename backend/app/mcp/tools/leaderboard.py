"""MCP tool: interview leaderboard.

Thin wrapper over ``GET /leaderboard/{interview_id}``. The calling organization
is resolved from the request's bearer token (:func:`app.mcp.auth.resolve_org`);
the router handler enforces ownership and builds the ranked record. No business
logic is re-implemented here.
"""

from mcp.server.fastmcp import Context, FastMCP

from app.database import AsyncSessionLocal
from app.mcp.auth import resolve_org
from app.routers.leaderboard import get_interview_leaderboard
from app.schemas.leaderboard import InterviewLeaderboardResponse


def register(mcp: FastMCP) -> None:
    @mcp.tool()
    async def get_leaderboard(
        interview_id: int,
        ctx: Context,  # type: ignore[type-arg]  # FastMCP needs the bare class
    ) -> InterviewLeaderboardResponse:
        """The full ranked leaderboard for one of the caller's interviews.

        Requires a bearer token for an organization that owns ``interview_id``.
        Returns every candidate ranked by score, with per-round scores and
        feedback across the questions, DSA, and resume rounds.
        """
        async with AsyncSessionLocal() as session:
            org = await resolve_org(ctx, session)
            return await get_interview_leaderboard(interview_id=interview_id, db=session, org=org)
