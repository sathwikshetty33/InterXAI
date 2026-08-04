"""InterXAI MCP server, mounted into the FastAPI app.

Exposes backend capabilities as MCP tools over Streamable HTTP at ``/mcp`` on
the same server (and port) as the REST API — not a separate service. Tools
authenticate per request by reading the bearer token from their ``Context`` and
verifying it with the API's own auth (see :mod:`app.mcp.auth`); the API stays
the token issuer. Add tools by writing a ``register(mcp)`` in ``app/mcp/tools/``.
"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from mcp.server.fastmcp import FastMCP
from starlette.requests import Request
from starlette.responses import JSONResponse

import app.models  # noqa: F401  # register every SQLAlchemy mapper up front
from app.mcp.auth import (
    PROTECTED_RESOURCE_PATH,
    BearerAuthMiddleware,
    protected_resource_metadata,
)
from app.mcp.tools import application, interview

MCP_MOUNT_PATH = "/mcp"

# stateless_http: no server-side session state — each HTTP request is
# independent, the simplest fit for a remote, multi-client mount. Path "/" so
# the endpoint is exactly MCP_MOUNT_PATH once mounted.
mcp = FastMCP("interxai", stateless_http=True, streamable_http_path="/")
interview.register(mcp)
application.register(mcp)

# Built once so the mount and the lifespan reference the same instance, and
# bearer-gated at the transport layer.
mcp_app = mcp.streamable_http_app()
mcp_app.add_middleware(BearerAuthMiddleware)


def mount_mcp(app: FastAPI) -> None:
    """Mount the MCP endpoint and its discovery metadata onto an existing FastAPI
    app. Pair with :func:`mcp_lifespan` in the app's lifespan so the session
    manager runs.
    """
    app.mount(MCP_MOUNT_PATH, mcp_app)

    @app.get(PROTECTED_RESOURCE_PATH, include_in_schema=False)
    async def oauth_protected_resource(request: Request) -> JSONResponse:
        origin = f"{request.url.scheme}://{request.url.netloc}"
        return JSONResponse(protected_resource_metadata(f"{origin}{MCP_MOUNT_PATH}", origin))


@asynccontextmanager
async def mcp_lifespan(_: FastAPI) -> AsyncIterator[None]:
    """The mounted MCP app's own lifespan — it starts/stops the Streamable-HTTP
    session manager. Compose it into the FastAPI app's lifespan."""
    async with mcp_app.router.lifespan_context(mcp_app):
        yield
