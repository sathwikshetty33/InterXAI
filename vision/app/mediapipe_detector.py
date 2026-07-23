import base64
import binascii
import io
import threading

import mediapipe as mp
import numpy as np
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision as mp_vision
from PIL import Image, UnidentifiedImageError

from app.config import settings
from app.interfaces.detector_interface import FaceDetector, FrameDecodeError
from app.model_assets import ensure_model
from app.schemas import FaceBox


class MediaPipeFaceDetector(FaceDetector):
    def __init__(self) -> None:
        ensure_model(settings.model_path, settings.model_url)
        options = mp_vision.FaceDetectorOptions(
            base_options=mp_python.BaseOptions(model_asset_path=settings.model_path),
            running_mode=mp_vision.RunningMode.IMAGE,
            min_detection_confidence=settings.min_detection_confidence,
        )
        self._detector = mp_vision.FaceDetector.create_from_options(options)
        # MediaPipe detectors aren't thread-safe; serialize detect().
        self._lock = threading.Lock()

    def _decode(self, frame_b64: str) -> np.ndarray:
        payload = frame_b64.split(",", 1)[-1] if frame_b64.startswith("data:") else frame_b64
        try:
            raw = base64.b64decode(payload)
            image = Image.open(io.BytesIO(raw)).convert("RGB")
        except (binascii.Error, ValueError, UnidentifiedImageError) as exc:
            raise FrameDecodeError(str(exc)) from exc
        return np.asarray(image)

    def count_faces(self, frame_b64: str) -> tuple[int, list[FaceBox]]:
        rgb = self._decode(frame_b64)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        with self._lock:
            result = self._detector.detect(mp_image)
        boxes = [
            FaceBox(
                confidence=float(det.categories[0].score if det.categories else 0.0),
                x=int(det.bounding_box.origin_x),
                y=int(det.bounding_box.origin_y),
                width=int(det.bounding_box.width),
                height=int(det.bounding_box.height),
            )
            for det in result.detections
        ]
        return len(boxes), boxes
