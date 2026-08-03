"""Compose several ASGI lifespans into one.

FastAPI takes a single ``lifespan``; when an app needs more than one (its own
startup plus, say, a mounted sub-app's), nest them with an ``AsyncExitStack`` so
each is entered on startup and exited in reverse on shutdown.
"""

from collections.abc import AsyncIterator, Callable
from contextlib import AbstractAsyncContextManager, AsyncExitStack, asynccontextmanager

from fastapi import FastAPI

Lifespan = Callable[[FastAPI], AbstractAsyncContextManager[None]]


def combine_lifespans(*lifespans: Lifespan) -> Lifespan:
    """Return one lifespan that runs all the given lifespans together."""

    @asynccontextmanager
    async def combined(app: FastAPI) -> AsyncIterator[None]:
        async with AsyncExitStack() as stack:
            for lifespan in lifespans:
                await stack.enter_async_context(lifespan(app))
            yield

    return combined
