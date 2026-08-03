"""JWT auth for the mounted MCP endpoint.

The MCP server is mounted on the FastAPI app and reachable over HTTP, so it is
protected like GitHub's remote MCP server — a bearer-token *resource server*.
Two small pieces, and (deliberately) no context var:

* :class:`BearerAuthMiddleware` gates the endpoint — any request without a valid
  InterXAI JWT gets a 401 with a ``WWW-Authenticate`` discovery hint.
* :func:`resolve_org` turns the request's token into its organization, reading
  the token straight off FastMCP's ``Context`` and reusing the REST API's auth.

The API stays the token issuer; both paths reuse ``JwtAuth`` /
``get_current_user`` / ``is_organization``.
"""

from typing import Any

from mcp.server.fastmcp import Context
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send

from app.database import AsyncSessionLocal
from app.models.organization import Organization
from app.utils.authorization import get_current_user, is_organization
from app.utils.jwt_auth import JwtAuth

PROTECTED_RESOURCE_PATH = "/.well-known/oauth-protected-resource"

# FastMCP injects the request context into tools; the concrete type args aren't
# relevant to us, so pin them to Any once for mypy.
ToolContext = Context[Any, Any, Any]


def protected_resource_metadata(resource_url: str, auth_server_url: str) -> dict[str, object]:
    """RFC 9728 metadata advertising which issuer's tokens this resource accepts."""
    return {
        "resource": resource_url,
        "authorization_servers": [auth_server_url],
        "bearer_methods_supported": ["header"],
    }


def _bearer(header: str) -> str | None:
    """Pull the token out of an ``Authorization: Bearer <token>`` header."""
    scheme, _, value = header.partition(" ")
    token = value.strip()
    return token if scheme.lower() == "bearer" and token else None


async def resolve_org(ctx: ToolContext, session: AsyncSession) -> Organization:
    """Resolve the calling organization from the request's bearer token (read off
    the tool's Context), reusing the REST API's auth. Raises if it is missing."""
    request = ctx.request_context.request
    token = _bearer(request.headers.get("authorization", "")) if request else None
    if token is None:
        raise ValueError("Authorization: Bearer <InterXAI token> is required")
    user = await get_current_user(token=token, db=session)
    return await is_organization(current_user=user, db=session)


async def _token_is_valid(token: str) -> bool:
    async with AsyncSessionLocal() as session:
        try:
            await JwtAuth(db_session=session).authorize(token)
        except Exception:
            return False
        return True


async def _challenge(request: Request, scope: Scope, receive: Receive, send: Send) -> None:
    origin = f"{request.url.scheme}://{request.url.netloc}"
    response = JSONResponse(
        {
            "error": "invalid_token",
            "error_description": "A valid bearer token is required",
        },
        status_code=401,
        headers={
            "WWW-Authenticate": (f'Bearer resource_metadata="{origin}{PROTECTED_RESOURCE_PATH}"')
        },
    )
    await response(scope, receive, send)


class BearerAuthMiddleware:
    """Reject any request to the MCP endpoint that lacks a valid InterXAI bearer
    token with a 401 + ``WWW-Authenticate``. Enforcement only — tools still
    resolve their organization from the request via :func:`resolve_org`."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        request = Request(scope)
        token = _bearer(request.headers.get("authorization", ""))
        if token is None or not await _token_is_valid(token):
            await _challenge(request, scope, receive, send)
            return
        await self.app(scope, receive, send)
