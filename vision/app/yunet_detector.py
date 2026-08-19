import threading

import cv2
import numpy as np

from app.config import settings
from app.frames import decode_frame
from app.interfaces.detector_interface import FaceDetector
from app.model_assets import ensure_model
from app.schemas import FaceBox


class YuNetFaceDetector(FaceDetector):
    """OpenCV YuNet (libfacedetection), the default server-side detector.
    """

    def __init__(self) -> None:
        path = ensure_model(settings.yunet_model_path, settings.yunet_model_url)
        self._detector = cv2.FaceDetectorYN.create(
            path,
            "",
            (320, 240),  
            settings.min_detection_confidence,
            settings.yunet_nms_threshold,
            settings.yunet_top_k,
        )

        self._lock = threading.Lock()

    def count_faces(self, frame_b64: str) -> tuple[int, list[FaceBox]]:
        rgb = decode_frame(frame_b64)
        bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
        height, width = bgr.shape[:2]
        with self._lock:
            self._detector.setInputSize((width, height))
            _, detections = self._detector.detect(bgr)
        if detections is None:
            return 0, []
        boxes = [self._to_box(row) for row in detections]
        return len(boxes), boxes

    @staticmethod
    def _to_box(row: np.ndarray) -> FaceBox:
        """One YuNet row: [x, y, w, h, 5 landmark xy pairs, score]."""
        x, y, width, height = (int(v) for v in row[:4])
        # Edge faces can come back with a slightly negative origin.
        return FaceBox(
            confidence=float(row[-1]),
            x=max(0, x),
            y=max(0, y),
            width=max(0, width),
            height=max(0, height),
        )
