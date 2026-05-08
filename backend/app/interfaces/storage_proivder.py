from abc import ABC, abstractmethod


class StorageProviderInterface(ABC):
    @abstractmethod
    def upload(self, file: bytes, file_name: str) -> str:
        pass

    @abstractmethod
    def delete(self, file_name: str) -> None:
        pass

    @abstractmethod
    def download(self, file_name: str) -> bytes:
        pass
