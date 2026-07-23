from abc import ABC, abstractmethod

from app.schemas import FaceBox


class FrameDecodeError(ValueError):
    """A submitted frame wasn't valid base64 image data."""


class FaceDetector(ABC):
    @abstractmethod
    def count_faces(self, frame_b64: str) -> tuple[int, list[FaceBox]]:
        pass
