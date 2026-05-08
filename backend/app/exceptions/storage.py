class StorageError(Exception):
    def __init__(self, detail: str = "An error occurred during storage operation"):
        self.detail = detail
        super().__init__(self.detail)


class StorageUploadError(StorageError):
    def __init__(self, detail: str = "Failed to upload file to storage"):
        super().__init__(detail)


class StorageDeleteError(StorageError):
    def __init__(self, detail: str = "Failed to delete file from storage"):
        super().__init__(detail)


class StorageDownloadError(StorageError):
    def __init__(self, detail: str = "Failed to download file from storage"):
        super().__init__(detail)
