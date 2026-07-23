from fastapi import status


class UnsuportedProviderError(Exception):
    def __init__(
        self, detail: str, status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR
    ) -> None:
        self.detail = detail
        self.status_code = status_code
        super().__init__(self.detail)
