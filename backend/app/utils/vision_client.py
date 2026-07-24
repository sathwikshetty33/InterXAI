"""Client for the proctoring vision service (stateless face/hand/pose inference)."""

import httpx

from app.config import settings
from app.interfaces.vision import VisionError, VisionInterface, VisionResult
from app.logger import get_logger

logger = get_logger(__name__)


class VisionClient(VisionInterface):
    def __init__(self) -> None:
        self.base_url = settings.VISION_URL.rstrip("/")

    async def detect(self, frames: list[str]) -> VisionResult:
        headers: dict[str, str] = {}
        if settings.VISION_SHARED_SECRET:
            headers["X-Vision-Secret"] = settings.VISION_SHARED_SECRET
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/detect",
                    json={"frames": frames, "checks": ["face_count"]},
                    headers=headers,
                    timeout=settings.VISION_TIMEOUT_S,
                )
                response.raise_for_status()
        except httpx.HTTPError as e:
            raise VisionError(f"Vision service request failed: {e}") from e

        data = response.json()
        return VisionResult(
            face_count=int(data["face_count"]),
            per_frame=[int(n) for n in data.get("per_frame", [])],
        )


def get_vision_client() -> VisionInterface:
    return VisionClient()
