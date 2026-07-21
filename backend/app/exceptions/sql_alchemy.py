from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from app.logger import get_logger

logger = get_logger(__name__)


def register_sql_alchemy_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(SQLAlchemyError)
    async def sqlalchemy_error_handler(request: Request, exc: SQLAlchemyError) -> JSONResponse:
        # FastAPI's exception-handler machinery intercepts this before uvicorn's
        # default unhandled-exception logging runs, so without this call a 500
        # here leaves NO trace anywhere — not even a traceback in the logs.
        logger.error(
            "Unhandled SQLAlchemyError on %s %s: %s",
            request.method,
            request.url.path,
            exc,
            exc_info=exc,
        )
        return JSONResponse(
            status_code=500,
            content={"detail": "Database error occurred. Please try again."},
        )
