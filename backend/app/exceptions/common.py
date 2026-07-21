from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class BadRequestError(Exception):
    def __init__(self, detail: str = "Bad Request"):
        self.detail = detail


class ForbiddenError(Exception):
    def __init__(self, detail: str = "Forbidden"):
        self.detail = detail


class NotFoundError(Exception):
    def __init__(self, detail: str = "Not Found"):
        self.detail = detail


def register_common_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        _request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        # A validator raising a plain ValueError leaves the exception object in
        # ctx["error"], which json.dumps can't serialize — run errors() through
        # jsonable_encoder so it stays a 422 instead of becoming a 500.
        return JSONResponse(
            status_code=422,
            content={"detail": jsonable_encoder(exc.errors())},
        )

    @app.exception_handler(BadRequestError)
    async def bad_request_exception_handler(
        _request: Request, exc: BadRequestError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=400,
            content={"detail": exc.detail},
        )

    @app.exception_handler(ForbiddenError)
    async def forbidden_exception_handler(_request: Request, exc: ForbiddenError) -> JSONResponse:
        return JSONResponse(
            status_code=403,
            content={"detail": exc.detail},
        )

    @app.exception_handler(NotFoundError)
    async def not_found_exception_handler(_request: Request, exc: NotFoundError) -> JSONResponse:
        return JSONResponse(
            status_code=404,
            content={"detail": exc.detail},
        )
