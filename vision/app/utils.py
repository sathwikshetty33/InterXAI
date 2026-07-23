from app.config import settings
from app.exceptions import UnsuportedProviderError
from app.interfaces.detector_interface import FaceDetector
from app.mediapipe_detector import MediaPipeFaceDetector


def get_detector() -> FaceDetector:
    if (detector := settings.detector) == "Media Pipe":
        return MediaPipeFaceDetector()
    else:
        raise UnsuportedProviderError(f"{detector} not supported")
