import threading

import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision as mp_vision

from app.config import settings
from app.frames import decode_frame
from app.interfaces.detector_interface import FaceDetector
from app.model_assets import ensure_model
from app.schemas import FaceBox


class MediaPipeFaceDetector(FaceDetector):


    def __init__(self) -> None:
        path = ensure_model(settings.blaze_model_path, settings.blaze_model_url)
        options = mp_vision.FaceDetectorOptions(
            base_options=mp_python.BaseOptions(model_asset_path=path),
            running_mode=mp_vision.RunningMode.IMAGE,
            min_detection_confidence=settings.min_detection_confidence,
        )
        self._detector = mp_vision.FaceDetector.create_from_options(options)
        # MediaPipe detectors aren't thread-safe; serialize detect().
        self._lock = threading.Lock()

    def count_faces(self, frame_b64: str) -> tuple[int, list[FaceBox]]:
        rgb = decode_frame(frame_b64)
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
