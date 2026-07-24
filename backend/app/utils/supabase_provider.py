import asyncio
from collections.abc import Awaitable, Callable
from typing import TypeVar

import httpx
from storage3.exceptions import StorageApiError
from supabase import AsyncClient, create_async_client

from app.config import settings
from app.exceptions.storage import (
    StorageDeleteError,
    StorageDownloadError,
    StorageUploadError,
)
from app.interfaces.storage_proivder import StorageProviderInterface
from app.logger import get_logger

logger = get_logger(__name__)

T = TypeVar("T")

# Supabase (especially free-tier) intermittently returns transient failures:
# network timeouts/connection resets while the project wakes from idle, or 5xx
# responses such as 544 DatabaseTimeout. Retry these a few times with
# exponential backoff so a single blip doesn't fail an entire job.
_MAX_ATTEMPTS = 4
_BASE_DELAY_SECONDS = 0.5


def _is_transient(exc: Exception) -> bool:
    """True for errors worth retrying (transient network / 5xx server errors)."""
    if isinstance(exc, (httpx.TimeoutException, httpx.TransportError)):
        return True
    if isinstance(exc, StorageApiError):
        try:
            return int(exc.status) >= 500
        except (TypeError, ValueError):
            return False
    return False


class SupabaseStorageProvider(StorageProviderInterface):
    def __init__(
        self,
        supabase_url: str = settings.SUPABASE_URL,
        supabase_key: str = settings.SUPABASE_KEY,
        bucket_name: str = settings.SUPABASE_BUCKET_NAME,
    ):
        if not supabase_url or not supabase_key:
            logger.warning("Supabase URL or Key is not configured. Storage operations may fail.")
        self.supabase_url = supabase_url
        self.supabase_key = supabase_key
        self.bucket_name = bucket_name
        self._client: AsyncClient | None = None

    async def _get_client(self) -> AsyncClient:
        if self._client is None:
            self._client = await create_async_client(self.supabase_url, self.supabase_key)
        return self._client

    async def _with_retries(self, action: str, op: Callable[[], Awaitable[T]]) -> T:
        """Run a storage operation, retrying transient failures with backoff."""
        for attempt in range(1, _MAX_ATTEMPTS + 1):
            try:
                return await op()
            except Exception as e:
                if attempt < _MAX_ATTEMPTS and _is_transient(e):
                    delay = _BASE_DELAY_SECONDS * (2 ** (attempt - 1))
                    logger.warning(
                        "Supabase %s transient failure (attempt %d/%d): %s — retrying in %.1fs",
                        action,
                        attempt,
                        _MAX_ATTEMPTS,
                        e,
                        delay,
                    )
                    await asyncio.sleep(delay)
                    continue
                raise
        raise RuntimeError("unreachable")  # pragma: no cover

    async def upload(
        self, file: bytes, file_name: str, content_type: str = "application/pdf"
    ) -> str:
        try:
            client = await self._get_client()

            # upsert keeps a retry idempotent: if a prior attempt wrote the
            # object before failing, the retry overwrites instead of 409-ing.
            await self._with_retries(
                "upload",
                lambda: client.storage.from_(self.bucket_name).upload(
                    path=file_name,
                    file=file,
                    file_options={"content-type": content_type, "upsert": "true"},
                ),
            )
            return await client.storage.from_(self.bucket_name).get_public_url(file_name)
        except Exception as e:
            logger.error("Supabase upload failed: %s", str(e), exc_info=True)
            raise StorageUploadError(f"Failed to upload file to storage: {str(e)}") from e

    async def delete(self, file_name: str) -> None:
        try:
            client = await self._get_client()
            await self._with_retries(
                "delete",
                lambda: client.storage.from_(self.bucket_name).remove([file_name]),
            )
        except Exception as e:
            logger.error("Supabase delete failed: %s", str(e), exc_info=True)
            raise StorageDeleteError(f"Failed to delete file from storage: {str(e)}") from e

    async def download(self, file_name: str) -> bytes:
        try:
            client = await self._get_client()
            return await self._with_retries(
                "download",
                lambda: client.storage.from_(self.bucket_name).download(file_name),
            )
        except Exception as e:
            logger.error("Supabase download failed: %s", str(e), exc_info=True)
            raise StorageDownloadError(f"Failed to download file from storage: {str(e)}") from e
