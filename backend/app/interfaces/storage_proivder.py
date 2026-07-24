from abc import ABC, abstractmethod


class StorageProviderInterface(ABC):
    @abstractmethod
    async def upload(
        self, file: bytes, file_name: str, content_type: str = "application/pdf"
    ) -> str:
        pass

    @abstractmethod
    async def delete(self, file_name: str) -> None:
        pass

    @abstractmethod
    async def download(self, file_name: str) -> bytes:
        pass
