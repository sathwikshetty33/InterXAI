from supabase import Client, create_client

from app.config import settings
from app.exceptions.storage import (
    StorageDeleteError,
    StorageDownloadError,
    StorageUploadError,
)
from app.interfaces.storage_proivder import StorageProviderInterface
from app.logger import get_logger

logger = get_logger(__name__)


class SupabaseStorageProvider(StorageProviderInterface):
    def __init__(
        self,
        supabase_url: str = settings.SUPABASE_URL,
        supabase_key: str = settings.SUPABASE_KEY,
        bucket_name: str = settings.SUPABASE_BUCKET_NAME,
    ):
        if not supabase_url or not supabase_key:
            logger.warning("Supabase URL or Key is not configured. Storage operations may fail.")
        self.client: Client = create_client(supabase_url, supabase_key)
        self.bucket_name = bucket_name

    def upload(self, file: bytes, file_name: str) -> str:
        try:
            _res = self.client.storage.from_(self.bucket_name).upload(
                path=file_name, file=file, file_options={"content-type": "application/pdf"}
            )
            return self.client.storage.from_(self.bucket_name).get_public_url(file_name)
        except Exception as e:
            logger.error("Supabase upload failed: %s", str(e), exc_info=True)
            raise StorageUploadError(f"Failed to upload file to storage: {str(e)}") from e

    def delete(self, file_name: str) -> None:
        try:
            self.client.storage.from_(self.bucket_name).remove([file_name])
        except Exception as e:
            logger.error("Supabase delete failed: %s", str(e), exc_info=True)
            raise StorageDeleteError(f"Failed to delete file from storage: {str(e)}") from e

    def download(self, file_name: str) -> bytes:
        try:
            res = self.client.storage.from_(self.bucket_name).download(file_name)
            return res
        except Exception as e:
            logger.error("Supabase download failed: %s", str(e), exc_info=True)
            raise StorageDownloadError(f"Failed to download file from storage: {str(e)}") from e
