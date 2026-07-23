import asyncio
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Header, HTTPException, status

from app.config import settings
from app.interfaces.detector_interface import FaceDetector, FrameDecodeError
from app.schemas import DetectRequest, DetectResponse, FaceBox
from app.utils import get_detector

_detector: FaceDetector | None = None


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    global _detector
    _detector = get_detector()
    yield
    _detector = None


app = FastAPI(title="InterXAI Vision", lifespan=lifespan)


async def require_secret(x_vision_secret: str | None = Header(default=None)) -> None:
    if settings.shared_secret and x_vision_secret != settings.shared_secret:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid vision secret")


@app.get("/health")
async def health() -> dict[str, bool]:
    return {"ok": _detector is not None}


@app.post("/detect", response_model=DetectResponse, dependencies=[Depends(require_secret)])
async def detect(req: DetectRequest) -> DetectResponse:
    detector = _detector
    if detector is None:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Detector not ready")

    def run() -> tuple[list[int], list[FaceBox]]:
        counts: list[int] = []
        best: list[FaceBox] = []
        for frame in req.frames:
            n, boxes = detector.count_faces(frame)
            counts.append(n)
            if n >= len(best):
                best = boxes
        return counts, best

    try:
        per_frame, faces = await asyncio.to_thread(run)
    except FrameDecodeError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Bad frame: {exc}") from exc

    return DetectResponse(
        face_count=max(per_frame) if per_frame else 0,
        per_frame=per_frame,
        faces=faces,
    )
