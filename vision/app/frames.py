"""Frame decoding shared by every detector implementation."""

import base64
import binascii
import io

import numpy as np
from PIL import Image, UnidentifiedImageError

from app.interfaces.detector_interface import FrameDecodeError


def decode_frame(frame_b64: str) -> np.ndarray:
    """Decode one base64 frame (data-URL prefix tolerated) to an RGB array.

    Pillow rather than cv2.imdecode so both detectors share one decode path and
    one error contract, and so the MediaPipe build keeps sidestepping the
    opencv-headless vs mediapipe-bundled-opencv conflict.
    """
    payload = frame_b64.split(",", 1)[-1] if frame_b64.startswith("data:") else frame_b64
    try:
        raw = base64.b64decode(payload)
        image = Image.open(io.BytesIO(raw)).convert("RGB")
    except (binascii.Error, ValueError, UnidentifiedImageError) as exc:
        raise FrameDecodeError(str(exc)) from exc
    return np.asarray(image)
