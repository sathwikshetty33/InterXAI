from abc import ABC, abstractmethod

from pydantic import BaseModel


class VisionResult(BaseModel):
    # Max faces across the submitted frames.
    face_count: int
    per_frame: list[int]


class VisionError(Exception):
    """The vision service was unreachable or returned an error."""


class VisionInterface(ABC):
    @abstractmethod
    async def detect(self, frames: list[str]) -> VisionResult:
        pass
