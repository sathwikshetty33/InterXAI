from app.config import settings
from app.exceptions import UnsuportedProviderError
from app.interfaces.detector_interface import FaceDetector


def get_detector() -> FaceDetector:

    if (detector := settings.detector) == "YuNet":
        from app.yunet_detector import YuNetFaceDetector

        return YuNetFaceDetector()
    elif detector == "Media Pipe":
        from app.mediapipe_detector import MediaPipeFaceDetector

        return MediaPipeFaceDetector()
    else:
        raise UnsuportedProviderError(f"{detector} not supported")
